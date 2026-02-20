import type { ActivityRecord } from './types';
import { writable } from 'svelte/store';

const STORAGE_KEY = 'activity_records';
const LAST_ACTIVITY_KEY = 'last_activity_id';
const DEBUG = true; // Set to false to disable debug logging

function debugLog(message: string, data?: any) {
	if (DEBUG && typeof window !== 'undefined') {
		console.log(`[ActivityStorage] ${message}`, data || '');
	}
}

// Create a writable store for activities
function createActivityStore() {
	const { subscribe, set, update } = writable<ActivityRecord[]>([]);

	// Initialize from localStorage
	function initialize() {
		if (typeof window === 'undefined') return;

		const data = localStorage.getItem(STORAGE_KEY);
		if (!data) {
			debugLog('No activities found in localStorage');
			set([]);
			return;
		}

		try {
			const activities = JSON.parse(data);
			debugLog(`Initialized store with ${activities.length} activities`);
			set(activities);
		} catch (error) {
			console.error('[ActivityStorage] Error parsing activities from localStorage:', error);
			set([]);
		}
	}

	// Save to localStorage and update store
	function saveAndSet(activities: ActivityRecord[]) {
		if (typeof window === 'undefined') return;

		try {
			const jsonString = JSON.stringify(activities);
			localStorage.setItem(STORAGE_KEY, jsonString);
			set(activities);
			debugLog(`Saved and updated store with ${activities.length} activities`);
		} catch (error) {
			console.error('[ActivityStorage] Error saving activities:', error);
		}
	}

	return {
		subscribe,
		initialize,
		getAll: () => {
			let activities: ActivityRecord[] = [];
		 subscribe(a => activities = a)();
		 return activities;
		},
		add: (activity: Omit<ActivityRecord, 'id' | 'created_at' | 'updated_at'>) => {
			debugLog('Adding new activity via store', activity);

			update((activities) => {
				const newActivity: ActivityRecord = {
					...activity,
					id: crypto.randomUUID(),
					created_at: new Date().toISOString(),
					updated_at: new Date().toISOString()
				};

				const updated = [newActivity, ...activities];
				debugLog('New activity created', newActivity);

				// Save to localStorage
				if (typeof window !== 'undefined') {
					try {
						localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
						// Store last activity ID for pre-filling
						localStorage.setItem(LAST_ACTIVITY_KEY, activity.curriculum_activity_id);
						debugLog('Stored last activity ID', activity.curriculum_activity_id);
					} catch (error) {
						console.error('[ActivityStorage] Error saving activities:', error);
					}
				}

				return updated;
			});
		},
		delete: (id: string) => {
			debugLog('Deleting activity via store', { id });

			update((activities) => {
				const initialCount = activities.length;
				const filtered = activities.filter((a) => a.id !== id);

				if (filtered.length < initialCount) {
					// Save to localStorage
					if (typeof window !== 'undefined') {
						try {
							localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
							debugLog('Activity deleted successfully', { id, remaining: filtered.length });
						} catch (error) {
							console.error('[ActivityStorage] Error saving activities:', error);
						}
					}
					return filtered;
				} else {
					console.warn('[ActivityStorage] Activity not found for deletion', { id });
					return activities;
				}
			});
		},
		refresh: () => {
			debugLog('Refreshing activity store from localStorage');
			initialize();
		}
	};
}

// Export the store instance
export const activityStore = createActivityStore();

// Backward compatible functions that use the store
export function getActivities(): ActivityRecord[] {
	if (typeof window === 'undefined') return [];

	const data = localStorage.getItem(STORAGE_KEY);
	if (!data) {
		debugLog('No activities found in localStorage');
		return [];
	}

	try {
		const activities = JSON.parse(data);
		debugLog(`Retrieved ${activities.length} activities from localStorage`, activities);
		return activities;
	} catch (error) {
		console.error('[ActivityStorage] Error parsing activities from localStorage:', error);
		return [];
	}
}

export function saveActivities(activities: ActivityRecord[]): void {
	if (typeof window === 'undefined') return;

	try {
		const jsonString = JSON.stringify(activities);
		localStorage.setItem(STORAGE_KEY, jsonString);
		debugLog(`Saved ${activities.length} activities to localStorage`, activities);
	} catch (error) {
		console.error('[ActivityStorage] Error saving activities to localStorage:', error);
	}
}

export function addActivity(activity: Omit<ActivityRecord, 'id' | 'created_at' | 'updated_at'>): ActivityRecord {
	debugLog('Adding new activity', activity);

	const activities = getActivities();
	const newActivity: ActivityRecord = {
		...activity,
		id: crypto.randomUUID(),
		created_at: new Date().toISOString(),
		updated_at: new Date().toISOString()
	};

	activities.unshift(newActivity); // Add to beginning
	saveActivities(activities);

	// Store last activity ID for pre-filling
	localStorage.setItem(LAST_ACTIVITY_KEY, activity.curriculum_activity_id);
	debugLog('Stored last activity ID', activity.curriculum_activity_id);

	debugLog('New activity created', newActivity);

	return newActivity;
}

export function deleteActivity(id: string): void {
	debugLog('Deleting activity', { id });

	const activities = getActivities();
	const initialCount = activities.length;
	const filteredActivities = activities.filter((a) => a.id !== id);

	if (filteredActivities.length < initialCount) {
		saveActivities(filteredActivities);
		debugLog('Activity deleted successfully', { id, remaining: filteredActivities.length });
	} else {
		console.warn('[ActivityStorage] Activity not found for deletion', { id });
	}
}

export function getLastActivityId(): string | null {
	if (typeof window === 'undefined') return null;

	const lastId = localStorage.getItem(LAST_ACTIVITY_KEY);
	debugLog('Retrieved last activity ID', lastId);
	return lastId;
}

export function getActivityById(id: string): ActivityRecord | undefined {
	const activity = getActivities().find((a) => a.id === id);
	debugLog('Looking up activity by ID', { id, found: !!activity });
	return activity;
}

// Debug functions to expose to console for debugging
export function debugGetAllActivities() {
	const activities = getActivities();
	console.table(activities);
	return activities;
}

export function debugClearAllActivities() {
	if (confirm('Are you sure you want to delete all activities?')) {
		localStorage.removeItem(STORAGE_KEY);
		localStorage.removeItem(LAST_ACTIVITY_KEY);
		debugLog('All activities cleared');
		console.log('[ActivityStorage] All activities have been cleared');
	}
}

export function debugExportActivities() {
	const activities = getActivities();
	const jsonString = JSON.stringify(activities, null, 2);
	console.log('[ActivityStorage] All activities (JSON):');
	console.log(jsonString);
	return jsonString;
}

export function debugShowStorageInfo() {
	const data = localStorage.getItem(STORAGE_KEY);
	const info = {
		hasData: !!data,
		dataSize: data ? data.length : 0,
		activityCount: getActivities().length,
		lastActivityId: getLastActivityId(),
		rawData: data
	};
	console.log('[ActivityStorage] Storage Info:', info);
	return info;
}

// Expose debug functions to window object for easy console access
if (typeof window !== 'undefined') {
	(window as any).activityDebug = {
		getAll: debugGetAllActivities,
		clear: debugClearAllActivities,
		export: debugExportActivities,
		info: debugShowStorageInfo,
		help: () => {
			console.log(`
Activity Storage Debug Commands:
  activityDebug.getAll()     - Display all activities in a table
  activityDebug.clear()      - Clear all activities (with confirmation)
  activityDebug.export()     - Export all activities as JSON
  activityDebug.info()       - Show localStorage storage info
  activityDebug.help()       - Show this help message
			`);
		}
	};

	debugLog('Debug functions exposed to window.activityDebug');
	console.log('[ActivityStorage] Debug functions available! Type activityDebug.help() for commands.');
}

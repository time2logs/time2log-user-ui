import type { ActivityRecord } from './types';
import { writable } from 'svelte/store';
import { supabase, supabaseAdmin } from './supabaseClient';

const LAST_ACTIVITY_KEY = 'last_activity_id';
const DEBUG = import.meta.env.DEV ?? false;

export const MAX_HOURS_PER_ENTRY = 10;
export const MIN_HOURS = 0.5;

type ActivityRecordRow = Omit<
	ActivityRecord,
	'location' | 'activity_name' | 'activity_key' | 'activity_label'
> & {
	location: string | null;
};

type CurriculumNodeSummary = {
	id: string;
	key: string;
	label: string;
};

function debugLog(message: string, data?: any) {
	if (DEBUG && typeof window !== 'undefined') {
		console.log(`[ActivityStorage] ${message}`, data || '');
	}
}

function validateActivity(activity: { hours: number }): boolean {
	if (typeof activity.hours !== 'number' || isNaN(activity.hours)) {
		console.error('[ActivityStorage] Invalid hours value:', activity.hours);
		return false;
	}
	if (activity.hours < MIN_HOURS) {
		console.error('[ActivityStorage] Hours below minimum:', activity.hours, '<', MIN_HOURS);
		return false;
	}
	if (activity.hours > MAX_HOURS_PER_ENTRY) {
		console.error(
			'[ActivityStorage] Hours exceed maximum:',
			activity.hours,
			'>',
			MAX_HOURS_PER_ENTRY
		);
		return false;
	}
	return true;
}

async function fetchCurriculumNodeMap(
	curriculumNodeIds: string[]
): Promise<Map<string, CurriculumNodeSummary>> {
	const uniqueIds = Array.from(
		new Set(curriculumNodeIds.filter((id): id is string => typeof id === 'string' && id.length > 0))
	);

	if (uniqueIds.length === 0) {
		return new Map();
	}

	const { data, error } = await supabaseAdmin
		.from('curriculum_nodes')
		.select('id, key, label')
		.in('id', uniqueIds);

	if (error) {
		console.error('[ActivityStorage] Error loading curriculum nodes from admin schema:', error);
		return new Map();
	}

	return new Map(
		((data as CurriculumNodeSummary[] | null) ?? []).map((node) => [
			node.id,
			{ id: node.id, key: node.key, label: node.label }
		])
	);
}

function toActivityRecord(
	record: ActivityRecordRow,
	node?: CurriculumNodeSummary,
	fallback: Partial<Pick<ActivityRecord, 'activity_name' | 'activity_key' | 'activity_label'>> = {}
): ActivityRecord {
	return {
		...record,
		location: record.location || '',
		activity_name: node?.label || fallback.activity_name || '',
		activity_key: node?.key || fallback.activity_key || '',
		activity_label: fallback.activity_label || ''
	};
}

async function enrichActivityRecords(records: ActivityRecordRow[]): Promise<ActivityRecord[]> {
	if (records.length === 0) {
		return [];
	}

	const nodeMap = await fetchCurriculumNodeMap(records.map((record) => record.curriculum_activity_id));

	return records.map((record) => toActivityRecord(record, nodeMap.get(record.curriculum_activity_id)));
}

// Create a writable store for activities
function createActivityStore() {
	const { subscribe, set, update: updateStore } = writable<ActivityRecord[]>([]);
	const load = async () => {
		if (typeof window === 'undefined') return;

		debugLog('Loading activities from Supabase...');

		const { data, error } = await supabase
			.from('activity_records')
			.select('*')
			.order('created_at', { ascending: false });

		if (error) {
			console.error('[ActivityStorage] Error loading from Supabase:', error);
			set([]);
			return;
		}

		debugLog(`Loaded ${data?.length || 0} activities from Supabase`);

		if (data && data.length > 0) {
			const formattedActivities = await enrichActivityRecords(data as ActivityRecordRow[]);
			set(formattedActivities);
		} else {
			set([]);
		}
	};

	return {
		subscribe,
		// Load activities from Supabase
		load,
		add: async (
			activity: Omit<ActivityRecord, 'id' | 'created_at' | 'updated_at'>
		): Promise<ActivityRecord | null> => {
			debugLog('Adding new activity via store', activity);

			if (!validateActivity(activity)) {
				console.warn('[ActivityStorage] Activity validation failed, not adding');
				return null;
			}

			const { data, error } = await supabase
				.from('activity_records')
				.insert({
					organization_id: activity.organization_id,
					profession_id: activity.profession_id,
					user_id: activity.user_id,
					team_id: activity.team_id,
					curriculum_activity_id: activity.curriculum_activity_id,
					entry_date: activity.entry_date,
					hours: activity.hours,
					notes: activity.notes,
					rating: activity.rating,
					location: activity.location
				})
				.select()
				.single();

			if (error) {
				console.error('[ActivityStorage] Error inserting to Supabase:', error);
				throw new Error(error.message || 'Failed to save activity');
			}

			debugLog('Activity saved to Supabase:', data);

			// Store last activity ID for pre-filling (localStorage is fine for this)
			if (typeof window !== 'undefined') {
				localStorage.setItem(LAST_ACTIVITY_KEY, activity.curriculum_activity_id);
			}

			// Add to local store with the activity name info
			const newActivity: ActivityRecord = {
				...data,
				activity_name: activity.activity_name || '',
				activity_key: activity.activity_key || '',
				activity_label: activity.activity_label || ''
			};

			updateStore((activities) => [newActivity, ...activities]);
			return newActivity;
		},
		delete: async (id: string): Promise<boolean> => {
			debugLog('Deleting activity via store', { id });

			const { error } = await supabase.from('activity_records').delete().eq('id', id);

			if (error) {
				console.error('[ActivityStorage] Error deleting from Supabase:', error);
				throw new Error(error.message || 'Failed to delete activity');
			}

			debugLog('Activity deleted from Supabase:', id);

			// Remove from local store
			updateStore((activities) => activities.filter((a) => a.id !== id));
			return true;
		},
		update: async (
			id: string,
			activity: Partial<
				Pick<
					ActivityRecord,
					| 'curriculum_activity_id'
					| 'entry_date'
					| 'hours'
					| 'notes'
					| 'rating'
					| 'location'
					| 'activity_name'
					| 'activity_key'
					| 'activity_label'
				>
			>
		): Promise<ActivityRecord | null> => {
			debugLog('Updating activity via store', { id, activity });

			if (activity.hours !== undefined && !validateActivity({ hours: activity.hours })) {
				console.warn('[ActivityStorage] Activity validation failed, not updating');
				return null;
			}

			const updateData: Record<string, any> = {};
			if (activity.curriculum_activity_id !== undefined)
				updateData.curriculum_activity_id = activity.curriculum_activity_id;
			if (activity.entry_date !== undefined) updateData.entry_date = activity.entry_date;
			if (activity.hours !== undefined) updateData.hours = activity.hours;
			if (activity.notes !== undefined) updateData.notes = activity.notes;
			if (activity.rating !== undefined) updateData.rating = activity.rating;
			if (activity.location !== undefined) updateData.location = activity.location;

			const { data, error } = await supabase
				.from('activity_records')
				.update(updateData)
				.eq('id', id)
				.select('*')
				.single();

			if (error) {
				console.error('[ActivityStorage] Error updating in Supabase:', error);
				throw new Error(error.message || 'Failed to update activity');
			}

			debugLog('Activity updated in Supabase:', data);

			const nodeMap = await fetchCurriculumNodeMap([data.curriculum_activity_id]);

			const updatedActivity = toActivityRecord(
				data as ActivityRecordRow,
				nodeMap.get(data.curriculum_activity_id),
				activity
			);

			updateStore((activities) => activities.map((a) => (a.id === id ? updatedActivity : a)));

			return updatedActivity;
		},
		refresh: async () => {
			debugLog('Refreshing activity store from Supabase');
			await load();
		}
	};
}

// Export the store instance
export const activityStore = createActivityStore();

// Backward compatible functions that use the store
export async function getActivities(): Promise<ActivityRecord[]> {
	debugLog('Fetching activities from Supabase...');

	const { data, error } = await supabase
		.from('activity_records')
		.select('*')
		.order('created_at', { ascending: false });

	if (error) {
		console.error('[ActivityStorage] Error fetching from Supabase:', error);
		return [];
	}

	if (data && data.length > 0) {
		return enrichActivityRecords(data as ActivityRecordRow[]);
	}

	return [];
}

export async function addActivity(
	activity: Omit<ActivityRecord, 'id' | 'created_at' | 'updated_at'>
): Promise<ActivityRecord> {
	debugLog('Adding new activity', activity);

	if (!validateActivity(activity)) {
		throw new Error('Invalid activity: hours must be a positive number');
	}

	const { data, error } = await supabase
		.from('activity_records')
		.insert({
			organization_id: activity.organization_id,
			profession_id: activity.profession_id,
			user_id: activity.user_id,
			team_id: activity.team_id,
			curriculum_activity_id: activity.curriculum_activity_id,
			entry_date: activity.entry_date,
			hours: activity.hours,
			notes: activity.notes,
			rating: activity.rating,
			location: activity.location
		})
		.select()
		.single();

	if (error) {
		console.error('[ActivityStorage] Error inserting to Supabase:', error);
		throw new Error(error.message || 'Failed to save activity');
	}

	// Store last activity ID for pre-filling
	if (typeof window !== 'undefined') {
		localStorage.setItem(LAST_ACTIVITY_KEY, activity.curriculum_activity_id);
		debugLog('Stored last activity ID', activity.curriculum_activity_id);
	}

	debugLog('New activity created', data);

	return {
		...data,
		location: data.location || activity.location || '',
		activity_name: activity.activity_name || '',
		activity_key: activity.activity_key || '',
		activity_label: activity.activity_label || ''
	};
}

export async function deleteActivity(id: string): Promise<void> {
	debugLog('Deleting activity', { id });

	const { error } = await supabase.from('activity_records').delete().eq('id', id);

	if (error) {
		console.error('[ActivityStorage] Error deleting from Supabase:', error);
		throw new Error(error.message || 'Failed to delete activity');
	}

	debugLog('Activity deleted successfully', { id });
}

export function getLastActivityId(): string | null {
	if (typeof window === 'undefined') return null;

	const lastId = localStorage.getItem(LAST_ACTIVITY_KEY);
	debugLog('Retrieved last activity ID', lastId);
	return lastId;
}

export async function getActivityById(id: string): Promise<ActivityRecord | undefined> {
	const { data, error } = await supabase
		.from('activity_records')
		.select('*')
		.eq('id', id)
		.single();

	if (error) {
		console.error('[ActivityStorage] Error fetching activity by ID:', error);
		return undefined;
	}

	if (!data) return undefined;

	const [activity] = await enrichActivityRecords([data as ActivityRecordRow]);
	return activity;
}

// Debug functions to expose to console for debugging
export async function debugGetAllActivities() {
	const activities = await getActivities();
	console.table(activities);
	return activities;
}

export function debugShowStorageInfo() {
	if (typeof window === 'undefined') {
		console.log('[ActivityStorage] Storage Info not available during SSR');
		return null;
	}

	const lastId = localStorage.getItem(LAST_ACTIVITY_KEY);
	const info = {
		lastActivityId: lastId,
		note: 'Activities are now stored in Supabase, not localStorage'
	};
	console.log('[ActivityStorage] Storage Info:', info);
	return info;
}

// Expose debug functions to window object for easy console access
if (typeof window !== 'undefined') {
	(window as any).activityDebug = {
		getAll: debugGetAllActivities,
		info: debugShowStorageInfo,
		help: () => {
			console.log(`
Activity Storage Debug Commands:
  activityDebug.getAll()     - Display all activities in a table
  activityDebug.info()       - Show storage info
  activityDebug.help()       - Show this help message

Note: Activities are stored in Supabase, not localStorage.
			`);
		}
	};

	debugLog('Debug functions exposed to window.activityDebug');
}

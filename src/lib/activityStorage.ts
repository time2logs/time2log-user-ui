import type { ActivityRecord } from './types';
import { writable } from 'svelte/store';
import { supabase } from './supabaseClient';

const LAST_ACTIVITY_KEY = 'last_activity_id';
const DEBUG = import.meta.env.DEV ?? false;

export const MAX_HOURS_PER_ENTRY = 10;
export const MAX_HOURS_PER_DAY = 10;
export const MIN_HOURS = 1;

function debugLog(message: string, data?: unknown) {
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

// Create a writable store for activities
function createActivityStore() {
	const { subscribe, set, update: updateStore } = writable<ActivityRecord[]>([]);
	const load = async () => {
		if (typeof window === 'undefined') return;

		debugLog('Loading activities from Supabase...');

		const { data, error } = await supabase
			.from('activity_records')
			.select('*, curriculum_nodes!inner(id, key, label)')
			.order('created_at', { ascending: false });

		if (error) {
			console.error('[ActivityStorage] Error loading from Supabase:', error);
			set([]);
			return;
		}

		debugLog(`Loaded ${data?.length || 0} activities from Supabase`);

		if (data && data.length > 0) {
			const formattedActivities: ActivityRecord[] = data.map((record: Record<string, unknown>) => ({
				id: record.id as string,
				organization_id: record.organization_id as string,
				profession_id: record.profession_id as string,
				user_id: record.user_id as string,
				team_id: record.team_id as string | null,
				curriculum_activity_id: record.curriculum_activity_id as string,
				entry_date: record.entry_date as string,
				hours: record.hours as number,
				notes: record.notes as string | null,
				rating: record.rating as number | null,
				location: (record.location as string) || '',
				created_at: record.created_at as string,
				updated_at: record.updated_at as string,
				activity_name: (record.curriculum_nodes as { label: string })?.label || '',
				activity_key: (record.curriculum_nodes as { key: string })?.key || '',
				activity_label: ''
			}));
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

			const updateData: Record<string, unknown> = {};
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
				.select('*, curriculum_nodes!inner(id, key, label)')
				.single();

			if (error) {
				console.error('[ActivityStorage] Error updating in Supabase:', error);
				throw new Error(error.message || 'Failed to update activity');
			}

			debugLog('Activity updated in Supabase:', data);

			const updatedActivity: ActivityRecord = {
				...data,
				activity_name: data.curriculum_nodes?.label || activity.activity_name || '',
				activity_key: data.curriculum_nodes?.key || activity.activity_key || '',
				activity_label: activity.activity_label || ''
			};

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
		.select('*, curriculum_nodes!inner(id, key, label)')
		.order('created_at', { ascending: false });

	if (error) {
		console.error('[ActivityStorage] Error fetching from Supabase:', error);
		return [];
	}

	if (data && data.length > 0) {
		return data.map((record: Record<string, unknown>) => ({
			id: record.id as string,
			organization_id: record.organization_id as string,
			profession_id: record.profession_id as string,
			user_id: record.user_id as string,
			team_id: record.team_id as string | null,
			curriculum_activity_id: record.curriculum_activity_id as string,
			entry_date: record.entry_date as string,
			hours: record.hours as number,
			notes: record.notes as string | null,
			rating: record.rating as number | null,
			location: (record.location as string) || '',
			created_at: record.created_at as string,
			updated_at: record.updated_at as string,
			activity_name: (record.curriculum_nodes as { label: string })?.label || '',
			activity_key: (record.curriculum_nodes as { key: string })?.key || '',
			activity_label: ''
		}));
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
		.select('*, curriculum_nodes!inner(id, key, label)')
		.eq('id', id)
		.single();

	if (error) {
		console.error('[ActivityStorage] Error fetching activity by ID:', error);
		return undefined;
	}

	if (!data) return undefined;

	return {
		...data,
		location: data.location || '',
		activity_name: data.curriculum_nodes?.label || '',
		activity_key: data.curriculum_nodes?.key || '',
		activity_label: ''
	};
}

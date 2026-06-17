import type { ActivityRecord, CurriculumNodeSummary } from './types';
import { writable, get } from 'svelte/store';
import { supabase } from './supabaseClient';
import * as m from '$lib/paraglide/messages.js';
import { isWithinEditWindow, EDIT_WINDOW_DAYS } from './utils';
import { createDebugLogger } from './debug';
import { unwrapSupabase } from './supabaseUtils';
import { STORAGE_KEYS } from './storageKeys';

const debug = createDebugLogger('ActivityStorage');

export const DEFAULT_MAX_HOURS_PER_DAY = 10;
export const MIN_HOURS = 1;

type ActivityRecordSource = Omit<
	ActivityRecord,
	'location' | 'activity_name' | 'activity_key' | 'activity_label'
> & {
	location: string | null;
};

function validateActivity(
	activity: { hours: number },
	maxHours: number = DEFAULT_MAX_HOURS_PER_DAY
): boolean {
	if (typeof activity.hours !== 'number' || isNaN(activity.hours)) {
		console.error('[ActivityStorage] Invalid hours value:', activity.hours);
		return false;
	}
	if (activity.hours < MIN_HOURS) {
		console.error('[ActivityStorage] Hours below minimum:', activity.hours, '<', MIN_HOURS);
		return false;
	}
	if (activity.hours > maxHours) {
		console.error('[ActivityStorage] Hours exceed maximum:', activity.hours, '>', maxHours);
		return false;
	}
	return true;
}

function createActivityStore() {
	const store = writable<ActivityRecord[]>([]);
	const { subscribe, set, update: updateStore } = store;

	let curriculumNodeSummariesConfigured = false;
	let curriculumNodeSummaryMap = new Map<string, CurriculumNodeSummary>();

	function reportMissingCurriculumSummaries(context: string) {
		const message = `[ActivityStorage] Curriculum node summaries were not configured before ${context}.`;
		console.error(message, { context });

		if (import.meta.env.DEV) {
			throw new Error(message);
		}
	}

	function resolveCurriculumNodeSummary(
		curriculumActivityId: string,
		context: string
	): CurriculumNodeSummary | undefined {
		if (!curriculumNodeSummariesConfigured) {
			reportMissingCurriculumSummaries(context);
			return undefined;
		}

		const node = curriculumNodeSummaryMap.get(curriculumActivityId);

		if (!node) {
			console.error('[ActivityStorage] Missing curriculum node summary for activity record.', {
				context,
				curriculumActivityId
			});
		}

		return node;
	}

	function toActivityRecord(
		record: ActivityRecordSource,
		fallback: Partial<
			Pick<ActivityRecord, 'activity_name' | 'activity_key' | 'activity_label'>
		> = {}
	): ActivityRecord {
		const node = resolveCurriculumNodeSummary(record.curriculum_activity_id, 'activity enrichment');

		return {
			...record,
			location: record.location || '',
			activity_name: node?.label || fallback.activity_name || m.unavailable_activity_name(),
			activity_key: node?.key || fallback.activity_key || m.unavailable_activity_key(),
			activity_label: fallback.activity_label || ''
		};
	}

	function enrichActivityRecords(records: ActivityRecordSource[]): ActivityRecord[] {
		return records.map((record) => toActivityRecord(record));
	}

	const load = async () => {
		if (typeof window === 'undefined') return;

		debug.log('Loading activities from Supabase...');

		const result = await supabase
			.from('activity_records')
			.select('*')
			.order('created_at', { ascending: false });

		if (result.error) {
			console.error('[ActivityStorage] Error loading from Supabase:', result.error);
			set([]);
			return;
		}

		debug.log(`Loaded ${result.data?.length || 0} activities from Supabase`);

		const data = result.data as ActivityRecordSource[] | null;
		set(data && data.length > 0 ? enrichActivityRecords(data) : []);
	};

	return {
		subscribe,
		setCurriculumNodeSummaries: (summaries: CurriculumNodeSummary[]) => {
			curriculumNodeSummaryMap = new Map(
				summaries.map((summary) => [
					summary.id,
					{
						id: summary.id,
						key: summary.key,
						label: summary.label,
						is_active: summary.is_active
					}
				])
			);
			curriculumNodeSummariesConfigured = true;

			updateStore((activities) =>
				activities.map((activity) =>
					toActivityRecord({
						...activity,
						location: activity.location
					})
				)
			);
		},
		load,
		add: async (
			activity: Omit<ActivityRecord, 'id' | 'created_at' | 'updated_at'>,
			maxHours: number = DEFAULT_MAX_HOURS_PER_DAY
		): Promise<ActivityRecord | null> => {
			debug.log('Adding new activity via store', activity);

			if (!validateActivity(activity, maxHours)) {
				console.warn('[ActivityStorage] Activity validation failed, not adding');
				return null;
			}

			const data = unwrapSupabase(
				await supabase
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
					.single(),
				'Failed to save activity'
			);

			debug.log('Activity saved to Supabase:', data);

			if (typeof window !== 'undefined') {
				localStorage.setItem(STORAGE_KEYS.lastActivityId, activity.curriculum_activity_id);
				if (activity.location) {
					localStorage.setItem(STORAGE_KEYS.lastLocation, activity.location);
				}
			}

			const newActivity: ActivityRecord = {
				...data,
				activity_name: activity.activity_name || '',
				activity_key: activity.activity_key || '',
				activity_label: activity.activity_label || ''
			};

			updateStore((activities) => [newActivity, ...activities]);
			return newActivity;
		},
		addMany: async (
			activities: Omit<ActivityRecord, 'id' | 'created_at' | 'updated_at'>[],
			maxHours: number = DEFAULT_MAX_HOURS_PER_DAY
		): Promise<ActivityRecord[]> => {
			if (activities.length === 0) return [];

			debug.log('Adding multiple activities via store', { count: activities.length });

			if (activities.some((a) => !validateActivity(a, maxHours))) {
				console.warn('[ActivityStorage] One or more activities failed validation, not adding');
				throw new Error(
					'Invalid activity: hours must be a positive number within the allowed range'
				);
			}

			const rows = activities.map((a) => ({
				organization_id: a.organization_id,
				profession_id: a.profession_id,
				user_id: a.user_id,
				team_id: a.team_id,
				curriculum_activity_id: a.curriculum_activity_id,
				entry_date: a.entry_date,
				hours: a.hours,
				notes: a.notes,
				rating: a.rating,
				location: a.location
			}));

			const data = unwrapSupabase(
				await supabase.from('activity_records').insert(rows).select(),
				'Failed to save activities'
			);

			debug.log('Activities saved to Supabase:', data);

			const last = activities[activities.length - 1];
			if (typeof window !== 'undefined') {
				localStorage.setItem(STORAGE_KEYS.lastActivityId, last.curriculum_activity_id);
				if (last.location) localStorage.setItem(STORAGE_KEYS.lastLocation, last.location);
			}

			const newActivities: ActivityRecord[] = data.map((row, i) => ({
				...row,
				activity_name: activities[i].activity_name || '',
				activity_key: activities[i].activity_key || '',
				activity_label: activities[i].activity_label || ''
			}));

			updateStore((existing) => [...newActivities, ...existing]);
			return newActivities;
		},
		delete: async (id: string): Promise<boolean> => {
			debug.log('Deleting activity via store', { id });

			const existing = get(store).find((a) => a.id === id);
			if (existing && !isWithinEditWindow(existing.entry_date)) {
				throw new Error(m.error_edit_window_delete({ days: EDIT_WINDOW_DAYS }));
			}

			unwrapSupabase(
				await supabase.from('activity_records').delete().eq('id', id),
				'Failed to delete activity'
			);

			debug.log('Activity deleted from Supabase:', id);

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
			>,
			maxHours: number = DEFAULT_MAX_HOURS_PER_DAY
		): Promise<ActivityRecord | null> => {
			debug.log('Updating activity via store', { id, activity });

			if (activity.hours !== undefined && !validateActivity({ hours: activity.hours }, maxHours)) {
				console.warn('[ActivityStorage] Activity validation failed, not updating');
				return null;
			}

			const existing = get(store).find((a) => a.id === id);
			if (existing && !isWithinEditWindow(existing.entry_date)) {
				throw new Error(m.error_edit_window_update({ days: EDIT_WINDOW_DAYS }));
			}

			const updateData: Record<string, unknown> = {};
			if (activity.curriculum_activity_id !== undefined) {
				updateData.curriculum_activity_id = activity.curriculum_activity_id;
			}
			if (activity.entry_date !== undefined) updateData.entry_date = activity.entry_date;
			if (activity.hours !== undefined) updateData.hours = activity.hours;
			if (activity.notes !== undefined) updateData.notes = activity.notes;
			if (activity.rating !== undefined) updateData.rating = activity.rating;
			if (activity.location !== undefined) updateData.location = activity.location;

			const data = unwrapSupabase(
				await supabase
					.from('activity_records')
					.update(updateData)
					.eq('id', id)
					.select('*')
					.single(),
				'Failed to update activity'
			);

			debug.log('Activity updated in Supabase:', data);

			if (typeof window !== 'undefined' && activity.location) {
				localStorage.setItem(STORAGE_KEYS.lastLocation, activity.location);
			}

			const updatedActivity = toActivityRecord(data as ActivityRecordSource, activity);

			updateStore((activities) => activities.map((a) => (a.id === id ? updatedActivity : a)));

			return updatedActivity;
		},
		refresh: async () => {
			debug.log('Refreshing activity store from Supabase');
			await load();
		}
	};
}

export const activityStore = createActivityStore();

export function getLastActivityId(): string | null {
	if (typeof window === 'undefined') return null;

	const lastId = localStorage.getItem(STORAGE_KEYS.lastActivityId);
	debug.log('Retrieved last activity ID', lastId);
	return lastId;
}

export function getLastLocation(): string | null {
	if (typeof window === 'undefined') return null;

	const lastLocation = localStorage.getItem(STORAGE_KEYS.lastLocation);
	debug.log('Retrieved last location', lastLocation);
	return lastLocation;
}

import type { AbsenceRecord, AbsenceRow, AbsenceType } from './types';
import { writable, get } from 'svelte/store';
import { supabase } from './supabaseClient';
import { rrulestr } from 'rrule';
import * as m from '$lib/paraglide/messages.js';
import { isAbsenceWithinEditWindow, EDIT_WINDOW_DAYS } from './utils';
import { createDebugLogger } from './debug';
import { unwrapSupabase } from './supabaseUtils';

const debug = createDebugLogger('AbsenceStorage');

/**
 * Maps a raw Supabase absence row to the app-facing {@link AbsenceRecord}.
 * Extracted as a single helper to avoid copy-paste across store methods.
 */
function toAbsenceRecord(record: AbsenceRow): AbsenceRecord {
	return {
		id: record.id,
		user_id: record.user_id,
		team_id: record.team_id,
		organization_id: record.organization_id,
		absence_type_id: record.absence_type_id as AbsenceType,
		start_date: record.start_date,
		end_date: record.end_date,
		day_fraction: Number(record.day_fraction ?? 1),
		is_recurring: record.is_recurring ?? false,
		rrule: record.rrule ?? null,
		notes: record.notes ?? null,
		created_at: record.created_at,
		updated_at: record.updated_at,
		absence_type_label: record.absence_types?.label_key || record.absence_type_id
	};
}

/**
 * Check if a date falls within an absence period (handles both fixed ranges and recurring rules)
 */
export function isDateInAbsence(date: string, absence: AbsenceRow | AbsenceRecord): boolean {
	// Recurring absences are matched solely by their rrule — the stored
	// start_date/end_date range is not used for day-level matching.
	if (absence.is_recurring && absence.rrule) {
		try {
			const rule = rrulestr(absence.rrule, {
				dtstart: new Date(`${absence.start_date}T00:00:00Z`)
			});
			const checkDate = new Date(`${date}T00:00:00Z`);
			return rule.between(checkDate, checkDate, true).length > 0;
		} catch (error) {
			console.error(
				'[AbsenceStorage] Error parsing rrule — failing closed (treating date as blocked):',
				error,
				{ absenceId: absence.id, rrule: absence.rrule }
			);
			return true;
		}
	}

	// Non-recurring: simple start_date/end_date range check
	return date >= absence.start_date && date <= absence.end_date;
}

export function getAbsenceFractionForDate(
	date: string,
	absences: Array<AbsenceRow | AbsenceRecord>
): number {
	return Math.min(
		1,
		absences.reduce((sum, absence) => {
			if (!isDateInAbsence(date, absence)) return sum;
			return sum + Number(absence.day_fraction ?? 1);
		}, 0)
	);
}

function createAbsenceStore() {
	const store = writable<AbsenceRecord[]>([]);
	const { subscribe, set, update: updateStore } = store;

	const loading = writable(false);
	const error = writable<string | null>(null);
	let loadInFlight = false;

	const load = async () => {
		if (typeof window === 'undefined') return;
		if (loadInFlight) return;

		loadInFlight = true;
		loading.set(true);
		error.set(null);

		debug.log('Loading absences from Supabase...');

		try {
			const result = await supabase
				.from('absences')
				.select('*, absence_types(id, label_key, is_recurring_allowed)')
				.order('start_date', { ascending: false });

			if (result.error) {
				console.error('[AbsenceStorage] Error loading from Supabase:', result.error);
				error.set(result.error.message);
				return;
			}

			debug.log(`Loaded ${result.data?.length || 0} absences from Supabase`);

			const data = result.data as AbsenceRow[] | null;
			set(data && data.length > 0 ? data.map(toAbsenceRecord) : []);
		} catch (err) {
			console.error('[AbsenceStorage] Exception loading from Supabase:', err);
			error.set(err instanceof Error ? err.message : String(err));
		} finally {
			loading.set(false);
			loadInFlight = false;
		}
	};

	return {
		subscribe,
		loading,
		error,
		load,
		add: async (
			absence: Omit<AbsenceRecord, 'id' | 'created_at' | 'updated_at' | 'absence_type_label'>
		): Promise<AbsenceRecord | null> => {
			debug.log('Adding new absence via store', absence);

			const data = unwrapSupabase<AbsenceRow>(
				await supabase
					.from('absences')
					.insert({
						organization_id: absence.organization_id,
						user_id: absence.user_id,
						team_id: absence.team_id,
						absence_type_id: absence.absence_type_id,
						start_date: absence.start_date,
						end_date: absence.end_date,
						day_fraction: absence.day_fraction,
						is_recurring: absence.is_recurring,
						rrule: absence.rrule,
						notes: absence.notes
					})
					.select('*, absence_types(id, label_key, is_recurring_allowed)')
					.single(),
				'Failed to save absence'
			);

			debug.log('Absence saved to Supabase:', data);

			const newAbsence = toAbsenceRecord(data as AbsenceRow);

			updateStore((absences) => [newAbsence, ...absences]);
			return newAbsence;
		},
		delete: async (id: string): Promise<boolean> => {
			debug.log('Deleting absence via store', { id });

			const existing = get(store).find((a) => a.id === id);
			if (existing && !isAbsenceWithinEditWindow(existing)) {
				throw new Error(m.error_edit_window_delete({ days: EDIT_WINDOW_DAYS }));
			}

			unwrapSupabase(
				await supabase.from('absences').delete().eq('id', id),
				'Failed to delete absence'
			);

			debug.log('Absence deleted from Supabase:', id);

			updateStore((absences) => absences.filter((a) => a.id !== id));
			return true;
		},
		update: async (
			id: string,
			absence: Partial<
				Pick<
					AbsenceRecord,
					| 'absence_type_id'
					| 'start_date'
					| 'end_date'
					| 'day_fraction'
					| 'is_recurring'
					| 'rrule'
					| 'notes'
				>
			>
		): Promise<AbsenceRecord | null> => {
			debug.log('Updating absence via store', { id, absence });

			const existing = get(store).find((a) => a.id === id);
			if (existing && !isAbsenceWithinEditWindow(existing)) {
				throw new Error(m.error_edit_window_update({ days: EDIT_WINDOW_DAYS }));
			}

			const updateData: Record<string, unknown> = {};
			if (absence.absence_type_id !== undefined)
				updateData.absence_type_id = absence.absence_type_id;
			if (absence.start_date !== undefined) updateData.start_date = absence.start_date;
			if (absence.end_date !== undefined) updateData.end_date = absence.end_date;
			if (absence.day_fraction !== undefined) updateData.day_fraction = absence.day_fraction;
			if (absence.is_recurring !== undefined) updateData.is_recurring = absence.is_recurring;
			if (absence.rrule !== undefined) updateData.rrule = absence.rrule;
			if (absence.notes !== undefined) updateData.notes = absence.notes;

			const data = unwrapSupabase<AbsenceRow>(
				await supabase
					.from('absences')
					.update(updateData)
					.eq('id', id)
					.select('*, absence_types(id, label_key, is_recurring_allowed)')
					.single(),
				'Failed to update absence'
			);

			debug.log('Absence updated in Supabase:', data);

			const updatedAbsence = toAbsenceRecord(data as AbsenceRow);

			updateStore((absences) => absences.map((a) => (a.id === id ? updatedAbsence : a)));

			return updatedAbsence;
		},
		refresh: async () => {
			debug.log('Refreshing absence store from Supabase');
			await load();
		}
	};
}

export const absenceStore = createAbsenceStore();
export const absenceLoading = absenceStore.loading;
export const absenceError = absenceStore.error;

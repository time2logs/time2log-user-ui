import type { AbsenceRecord, AbsenceType } from './types';
import { writable } from 'svelte/store';
import { supabase } from './supabaseClient';
import { getCurrentUser } from './clientAuth';
import { rrulestr } from 'rrule';

type AbsenceRow = {
	id: string;
	user_id: string;
	team_id: string | null;
	organization_id: string;
	absence_type_id: string;
	start_date: string;
	end_date: string;
	day_fraction: number;
	is_recurring: boolean;
	rrule: string | null;
	notes: string | null;
	created_at: string;
	updated_at: string;
	absence_types?: { label_key: string; is_recurring_allowed: boolean } | null;
};

const DEBUG = import.meta.env.DEV ?? false;

function debugLog(message: string, data?: unknown) {
	if (DEBUG && typeof window !== 'undefined') {
		console.log(`[AbsenceStorage] ${message}`, data || '');
	}
}

/**
 * Check if a date falls within an absence period (handles both fixed ranges and recurring rules)
 */
export function isDateInAbsence(date: string, absence: AbsenceRow | AbsenceRecord): boolean {
	// Check if date is within the start_date and end_date range
	if (date >= absence.start_date && date <= absence.end_date) {
		return true;
	}

	// If recurring with rrule, check if the date matches the recurrence rule
	if (absence.is_recurring && absence.rrule) {
		try {
			const rule = rrulestr(absence.rrule, {
				dtstart: new Date(`${absence.start_date}T00:00:00Z`)
			});
			const checkDate = new Date(`${date}T00:00:00Z`);
			return rule.between(checkDate, checkDate, true).length > 0;
		} catch (error) {
			console.error('[AbsenceStorage] Error parsing rrule:', error);
			return false;
		}
	}

	return false;
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
	const { subscribe, set, update: updateStore } = writable<AbsenceRecord[]>([]);

	const load = async () => {
		if (typeof window === 'undefined') return;

		debugLog('Loading absences from Supabase...');

		const { data, error } = await supabase
			.from('absences')
			.select('*, absence_types(id, label_key, is_recurring_allowed)')
			.order('start_date', { ascending: false });

		if (error) {
			console.error('[AbsenceStorage] Error loading from Supabase:', error);
			set([]);
			return;
		}

		debugLog(`Loaded ${data?.length || 0} absences from Supabase`);

		if (data && data.length > 0) {
			const formattedAbsences: AbsenceRecord[] = data.map((record: AbsenceRow) => ({
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
			}));
			set(formattedAbsences);
		} else {
			set([]);
		}
	};

	return {
		subscribe,
		load,
		add: async (
			absence: Omit<AbsenceRecord, 'id' | 'created_at' | 'updated_at' | 'absence_type_label'>
		): Promise<AbsenceRecord | null> => {
			debugLog('Adding new absence via store', absence);

			const { data, error } = await supabase
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
				.single();

			if (error) {
				console.error('[AbsenceStorage] Error inserting to Supabase:', error);
				throw new Error(error.message || 'Failed to save absence');
			}

			debugLog('Absence saved to Supabase:', data);

			const newAbsence: AbsenceRecord = {
				...data,
				absence_type_id: data.absence_type_id as AbsenceType,
				absence_type_label: data.absence_types?.label_key || data.absence_type_id
			};

			updateStore((absences) => [newAbsence, ...absences]);
			return newAbsence;
		},
		delete: async (id: string): Promise<boolean> => {
			debugLog('Deleting absence via store', { id });

			const user = await getCurrentUser();

			const { error } = await supabase.from('absences').delete().eq('id', id).eq('user_id', user.id);

			if (error) {
				console.error('[AbsenceStorage] Error deleting from Supabase:', error);
				throw new Error(error.message || 'Failed to delete absence');
			}

			debugLog('Absence deleted from Supabase:', id);

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
			debugLog('Updating absence via store', { id, absence });

			const updateData: Record<string, unknown> = {};
			if (absence.absence_type_id !== undefined)
				updateData.absence_type_id = absence.absence_type_id;
			if (absence.start_date !== undefined) updateData.start_date = absence.start_date;
			if (absence.end_date !== undefined) updateData.end_date = absence.end_date;
			if (absence.day_fraction !== undefined) updateData.day_fraction = absence.day_fraction;
			if (absence.is_recurring !== undefined) updateData.is_recurring = absence.is_recurring;
			if (absence.rrule !== undefined) updateData.rrule = absence.rrule;
			if (absence.notes !== undefined) updateData.notes = absence.notes;

			const { data, error } = await supabase
				.from('absences')
				.update(updateData)
				.eq('id', id)
				.select('*, absence_types(id, label_key, is_recurring_allowed)')
				.single();

			if (error) {
				console.error('[AbsenceStorage] Error updating in Supabase:', error);
				throw new Error(error.message || 'Failed to update absence');
			}

			debugLog('Absence updated in Supabase:', data);

			const updatedAbsence: AbsenceRecord = {
				...data,
				absence_type_id: data.absence_type_id as AbsenceType,
				absence_type_label: data.absence_types?.label_key || data.absence_type_id
			};

			updateStore((absences) => absences.map((a) => (a.id === id ? updatedAbsence : a)));

			return updatedAbsence;
		},
		refresh: async () => {
			debugLog('Refreshing absence store from Supabase');
			await load();
		}
	};
}

export const absenceStore = createAbsenceStore();

export async function getAbsences(): Promise<AbsenceRecord[]> {
	debugLog('Fetching absences from Supabase...');

	const { data, error } = await supabase
		.from('absences')
		.select('*, absence_types(id, label_key, is_recurring_allowed)')
		.order('start_date', { ascending: false });

	if (error) {
		console.error('[AbsenceStorage] Error fetching from Supabase:', error);
		return [];
	}

	if (data && data.length > 0) {
		return data.map((record: AbsenceRow) => ({
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
		}));
	}

	return [];
}

export async function deleteAbsence(id: string): Promise<void> {
	debugLog('Deleting absence', { id });

	const user = await getCurrentUser();

	const { error } = await supabase.from('absences').delete().eq('id', id).eq('user_id', user.id);

	if (error) {
		console.error('[AbsenceStorage] Error deleting from Supabase:', error);
		throw new Error(error.message || 'Failed to delete absence');
	}

	debugLog('Absence deleted successfully', { id });
}

export async function getAbsenceById(id: string): Promise<AbsenceRecord | undefined> {
	let user;
	try {
		user = await getCurrentUser();
	} catch {
		return undefined;
	}

	const { data, error } = await supabase
		.from('absences')
		.select('*, absence_types(id, label_key, is_recurring_allowed)')
		.eq('id', id)
		.eq('user_id', user.id)
		.single();

	if (error) {
		console.error('[AbsenceStorage] Error fetching absence by ID:', error);
		return undefined;
	}

	if (!data) return undefined;

	return {
		id: data.id,
		user_id: data.user_id,
		team_id: data.team_id,
		organization_id: data.organization_id,
		absence_type_id: data.absence_type_id as AbsenceType,
		start_date: data.start_date,
		end_date: data.end_date,
		day_fraction: Number(data.day_fraction ?? 1),
		is_recurring: data.is_recurring ?? false,
		rrule: data.rrule ?? null,
		notes: data.notes ?? null,
		created_at: data.created_at,
		updated_at: data.updated_at,
		absence_type_label: data.absence_types?.label_key || data.absence_type_id
	};
}

/**
 * Get all absences that apply to a specific date (includes recurring rules)
 */
export async function getAbsencesForDate(userId: string, date: string): Promise<AbsenceRecord[]> {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('Invalid date format');

	const { data, error } = await supabase
		.from('absences')
		.select('*, absence_types(id, label_key, is_recurring_allowed)')
		.eq('user_id', userId)
		.or(`and(start_date.lte.${date},end_date.gte.${date}),is_recurring.eq.true`);

	if (error) {
		console.error('[AbsenceStorage] Error fetching absences for date:', error);
		return [];
	}

	// Filter to only include absences that actually apply to this date
	return data
		.filter((record: AbsenceRow) => isDateInAbsence(date, record))
		.map((record: AbsenceRow) => ({
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
		}));
}

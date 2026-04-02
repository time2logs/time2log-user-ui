import type { AbsenceRecord, AbsenceType } from './types';
import { writable } from 'svelte/store';
import { supabase } from './supabaseClient';

const DEBUG = import.meta.env.DEV ?? false;

function debugLog(message: string, data?: unknown) {
	if (DEBUG && typeof window !== 'undefined') {
		console.log(`[AbsenceStorage] ${message}`, data || '');
	}
}

function createAbsenceStore() {
	const { subscribe, set, update: updateStore } = writable<AbsenceRecord[]>([]);

	const load = async () => {
		if (typeof window === 'undefined') return;

		debugLog('Loading absences from Supabase...');

		const { data, error } = await supabase
			.from('absences')
			.select('*, absence_types(id, label_key, is_recurring_allowed)')
			.order('entry_date', { ascending: false });

		if (error) {
			console.error('[AbsenceStorage] Error loading from Supabase:', error);
			set([]);
			return;
		}

		debugLog(`Loaded ${data?.length || 0} absences from Supabase`);

		if (data && data.length > 0) {
			const formattedAbsences: AbsenceRecord[] = data.map((record: any) => ({
				id: record.id,
				user_id: record.user_id,
				team_id: record.team_id,
				organization_id: record.organization_id,
				absence_type_id: record.absence_type_id as AbsenceType,
				entry_date: record.entry_date,
				is_recurring: record.is_recurring ?? false,
				recurrence_pattern: record.recurrence_pattern ?? null,
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
					entry_date: absence.entry_date,
					is_recurring: absence.is_recurring,
					recurrence_pattern: absence.recurrence_pattern,
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
				absence_type_label: data.absence_types?.label_key || data.absence_type_id
			};

			updateStore((absences) => [newAbsence, ...absences]);
			return newAbsence;
		},
		delete: async (id: string): Promise<boolean> => {
			debugLog('Deleting absence via store', { id });

			const { error } = await supabase.from('absences').delete().eq('id', id);

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
					'absence_type_id' | 'entry_date' | 'is_recurring' | 'recurrence_pattern' | 'notes'
				>
			>
		): Promise<AbsenceRecord | null> => {
			debugLog('Updating absence via store', { id, absence });

			const updateData: Record<string, unknown> = {};
			if (absence.absence_type_id !== undefined)
				updateData.absence_type_id = absence.absence_type_id;
			if (absence.entry_date !== undefined) updateData.entry_date = absence.entry_date;
			if (absence.is_recurring !== undefined) updateData.is_recurring = absence.is_recurring;
			if (absence.recurrence_pattern !== undefined)
				updateData.recurrence_pattern = absence.recurrence_pattern;
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
				absence_type_label: data.absence_types?.label_key || data.absence_type_id
			};

			updateStore((absences) => absences.map((a) => (a.id === id ? updatedAbsence : a)));

			return updatedAbsence;
		},
		refresh: async () => {
			debugLog('Refreshing absence store from Supabase');
			await load();
		},
		addRecurring: async (params: {
			organization_id: string;
			user_id: string;
			team_id: string | null;
			absence_type_id: AbsenceType;
			notes: string | null;
			dates: string[];
		}): Promise<AbsenceRecord[]> => {
			debugLog('Adding recurring absences for dates:', params.dates);

			const absencesToInsert = params.dates.map((date) => ({
				organization_id: params.organization_id,
				user_id: params.user_id,
				team_id: params.team_id,
				absence_type_id: params.absence_type_id,
				entry_date: date,
				is_recurring: true,
				notes: params.notes
			}));

			const { data, error } = await supabase
				.from('absences')
				.insert(absencesToInsert)
				.select('*, absence_types(id, label_key, is_recurring_allowed)');

			if (error) {
				console.error('[AbsenceStorage] Error inserting recurring absences:', error);
				throw new Error(error.message || 'Failed to save recurring absences');
			}

			debugLog('Recurring absences saved to Supabase:', {
				count: data?.length,
				entries: 'entries'
			});

			const newAbsences: AbsenceRecord[] = data.map((record: any) => ({
				id: record.id,
				user_id: record.user_id,
				team_id: record.team_id,
				organization_id: record.organization_id,
				absence_type_id: record.absence_type_id as AbsenceType,
				entry_date: record.entry_date,
				is_recurring: record.is_recurring ?? true,
				recurrence_pattern: record.recurrence_pattern ?? null,
				notes: record.notes ?? null,
				created_at: record.created_at,
				updated_at: record.updated_at,
				absence_type_label: record.absence_types?.label_key || record.absence_type_id
			}));

			updateStore((absences) => [...newAbsences, ...absences]);
			return newAbsences;
		}
	};
}

export const absenceStore = createAbsenceStore();

export async function getAbsences(): Promise<AbsenceRecord[]> {
	debugLog('Fetching absences from Supabase...');

	const { data, error } = await supabase
		.from('absences')
		.select('*, absence_types(id, label_key, is_recurring_allowed)')
		.order('entry_date', { ascending: false });

	if (error) {
		console.error('[AbsenceStorage] Error fetching from Supabase:', error);
		return [];
	}

	if (data && data.length > 0) {
		return data.map((record: any) => ({
			id: record.id,
			user_id: record.user_id,
			team_id: record.team_id,
			organization_id: record.organization_id,
			absence_type_id: record.absence_type_id as AbsenceType,
			entry_date: record.entry_date,
			is_recurring: record.is_recurring ?? false,
			recurrence_pattern: record.recurrence_pattern ?? null,
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

	const { error } = await supabase.from('absences').delete().eq('id', id);

	if (error) {
		console.error('[AbsenceStorage] Error deleting from Supabase:', error);
		throw new Error(error.message || 'Failed to delete absence');
	}

	debugLog('Absence deleted successfully', { id });
}

export async function getAbsenceById(id: string): Promise<AbsenceRecord | undefined> {
	const { data, error } = await supabase
		.from('absences')
		.select('*, absence_types(id, label_key, is_recurring_allowed)')
		.eq('id', id)
		.single();

	if (error) {
		console.error('[AbsenceStorage] Error fetching absence by ID:', error);
		return undefined;
	}

	if (!data) return undefined;

	return {
		...data,
		absence_type_label: data.absence_types?.label_key || data.absence_type_id
	};
}

export async function getAbsencesForDate(userId: string, date: string): Promise<AbsenceRecord[]> {
	const { data, error } = await supabase
		.from('absences')
		.select('*, absence_types(id, label_key, is_recurring_allowed)')
		.eq('user_id', userId)
		.eq('entry_date', date);

	if (error) {
		console.error('[AbsenceStorage] Error fetching absences for date:', error);
		return [];
	}

	return data.map((record: any) => ({
		...record,
		absence_type_label: record.absence_types?.label_key || record.absence_type_id
	}));
}

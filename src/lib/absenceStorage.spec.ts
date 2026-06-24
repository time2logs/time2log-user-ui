import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createQueryChain } from '../tests/helpers/supabaseMock';
import { get } from 'svelte/store';

const { supabaseMock } = vi.hoisted(() => ({
	supabaseMock: { from: vi.fn() }
}));

vi.mock('./supabaseClient', () => ({ supabase: supabaseMock }));

import type { AbsenceRecord, AbsenceRow, AbsenceType } from './types';
import {
	absenceStore,
	absenceError,
	getAbsenceFractionForDate,
	isDateInAbsence
} from './absenceStorage';

beforeEach(() => {
	vi.clearAllMocks();
	supabaseMock.from.mockReturnValue(createQueryChain());
});

// ── Helpers ──────────────────────────────────────────────────────────────

function makeAbsence(overrides: Partial<AbsenceRecord> = {}): AbsenceRecord {
	return {
		id: 'abs-1',
		user_id: 'user-1',
		team_id: null,
		organization_id: 'org-1',
		absence_type_id: 'vacation' as AbsenceRecord['absence_type_id'],
		start_date: '2024-03-01',
		end_date: '2024-03-05',
		day_fraction: 1,
		is_recurring: false,
		rrule: null,
		notes: null,
		created_at: '2024-01-01T00:00:00Z',
		updated_at: '2024-01-01T00:00:00Z',
		absence_type_label: 'Vacation',
		...overrides
	};
}

function makeAbsenceRow(overrides: Partial<AbsenceRow> = {}): AbsenceRow {
	return {
		id: 'abs-1',
		user_id: 'user-1',
		team_id: null,
		organization_id: 'org-1',
		absence_type_id: 'vacation',
		start_date: '2024-06-24',
		end_date: '2024-06-24',
		day_fraction: 1,
		is_recurring: false,
		rrule: null,
		notes: null,
		created_at: '2024-06-24T10:00:00Z',
		updated_at: '2024-06-24T10:00:00Z',
		absence_types: { label_key: 'vacation', is_recurring_allowed: true },
		...overrides
	};
}

function makeAbsenceInput(overrides: Record<string, unknown> = {}) {
	const today = new Date().toISOString().slice(0, 10);
	return {
		organization_id: 'org-1',
		user_id: 'user-1',
		team_id: null,
		absence_type_id: 'vacation' as AbsenceType,
		start_date: today,
		end_date: today,
		day_fraction: 1,
		is_recurring: false,
		rrule: null,
		notes: null,
		...overrides
	};
}

// ── isDateInAbsence — fixed range ─────────────────────────────────────────

describe('isDateInAbsence — fixed range', () => {
	it('returns true for a date within the range', () => {
		const absence = makeAbsence({ start_date: '2024-03-01', end_date: '2024-03-05' });
		expect(isDateInAbsence('2024-03-03', absence)).toBe(true);
	});

	it('returns true on start_date (lower boundary)', () => {
		const absence = makeAbsence({ start_date: '2024-03-01', end_date: '2024-03-05' });
		expect(isDateInAbsence('2024-03-01', absence)).toBe(true);
	});

	it('returns true on end_date (upper boundary)', () => {
		const absence = makeAbsence({ start_date: '2024-03-01', end_date: '2024-03-05' });
		expect(isDateInAbsence('2024-03-05', absence)).toBe(true);
	});

	it('returns false for a date before start_date', () => {
		const absence = makeAbsence({ start_date: '2024-03-01', end_date: '2024-03-05' });
		expect(isDateInAbsence('2024-02-29', absence)).toBe(false);
	});

	it('returns false for a date after end_date', () => {
		const absence = makeAbsence({ start_date: '2024-03-01', end_date: '2024-03-05' });
		expect(isDateInAbsence('2024-03-06', absence)).toBe(false);
	});

	it('returns true for a single-day absence (start equals end)', () => {
		const absence = makeAbsence({ start_date: '2024-03-01', end_date: '2024-03-01' });
		expect(isDateInAbsence('2024-03-01', absence)).toBe(true);
	});
});

// ── isDateInAbsence — recurring (rrule) ───────────────────────────────────

describe('isDateInAbsence — recurring (rrule)', () => {
	const recurringAbsence = makeAbsence({
		start_date: '2024-01-01',
		end_date: '2024-01-01',
		is_recurring: true,
		rrule: 'FREQ=WEEKLY;BYDAY=MO'
	});

	it('returns true for a date matching the recurrence rule', () => {
		expect(isDateInAbsence('2024-01-08', recurringAbsence)).toBe(true);
	});

	it('returns true several recurrences later', () => {
		expect(isDateInAbsence('2024-01-22', recurringAbsence)).toBe(true);
	});

	it('returns false for a date that does not match the recurrence rule', () => {
		expect(isDateInAbsence('2024-01-09', recurringAbsence)).toBe(false);
	});

	it('returns false when is_recurring is false even with an rrule string', () => {
		const absence = makeAbsence({
			start_date: '2024-01-01',
			end_date: '2024-01-01',
			is_recurring: false,
			rrule: 'FREQ=WEEKLY;BYDAY=MO'
		});
		expect(isDateInAbsence('2024-01-08', absence)).toBe(false);
	});

	it('fails closed (returns true) for an invalid rrule string', () => {
		const absence = makeAbsence({
			start_date: '2024-01-01',
			end_date: '2024-01-01',
			is_recurring: true,
			rrule: 'NOT_A_VALID_RRULE'
		});
		expect(() => isDateInAbsence('2024-01-08', absence)).not.toThrow();
		expect(isDateInAbsence('2024-01-08', absence)).toBe(true);
	});
});

// ── getAbsenceFractionForDate ─────────────────────────────────────────────

describe('getAbsenceFractionForDate', () => {
	it('returns 1 for a full-day absence', () => {
		const absences = [
			makeAbsence({ day_fraction: 1, start_date: '2024-03-01', end_date: '2024-03-01' })
		];
		expect(getAbsenceFractionForDate('2024-03-01', absences)).toBe(1);
	});

	it('returns the stored fraction for a partial-day absence', () => {
		const absences = [
			makeAbsence({ day_fraction: 0.5, start_date: '2024-03-01', end_date: '2024-03-01' })
		];
		expect(getAbsenceFractionForDate('2024-03-01', absences)).toBe(0.5);
	});

	it('returns 0 when no absence applies to the date', () => {
		const absences = [
			makeAbsence({ day_fraction: 0.5, start_date: '2024-03-01', end_date: '2024-03-01' })
		];
		expect(getAbsenceFractionForDate('2024-03-02', absences)).toBe(0);
	});

	it('caps overlapping absences at 1', () => {
		const absences = [
			makeAbsence({
				id: 'abs-1',
				day_fraction: 0.6,
				start_date: '2024-03-01',
				end_date: '2024-03-01'
			}),
			makeAbsence({
				id: 'abs-2',
				day_fraction: 0.7,
				start_date: '2024-03-01',
				end_date: '2024-03-01'
			})
		];
		expect(getAbsenceFractionForDate('2024-03-01', absences)).toBe(1);
	});
});

// ── Store: add ────────────────────────────────────────────────────────────

describe('absenceStore.add', () => {
	it('inserts and returns the new absence on success', async () => {
		const row = makeAbsenceRow({ id: 'new-abs' });
		supabaseMock.from.mockReturnValue(createQueryChain({ data: row, error: null }));

		const result = await absenceStore.add(makeAbsenceInput());

		expect(result).not.toBeNull();
		expect(result!.id).toBe('new-abs');
		expect(result!.absence_type_label).toBe('vacation');
	});

	it('throws when supabase returns an error', async () => {
		supabaseMock.from.mockReturnValue(
			createQueryChain({ data: null, error: { message: 'Insert failed' } })
		);

		await expect(absenceStore.add(makeAbsenceInput())).rejects.toThrow('Insert failed');
	});

	it('prepends the new absence to the store', async () => {
		const row = makeAbsenceRow({ id: 'store-abs' });
		supabaseMock.from.mockReturnValue(createQueryChain({ data: row, error: null }));

		await absenceStore.add(makeAbsenceInput());

		const absences = get(absenceStore);
		expect(absences.find((a) => a.id === 'store-abs')).toBeDefined();
	});
});

// ── Store: delete ─────────────────────────────────────────────────────────

describe('absenceStore.delete', () => {
	it('returns true on successful delete', async () => {
		supabaseMock.from.mockReturnValue(createQueryChain({ data: null, error: null }));

		const result = await absenceStore.delete('nonexistent-id');
		expect(result).toBe(true);
	});

	it('throws edit window error when absence is older than 14 days', async () => {
		const oldRow = makeAbsenceRow({
			id: 'old-abs',
			start_date: '2020-01-01',
			end_date: '2020-01-01'
		});
		supabaseMock.from.mockReturnValue(createQueryChain({ data: oldRow, error: null }));
		await absenceStore.add(makeAbsenceInput({ start_date: '2020-01-01', end_date: '2020-01-01' }));

		await expect(absenceStore.delete('old-abs')).rejects.toThrow();
	});

	it('throws when supabase returns an error', async () => {
		supabaseMock.from.mockReturnValue(
			createQueryChain({ data: null, error: { message: 'Delete failed' } })
		);

		await expect(absenceStore.delete('some-id')).rejects.toThrow('Delete failed');
	});
});

// ── Store: update ─────────────────────────────────────────────────────────

describe('absenceStore.update', () => {
	it('returns updated absence on success', async () => {
		const row = makeAbsenceRow({ id: 'upd-abs', notes: 'Updated notes' });
		supabaseMock.from.mockReturnValue(createQueryChain({ data: row, error: null }));

		const result = await absenceStore.update('upd-abs', { notes: 'Updated notes' });

		expect(result).not.toBeNull();
		expect(result!.id).toBe('upd-abs');
		expect(result!.notes).toBe('Updated notes');
	});

	it('throws when supabase returns an error', async () => {
		supabaseMock.from.mockReturnValue(
			createQueryChain({ data: null, error: { message: 'Update failed' } })
		);

		await expect(absenceStore.update('some-id', { notes: 'x' })).rejects.toThrow('Update failed');
	});
});

// ── Store: load ───────────────────────────────────────────────────────────

describe('absenceStore.load', () => {
	it('loads absences from supabase into store', async () => {
		const rows = [makeAbsenceRow({ id: 'l-1' }), makeAbsenceRow({ id: 'l-2' })];
		supabaseMock.from.mockReturnValue(createQueryChain({ data: rows, error: null }));

		await absenceStore.load();

		const absences = get(absenceStore);
		expect(absences).toHaveLength(2);
		expect(absences[0].id).toBe('l-1');
	});

	it('handles empty data from supabase', async () => {
		supabaseMock.from.mockReturnValue(createQueryChain({ data: [], error: null }));

		await absenceStore.load();

		expect(get(absenceStore)).toEqual([]);
	});

	it('sets error store when supabase returns an error', async () => {
		supabaseMock.from.mockReturnValue(
			createQueryChain({ data: null, error: { message: 'Load failed' } })
		);

		await absenceStore.load();

		expect(get(absenceError)).toBe('Load failed');
	});

	it('skips when loadInFlight is already true (concurrent guard)', async () => {
		supabaseMock.from.mockReturnValue(createQueryChain({ data: [], error: null }));

		await Promise.all([absenceStore.load(), absenceStore.load()]);

		expect(supabaseMock.from).toHaveBeenCalledTimes(1);
	});
});

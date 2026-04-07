import { describe, expect, it, vi } from 'vitest';

vi.mock('./supabaseClient', () => ({ supabase: { from: vi.fn() } }));

import type { AbsenceRecord } from './types';
import { isDateInAbsence } from './absenceStorage';

function makeAbsence(overrides: Partial<AbsenceRecord> = {}): AbsenceRecord {
	return {
		id: 'abs-1',
		user_id: 'user-1',
		team_id: null,
		organization_id: 'org-1',
		absence_type_id: 'vacation' as AbsenceRecord['absence_type_id'],
		start_date: '2024-03-01',
		end_date: '2024-03-05',
		is_recurring: false,
		rrule: null,
		notes: null,
		created_at: '2024-01-01T00:00:00Z',
		updated_at: '2024-01-01T00:00:00Z',
		absence_type_label: 'Vacation',
		...overrides
	};
}

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

describe('isDateInAbsence — recurring (rrule)', () => {
	// 2024-01-01 is a Monday. FREQ=WEEKLY;BYDAY=MO recurs every Monday.
	const recurringAbsence = makeAbsence({
		start_date: '2024-01-01',
		end_date: '2024-01-01',
		is_recurring: true,
		rrule: 'FREQ=WEEKLY;BYDAY=MO'
	});

	it('returns true for a date matching the recurrence rule', () => {
		// 2024-01-08 is the next Monday after start
		expect(isDateInAbsence('2024-01-08', recurringAbsence)).toBe(true);
	});

	it('returns true several recurrences later', () => {
		// 2024-01-22 is also a Monday
		expect(isDateInAbsence('2024-01-22', recurringAbsence)).toBe(true);
	});

	it('returns false for a date that does not match the recurrence rule', () => {
		// 2024-01-09 is a Tuesday
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

	it('returns false for an invalid rrule string (does not throw)', () => {
		const absence = makeAbsence({
			start_date: '2024-01-01',
			end_date: '2024-01-01',
			is_recurring: true,
			rrule: 'NOT_A_VALID_RRULE'
		});
		expect(() => isDateInAbsence('2024-01-08', absence)).not.toThrow();
		expect(isDateInAbsence('2024-01-08', absence)).toBe(false);
	});
});

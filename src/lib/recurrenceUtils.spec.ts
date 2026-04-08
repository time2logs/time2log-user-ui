import { describe, expect, it } from 'vitest';
import { generateRecurrenceDates, getWeekdayLabels } from './recurrenceUtils';

// 2024-01-01 is a Monday (getDay() === 1)
const MONDAY = '2024-01-01';

describe('getWeekdayLabels', () => {
	it('returns 7 entries', () => {
		expect(getWeekdayLabels()).toHaveLength(7);
	});

	it('starts with Sunday (value 0) and ends with Saturday (value 6)', () => {
		const labels = getWeekdayLabels();
		expect(labels[0]).toEqual({ value: 0, short: 'Sun', long: 'Sunday' });
		expect(labels[6]).toEqual({ value: 6, short: 'Sat', long: 'Saturday' });
	});

	it('every entry has value, short, and long properties', () => {
		for (const entry of getWeekdayLabels()) {
			expect(entry).toHaveProperty('value');
			expect(entry).toHaveProperty('short');
			expect(entry).toHaveProperty('long');
		}
	});

	it('values are unique and ordered 0–6', () => {
		const values = getWeekdayLabels().map((e) => e.value);
		expect(values).toEqual([0, 1, 2, 3, 4, 5, 6]);
	});

	it('returns a new array on each call', () => {
		expect(getWeekdayLabels()).not.toBe(getWeekdayLabels());
	});
});

describe('generateRecurrenceDates', () => {
	describe('weekly frequency', () => {
		it('produces dates exactly 7 days apart', () => {
			const dates = generateRecurrenceDates(MONDAY, {
				frequency: 'weekly',
				days: [],
				until: '2024-01-29'
			});
			expect(dates).toEqual(['2024-01-01', '2024-01-08', '2024-01-15', '2024-01-22', '2024-01-29']);
		});

		it('includes the until date when it falls on a recurrence', () => {
			const dates = generateRecurrenceDates(MONDAY, {
				frequency: 'weekly',
				days: [],
				until: '2024-01-08'
			});
			expect(dates).toContain('2024-01-08');
		});

		it('excludes dates after until', () => {
			const dates = generateRecurrenceDates(MONDAY, {
				frequency: 'weekly',
				days: [],
				until: '2024-01-08'
			});
			expect(dates).not.toContain('2024-01-15');
		});
	});

	describe('biweekly frequency', () => {
		it('produces dates exactly 14 days apart', () => {
			const dates = generateRecurrenceDates(MONDAY, {
				frequency: 'biweekly',
				days: [],
				until: '2024-01-31'
			});
			expect(dates).toEqual(['2024-01-01', '2024-01-15', '2024-01-29']);
		});
	});

	describe('monthly frequency', () => {
		it('produces dates one calendar month apart', () => {
			const dates = generateRecurrenceDates(MONDAY, {
				frequency: 'monthly',
				days: [],
				until: '2024-04-01'
			});
			expect(dates).toEqual(['2024-01-01', '2024-02-01', '2024-03-01', '2024-04-01']);
		});
	});

	describe('days filter', () => {
		it('only includes dates whose weekday is in the days array', () => {
			// Start is Monday (1). Weekly = always Monday. Filter for Monday: all match.
			const dates = generateRecurrenceDates(MONDAY, {
				frequency: 'weekly',
				days: [1],
				until: '2024-01-22'
			});
			expect(dates).toEqual(['2024-01-01', '2024-01-08', '2024-01-15', '2024-01-22']);
		});

		it('returns empty array when no iteration matches the days filter', () => {
			// Start is Monday (1). Weekly = always Monday. Filter for Wednesday (3): nothing matches.
			const dates = generateRecurrenceDates(MONDAY, {
				frequency: 'weekly',
				days: [3],
				until: '2024-01-31'
			});
			expect(dates).toEqual([]);
		});

		it('includes all dates when days array is empty', () => {
			const dates = generateRecurrenceDates(MONDAY, {
				frequency: 'weekly',
				days: [],
				until: '2024-01-15'
			});
			expect(dates).toHaveLength(3);
		});
	});

	describe('maxFutureDates limit', () => {
		it('caps the result at maxFutureDates', () => {
			const dates = generateRecurrenceDates(
				MONDAY,
				{ frequency: 'weekly', days: [], until: '2026-01-01' },
				3
			);
			expect(dates).toHaveLength(3);
		});

		it('defaults to a limit of 52', () => {
			// 2 years of weekly dates would be ~104 entries; expect cap at 52
			const dates = generateRecurrenceDates(MONDAY, {
				frequency: 'weekly',
				days: [],
				until: '2026-01-01'
			});
			expect(dates).toHaveLength(52);
		});
	});

	describe('edge cases', () => {
		it('returns empty array when start is after until', () => {
			const dates = generateRecurrenceDates('2024-02-01', {
				frequency: 'weekly',
				days: [],
				until: '2024-01-01'
			});
			expect(dates).toEqual([]);
		});

		it('returns a single date when start equals until', () => {
			const dates = generateRecurrenceDates(MONDAY, {
				frequency: 'weekly',
				days: [],
				until: MONDAY
			});
			expect(dates).toEqual([MONDAY]);
		});

		it('all returned strings are in YYYY-MM-DD format', () => {
			const dates = generateRecurrenceDates(MONDAY, {
				frequency: 'weekly',
				days: [],
				until: '2024-01-31'
			});
			for (const d of dates) {
				expect(d).toMatch(/^\d{4}-\d{2}-\d{2}$/);
			}
		});
	});
});

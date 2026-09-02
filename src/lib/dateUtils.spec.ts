import { describe, expect, it } from 'vitest';
import {
	addDays,
	countWeekdaysInRange,
	expandAbsenceDates,
	isWeekendIsoDate,
	isoFromDate,
	iterateDates,
	parseIsoDate,
	semesterKeyForIsoDate,
	type ExpandableAbsence
} from './dateUtils';

function makeAbsence(overrides: Partial<ExpandableAbsence> = {}): ExpandableAbsence {
	return {
		start_date: '2024-09-02',
		end_date: '2024-09-06',
		is_recurring: false,
		rrule: null,
		...overrides
	};
}

describe('parseIsoDate / isoFromDate', () => {
	it('round-trips an ISO date', () => {
		expect(isoFromDate(parseIsoDate('2024-02-29'))).toBe('2024-02-29');
	});
});

describe('isWeekendIsoDate', () => {
	it('returns true for Saturday and Sunday', () => {
		expect(isWeekendIsoDate('2024-09-01')).toBe(true);
		expect(isWeekendIsoDate('2024-09-07')).toBe(true);
	});

	it('returns false for weekdays', () => {
		expect(isWeekendIsoDate('2024-09-02')).toBe(false);
		expect(isWeekendIsoDate('2024-09-06')).toBe(false);
	});
});

describe('addDays', () => {
	it('crosses month and year boundaries', () => {
		expect(addDays('2024-01-31', 1)).toBe('2024-02-01');
		expect(addDays('2024-12-31', 1)).toBe('2025-01-01');
	});

	it('supports negative deltas', () => {
		expect(addDays('2024-03-01', -1)).toBe('2024-02-29');
	});
});

describe('iterateDates', () => {
	it('yields an inclusive date range', () => {
		expect([...iterateDates('2024-09-02', '2024-09-04')]).toEqual([
			'2024-09-02',
			'2024-09-03',
			'2024-09-04'
		]);
	});

	it('yields nothing when the end precedes the start', () => {
		expect([...iterateDates('2024-09-04', '2024-09-02')]).toEqual([]);
	});
});

describe('countWeekdaysInRange', () => {
	it('counts weekdays in a full calendar week', () => {
		expect(countWeekdaysInRange('2024-09-02', '2024-09-08')).toBe(5);
	});

	it('returns zero for a weekend-only range', () => {
		expect(countWeekdaysInRange('2024-09-07', '2024-09-08')).toBe(0);
	});
});

describe('semesterKeyForIsoDate', () => {
	it('assigns August–December to S1 of that year', () => {
		expect(semesterKeyForIsoDate('2024-08-01')).toBe('2024/S1');
		expect(semesterKeyForIsoDate('2024-12-31')).toBe('2024/S1');
	});

	it('assigns January–July to S2 of the previous year', () => {
		expect(semesterKeyForIsoDate('2024-01-15')).toBe('2023/S2');
		expect(semesterKeyForIsoDate('2024-07-31')).toBe('2023/S2');
	});
});

describe('expandAbsenceDates', () => {
	it('expands a fixed range and excludes weekends', () => {
		expect(
			expandAbsenceDates(makeAbsence({ start_date: '2024-09-02', end_date: '2024-09-08' }))
		).toEqual(['2024-09-02', '2024-09-03', '2024-09-04', '2024-09-05', '2024-09-06']);
	});

	it('returns no dates for a weekend-only range', () => {
		expect(
			expandAbsenceDates(makeAbsence({ start_date: '2024-09-07', end_date: '2024-09-08' }))
		).toEqual([]);
	});

	it('expands a recurring rule up to its UNTIL date', () => {
		const absence = makeAbsence({
			start_date: '2024-09-02',
			end_date: '2024-09-02',
			is_recurring: true,
			rrule: 'DTSTART:20240902T000000Z\nFREQ=WEEKLY;BYDAY=MO;UNTIL=20240923T235959Z'
		});
		expect(expandAbsenceDates(absence)).toEqual([
			'2024-09-02',
			'2024-09-09',
			'2024-09-16',
			'2024-09-23'
		]);
	});

	it('skips weekends for a daily recurring rule', () => {
		const absence = makeAbsence({
			start_date: '2024-09-02',
			end_date: '2024-09-02',
			is_recurring: true,
			rrule: 'DTSTART:20240902T000000Z\nFREQ=DAILY;UNTIL=20240909T235959Z'
		});
		expect(expandAbsenceDates(absence)).toEqual([
			'2024-09-02',
			'2024-09-03',
			'2024-09-04',
			'2024-09-05',
			'2024-09-06',
			'2024-09-09'
		]);
	});

	it('caps an unbounded recurring rule at 365 days past today', () => {
		const absence = makeAbsence({
			start_date: '2024-09-02',
			end_date: '2024-09-02',
			is_recurring: true,
			rrule: 'DTSTART:20240902T000000Z\nFREQ=WEEKLY;BYDAY=MO'
		});
		const dates = expandAbsenceDates(absence, '2024-09-03');
		expect(dates).toHaveLength(53);
		expect(dates[0]).toBe('2024-09-02');
		expect(dates[dates.length - 1]).toBe('2025-09-01');
	});

	it('returns no dates for an invalid rrule', () => {
		const absence = makeAbsence({
			start_date: '2024-09-02',
			end_date: '2024-09-02',
			is_recurring: true,
			rrule: 'not-an-rrule'
		});
		expect(expandAbsenceDates(absence)).toEqual([]);
	});
});

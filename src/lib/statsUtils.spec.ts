import { describe, expect, it } from 'vitest';
import type { ActivityRecord } from './types';
import {
	getMondayOfWeek,
	isoFromDate,
	computeHoursThisWeek,
	computeTotalHours,
	computeActiveDaysThisMonth,
	computeActivityBreakdown,
	computeWeeklyData
} from './statsUtils';

function makeActivity(entry_date: string, hours: number, activity_name = 'Task'): ActivityRecord {
	return {
		id: `${entry_date}-${activity_name}`,
		organization_id: 'org-1',
		profession_id: 'prof-1',
		user_id: 'user-1',
		team_id: null,
		curriculum_activity_id: 'act-1',
		entry_date,
		hours,
		notes: null,
		rating: null,
		location: '',
		created_at: `${entry_date}T10:00:00Z`,
		updated_at: `${entry_date}T10:00:00Z`,
		activity_name,
		activity_key: activity_name.toLowerCase(),
		activity_label: ''
	};
}

// ── getMondayOfWeek ───────────────────────────────────────────────────────────

describe('getMondayOfWeek', () => {
	it('returns the same date when the input is already a Monday', () => {
		// 2024-01-01 is a Monday — use local noon to avoid DST/tz edge cases
		const monday = new Date(2024, 0, 1, 12, 0, 0);
		expect(isoFromDate(getMondayOfWeek(monday))).toBe('2024-01-01');
	});

	it('returns the preceding Monday for a Wednesday', () => {
		// 2024-01-03 is a Wednesday
		const wednesday = new Date(2024, 0, 3, 12, 0, 0);
		expect(isoFromDate(getMondayOfWeek(wednesday))).toBe('2024-01-01');
	});

	it('returns the preceding Monday for a Sunday', () => {
		// 2024-01-07 is a Sunday — should go back 6 days
		const sunday = new Date(2024, 0, 7, 12, 0, 0);
		expect(isoFromDate(getMondayOfWeek(sunday))).toBe('2024-01-01');
	});

	it('returns the preceding Monday for a Saturday', () => {
		// 2024-01-06 is a Saturday
		const saturday = new Date(2024, 0, 6, 12, 0, 0);
		expect(isoFromDate(getMondayOfWeek(saturday))).toBe('2024-01-01');
	});

	it('sets the time to midnight', () => {
		const wednesday = new Date(2024, 0, 3, 15, 30, 0);
		const monday = getMondayOfWeek(wednesday);
		expect(monday.getHours()).toBe(0);
		expect(monday.getMinutes()).toBe(0);
		expect(monday.getSeconds()).toBe(0);
	});
});

// ── isoFromDate ───────────────────────────────────────────────────────────────

describe('isoFromDate', () => {
	it('returns YYYY-MM-DD format', () => {
		expect(isoFromDate(new Date(2024, 2, 15))).toMatch(/^\d{4}-\d{2}-\d{2}$/);
	});

	it('returns the correct local date string regardless of time', () => {
		expect(isoFromDate(new Date(2024, 5, 1, 0, 0, 0))).toBe('2024-06-01');
		expect(isoFromDate(new Date(2024, 5, 1, 23, 59, 59))).toBe('2024-06-01');
	});
});

// ── computeTotalHours ─────────────────────────────────────────────────────────

describe('computeTotalHours', () => {
	it('returns 0 for an empty activities list', () => {
		expect(computeTotalHours([])).toBe(0);
	});

	it('sums all activity hours', () => {
		const activities = [
			makeActivity('2024-01-01', 3),
			makeActivity('2024-01-02', 5),
			makeActivity('2024-01-03', 2)
		];
		expect(computeTotalHours(activities)).toBe(10);
	});
});

// ── computeHoursThisWeek ──────────────────────────────────────────────────────

describe('computeHoursThisWeek', () => {
	// Week of 2024-01-01 (Mon) → 2024-01-07 (Sun)
	const today = new Date(2024, 0, 3, 12, 0, 0); // Wednesday Jan 3, local noon

	it('returns 0 when there are no activities', () => {
		expect(computeHoursThisWeek([], today)).toBe(0);
	});

	it('includes activities from Monday of the current week through today', () => {
		const activities = [
			makeActivity('2024-01-01', 4), // Monday — in week
			makeActivity('2024-01-02', 3), // Tuesday — in week
			makeActivity('2024-01-03', 2) // Wednesday (today) — in week
		];
		expect(computeHoursThisWeek(activities, today)).toBe(9);
	});

	it('excludes activities from the previous week', () => {
		const activities = [makeActivity('2023-12-31', 8)]; // Sunday before the week
		expect(computeHoursThisWeek(activities, today)).toBe(0);
	});

	it('excludes activities after today', () => {
		const activities = [makeActivity('2024-01-04', 6)]; // Thursday — future
		expect(computeHoursThisWeek(activities, today)).toBe(0);
	});
});

// ── computeActiveDaysThisMonth ────────────────────────────────────────────────

describe('computeActiveDaysThisMonth', () => {
	const today = new Date(2024, 2, 15, 12, 0, 0); // March 15, local noon

	it('returns 0 when there are no activities', () => {
		expect(computeActiveDaysThisMonth([], today)).toBe(0);
	});

	it('counts distinct active days in the current month', () => {
		const activities = [
			makeActivity('2024-03-01', 4),
			makeActivity('2024-03-01', 3), // same day — should not double-count
			makeActivity('2024-03-10', 2)
		];
		expect(computeActiveDaysThisMonth(activities, today)).toBe(2);
	});

	it('excludes days in a different month', () => {
		const activities = [
			makeActivity('2024-02-28', 5), // previous month
			makeActivity('2024-04-01', 3) // next month
		];
		expect(computeActiveDaysThisMonth(activities, today)).toBe(0);
	});
});

// ── computeActivityBreakdown ──────────────────────────────────────────────────

describe('computeActivityBreakdown', () => {
	it('returns an empty array when there are no activities', () => {
		expect(computeActivityBreakdown([])).toEqual([]);
	});

	it('sums hours for the same activity name', () => {
		const activities = [
			makeActivity('2024-01-01', 3, 'Coding'),
			makeActivity('2024-01-02', 5, 'Coding')
		];
		const result = computeActivityBreakdown(activities);
		expect(result[0]).toEqual({ name: 'Coding', hours: 8 });
	});

	it('sorts activities by hours descending', () => {
		const activities = [
			makeActivity('2024-01-01', 2, 'Alpha'),
			makeActivity('2024-01-01', 8, 'Beta'),
			makeActivity('2024-01-01', 5, 'Gamma')
		];
		const names = computeActivityBreakdown(activities).map((s) => s.name);
		expect(names).toEqual(['Beta', 'Gamma', 'Alpha']);
	});

	it('groups activities beyond topN into an "Other" entry', () => {
		const activities = [
			makeActivity('2024-01-01', 10, 'A'),
			makeActivity('2024-01-01', 8, 'B'),
			makeActivity('2024-01-01', 6, 'C'),
			makeActivity('2024-01-01', 4, 'D'),
			makeActivity('2024-01-01', 2, 'E'),
			makeActivity('2024-01-01', 1, 'F') // this one goes to Other
		];
		const result = computeActivityBreakdown(activities, 5, 'Other');
		expect(result).toHaveLength(6);
		expect(result[5]).toEqual({ name: 'Other', hours: 1 });
	});

	it('does not add an Other entry when all activities fit within topN', () => {
		const activities = [makeActivity('2024-01-01', 5, 'A'), makeActivity('2024-01-01', 3, 'B')];
		const result = computeActivityBreakdown(activities, 5);
		expect(result.every((s) => s.name !== 'Other')).toBe(true);
	});

	it('respects a custom topN limit', () => {
		const activities = [
			makeActivity('2024-01-01', 5, 'A'),
			makeActivity('2024-01-01', 4, 'B'),
			makeActivity('2024-01-01', 3, 'C')
		];
		const result = computeActivityBreakdown(activities, 2, 'Sonstige');
		expect(result[0].name).toBe('A');
		expect(result[1].name).toBe('B');
		expect(result[2]).toEqual({ name: 'Sonstige', hours: 3 });
	});
});

// ── computeWeeklyData ─────────────────────────────────────────────────────────

describe('computeWeeklyData', () => {
	// 2024-01-10 is a Wednesday; its week is Mon 2024-01-08 → Sun 2024-01-14
	const today = new Date(2024, 0, 10, 12, 0, 0); // Jan 10, local noon

	it('returns weeksBack + 1 entries', () => {
		const result = computeWeeklyData([], today, 3);
		expect(result).toHaveLength(4); // 3 past weeks + current
	});

	it('defaults to 8 entries (7 past weeks + current)', () => {
		const result = computeWeeklyData([], today);
		expect(result).toHaveLength(8);
	});

	it('orders entries oldest to newest', () => {
		const result = computeWeeklyData([], today, 2);
		expect(result[0].weekStart < result[1].weekStart).toBe(true);
		expect(result[1].weekStart < result[2].weekStart).toBe(true);
	});

	it('correctly sums hours for activities within each week', () => {
		const activities = [
			makeActivity('2024-01-08', 4), // current week (Mon)
			makeActivity('2024-01-10', 3), // current week (Wed = today)
			makeActivity('2024-01-01', 5) // previous week
		];
		const result = computeWeeklyData(activities, today, 1);
		// result[0] = week of 2024-01-01, result[1] = week of 2024-01-08
		expect(result[1].hours).toBe(7); // current week
		expect(result[0].hours).toBe(5); // previous week
	});

	it('reports 0 hours for weeks with no activities', () => {
		const result = computeWeeklyData([], today, 1);
		expect(result[0].hours).toBe(0);
		expect(result[1].hours).toBe(0);
	});

	it('the last entry weekStart is the Monday of the week containing today', () => {
		const result = computeWeeklyData([], today, 1);
		// Monday of 2024-01-10's week is 2024-01-08
		expect(result[result.length - 1].weekStart).toBe('2024-01-08');
	});
});

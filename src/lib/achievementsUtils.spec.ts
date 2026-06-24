import { describe, expect, it } from 'vitest';
import type { ActivityRecord, AbsenceRecord } from './types';
import {
	computeSickDays,
	computeLevel,
	computeTopLocations,
	computeCurrentStreak,
	computeAchievements
} from './achievementsUtils';

function makeActivity(overrides: Partial<ActivityRecord> = {}): ActivityRecord {
	return {
		id: 'act-1',
		organization_id: 'org-1',
		profession_id: 'prof-1',
		user_id: 'user-1',
		team_id: 'team-1',
		curriculum_activity_id: 'curr-1',
		entry_date: '2024-06-01',
		hours: 2,
		notes: null,
		rating: null,
		location: '',
		created_at: '2024-06-01T00:00:00Z',
		updated_at: '2024-06-01T00:00:00Z',
		activity_name: 'Test Activity',
		activity_key: 'T1',
		activity_label: '',
		...overrides
	};
}

function makeAbsence(overrides: Partial<AbsenceRecord> = {}): AbsenceRecord {
	return {
		id: 'abs-1',
		user_id: 'user-1',
		team_id: 'team-1',
		organization_id: 'org-1',
		absence_type_id: 'sick',
		start_date: '2024-06-01',
		end_date: '2024-06-01',
		day_fraction: 1,
		is_recurring: false,
		rrule: null,
		notes: null,
		created_at: '2024-06-01T00:00:00Z',
		updated_at: '2024-06-01T00:00:00Z',
		absence_type_label: 'sick',
		...overrides
	};
}

describe('computeSickDays', () => {
	it('returns 0 when no absences', () => {
		expect(computeSickDays([], '2024-01-01', '2024-12-31')).toBe(0);
	});

	it('returns 0 when no sick absences', () => {
		const absence = makeAbsence({ absence_type_id: 'vacation' });
		expect(computeSickDays([absence], '2024-01-01', '2024-12-31')).toBe(0);
	});

	it('counts a single full-day sick absence', () => {
		const absence = makeAbsence({ start_date: '2024-06-03', end_date: '2024-06-03' });
		expect(computeSickDays([absence], '2024-01-01', '2024-12-31')).toBe(1);
	});

	it('counts multiple sick days across a range (regression: was capped at 1)', () => {
		const absence = makeAbsence({ start_date: '2024-06-03', end_date: '2024-06-07' });
		expect(computeSickDays([absence], '2024-01-01', '2024-12-31')).toBe(5);
	});

	it('counts multiple separate sick absences', () => {
		const a1 = makeAbsence({ id: 'a1', start_date: '2024-06-03', end_date: '2024-06-03' });
		const a2 = makeAbsence({ id: 'a2', start_date: '2024-06-10', end_date: '2024-06-12' });
		expect(computeSickDays([a1, a2], '2024-01-01', '2024-12-31')).toBe(4);
	});

	it('respects day_fraction', () => {
		const absence = makeAbsence({
			start_date: '2024-06-03',
			end_date: '2024-06-03',
			day_fraction: 0.5
		});
		expect(computeSickDays([absence], '2024-01-01', '2024-12-31')).toBe(0.5);
	});

	it('skips weekends', () => {
		const absence = makeAbsence({ start_date: '2024-06-01', end_date: '2024-06-09' });
		expect(computeSickDays([absence], '2024-01-01', '2024-12-31')).toBe(5);
	});

	it('clamps to the from/to window', () => {
		const absence = makeAbsence({ start_date: '2024-06-01', end_date: '2024-06-30' });
		expect(computeSickDays([absence], '2024-06-01', '2024-06-07')).toBe(5);
	});
});

describe('computeLevel', () => {
	it('returns level 1 at 0 hours', () => {
		expect(computeLevel(0).level).toBe(1);
	});

	it('returns level 1 at 9 hours', () => {
		expect(computeLevel(9).level).toBe(1);
	});

	it('returns level 2 at 10 hours', () => {
		expect(computeLevel(10).level).toBe(2);
	});

	it('returns level 4 at 90 hours', () => {
		expect(computeLevel(90).level).toBe(4);
	});

	it('clamps negative hours to 0', () => {
		const info = computeLevel(-50);
		expect(info.level).toBe(1);
		expect(info.xpInLevel).toBe(0);
	});

	it('progress is between 0 and 1', () => {
		const info = computeLevel(45);
		expect(info.progress).toBeGreaterThanOrEqual(0);
		expect(info.progress).toBeLessThanOrEqual(1);
	});
});

describe('computeTopLocations', () => {
	it('returns empty array for no activities', () => {
		expect(computeTopLocations([], 5)).toEqual([]);
	});

	it('aggregates hours by location', () => {
		const activities = [
			makeActivity({ id: '1', location: 'Office', hours: 2 }),
			makeActivity({ id: '2', location: 'Office', hours: 3 }),
			makeActivity({ id: '3', location: 'Home', hours: 4 })
		];
		const result = computeTopLocations(activities, 5);
		expect(result).toEqual([
			{ location: 'Office', hours: 5 },
			{ location: 'Home', hours: 4 }
		]);
	});

	it('limits to topCount', () => {
		const activities = [
			makeActivity({ id: '1', location: 'A', hours: 1 }),
			makeActivity({ id: '2', location: 'B', hours: 2 }),
			makeActivity({ id: '3', location: 'C', hours: 3 })
		];
		expect(computeTopLocations(activities, 2)).toHaveLength(2);
		expect(computeTopLocations(activities, 2)[0].location).toBe('C');
	});

	it('skips empty locations', () => {
		const activities = [
			makeActivity({ id: '1', location: '', hours: 2 }),
			makeActivity({ id: '2', location: '  ', hours: 1 })
		];
		expect(computeTopLocations(activities, 5)).toEqual([]);
	});
});

describe('computeCurrentStreak', () => {
	it('returns 0 with no activities', () => {
		expect(computeCurrentStreak([], [], '2024-06-05')).toBe(0);
	});

	it('counts consecutive days ending today', () => {
		const activities = [
			makeActivity({ id: '1', entry_date: '2024-06-05' }),
			makeActivity({ id: '2', entry_date: '2024-06-04' }),
			makeActivity({ id: '3', entry_date: '2024-06-03' })
		];
		expect(computeCurrentStreak(activities, [], '2024-06-05')).toBe(3);
	});

	it('breaks on a gap', () => {
		const activities = [
			makeActivity({ id: '1', entry_date: '2024-06-05' }),
			makeActivity({ id: '2', entry_date: '2024-06-03' })
		];
		expect(computeCurrentStreak(activities, [], '2024-06-05')).toBe(1);
	});

	it('skips weekends in the streak', () => {
		const activities = [
			makeActivity({ id: '1', entry_date: '2024-06-10' }),
			makeActivity({ id: '2', entry_date: '2024-06-07' })
		];
		expect(computeCurrentStreak(activities, [], '2024-06-10')).toBe(2);
	});
});

describe('computeAchievements', () => {
	it('unlocks first_log with 1 activity', () => {
		const result = computeAchievements([makeActivity()], [], '2024-06-05');
		const firstLog = result.find((a) => a.id === 'first_log');
		expect(firstLog?.unlocked).toBe(true);
	});

	it('does not unlock first_log with 0 activities', () => {
		const result = computeAchievements([], [], '2024-06-05');
		const firstLog = result.find((a) => a.id === 'first_log');
		expect(firstLog?.unlocked).toBe(false);
	});

	it('unlocks 250_hours at 250 total hours', () => {
		const activities = [makeActivity({ hours: 250 })];
		const result = computeAchievements(activities, [], '2024-06-05');
		const ach = result.find((a) => a.id === '250_hours');
		expect(ach?.unlocked).toBe(true);
	});

	it('progress is clamped to 1', () => {
		const activities = [makeActivity({ hours: 2000 })];
		const result = computeAchievements(activities, [], '2024-06-05');
		const ach = result.find((a) => a.id === '250_hours');
		expect(ach?.progress).toBe(1);
	});
});

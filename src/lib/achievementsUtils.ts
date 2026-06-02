import type { ActivityRecord, AbsenceRecord } from './types';
import { isDateInAbsence } from './absenceStorage';
import { isoFromDate } from './statsUtils';

export type AchievementUnit = 'hours' | 'days' | 'count' | 'streak';
export type AchievementStatus = {
	id: string;
	labelKey: string;
	descriptionKey: string;
	icon: string;
	threshold: number;
	current: number;
	unlocked: boolean;
	progress: number;
	unit: AchievementUnit;
};
export type LevelInfo = { level: number; xpInLevel: number; xpForNext: number; progress: number };

const SUNDAY = 0;
const SATURDAY = 6;
function parseIsoDate(iso: string): Date {
	const [y, m, d] = iso.split('-').map(Number);
	return new Date(y, m - 1, d);
}
function isWeekend(date: Date): boolean {
	const d = date.getDay();
	return d === SUNDAY || d === SATURDAY;
}
export function addDays(iso: string, delta: number): string {
	const d = parseIsoDate(iso);
	d.setDate(d.getDate() + delta);
	return isoFromDate(d);
}
export function subtractYears(iso: string, delta: number): string {
	const d = parseIsoDate(iso);
	d.setFullYear(d.getFullYear() - delta);
	return isoFromDate(d);
}
function* iterateDates(fromIso: string, toIso: string): Generator<string> {
	if (toIso < fromIso) return;
	let c = fromIso;
	while (c <= toIso) {
		yield c;
		c = addDays(c, 1);
	}
}

function blockedDates(absences: AbsenceRecord[], fromIso: string, toIso: string): Set<string> {
	const blocked = new Set<string>();
	for (const a of absences) {
		if (a.is_recurring && a.rrule) {
			for (const d of iterateDates(fromIso, toIso)) {
				if (isDateInAbsence(d, a)) blocked.add(d);
			}
			continue;
		}
		const s = a.start_date > fromIso ? a.start_date : fromIso;
		const e = a.end_date < toIso ? a.end_date : toIso;
		for (const d of iterateDates(s, e)) blocked.add(d);
	}
	return blocked;
}

export function computeCurrentStreak(
	activities: ActivityRecord[],
	absences: AbsenceRecord[],
	todayIso: string
): number {
	const dates = new Set(activities.map((a) => a.entry_date));
	if (dates.size === 0) return 0;
	const lookback = subtractYears(todayIso, 10);
	const blocked = blockedDates(absences, lookback, todayIso);
	let streak = 0,
		cursor = todayIso;
	while (cursor >= lookback) {
		if (!isWeekend(parseIsoDate(cursor)) && !blocked.has(cursor)) {
			if (dates.has(cursor)) streak++;
			else break;
		}
		cursor = addDays(cursor, -1);
	}
	return streak;
}

export function computeLongestStreak(
	activities: ActivityRecord[],
	absences: AbsenceRecord[],
	todayIso: string
): number {
	if (activities.length === 0) return 0;
	const dates = new Set(activities.map((a) => a.entry_date));
	const first = [...dates].reduce((min, d) => (d < min ? d : min), todayIso);
	const blocked = blockedDates(absences, first, todayIso);
	let longest = 0,
		current = 0;
	for (const d of iterateDates(first, todayIso)) {
		if (isWeekend(parseIsoDate(d)) || blocked.has(d)) continue;
		if (dates.has(d)) {
			current++;
			if (current > longest) longest = current;
		} else current = 0;
	}
	return longest;
}

export function computeLevel(totalHours: number): LevelInfo {
	const h = Math.max(0, totalHours);
	const level = Math.floor(Math.sqrt(h / 10)) + 1;
	const curStart = 10 * (level - 1) ** 2;
	const nextStart = 10 * level ** 2;
	const xpInLevel = Math.round((h - curStart) * 100) / 100;
	const xpForNext = Math.round((nextStart - curStart) * 100) / 100;
	return {
		level,
		xpInLevel,
		xpForNext,
		progress: xpForNext > 0 ? Math.min(1, xpInLevel / xpForNext) : 0
	};
}

export type LocationStat = { location: string; hours: number };
export function computeTopLocations(activities: ActivityRecord[], topN: number): LocationStat[] {
	const map = new Map<string, number>();
	for (const a of activities) {
		const loc = (a.location ?? '').trim();
		if (loc) map.set(loc, (map.get(loc) ?? 0) + a.hours);
	}
	return [...map.entries()]
		.sort(([, a], [, b]) => b - a)
		.slice(0, topN)
		.map(([location, hours]) => ({ location, hours: Math.round(hours * 10) / 10 }));
}

export function computeSickDays(absences: AbsenceRecord[], fromIso: string, toIso: string): number {
	let total = 0;
	for (const a of absences.filter((a) => a.absence_type_id === 'sick')) {
		const frac = Number(a.day_fraction ?? 1);
		const s = a.start_date > fromIso ? a.start_date : fromIso;
		const e = a.end_date < toIso ? a.end_date : toIso;
		if (a.is_recurring && a.rrule) {
			for (const d of iterateDates(fromIso, toIso)) {
				if (!isWeekend(parseIsoDate(d)) && isDateInAbsence(d, a)) total = Math.min(1, total + frac);
			}
			continue;
		}
		for (const d of iterateDates(s, e)) {
			if (!isWeekend(parseIsoDate(d))) total = Math.min(1, total + frac);
		}
	}
	return Math.round(total * 100) / 100;
}

export function computeAchievements(
	activities: ActivityRecord[],
	absences: AbsenceRecord[],
	todayIso: string
): AchievementStatus[] {
	const totalHours = activities.reduce((s, a) => s + a.hours, 0);
	const longestStreak = computeLongestStreak(activities, absences, todayIso);
	const defs: Array<Omit<AchievementStatus, 'unlocked' | 'progress'>> = [
		{
			id: 'first_log',
			labelKey: 'ach_first_log',
			descriptionKey: 'ach_first_log_desc',
			icon: 'Sparkles',
			threshold: 1,
			current: activities.length,
			unit: 'count'
		},
		{
			id: '250_hours',
			labelKey: 'ach_250_hours',
			descriptionKey: 'ach_250_hours_desc',
			icon: 'Clock',
			threshold: 250,
			current: totalHours,
			unit: 'hours'
		},
		{
			id: 'streak_15',
			labelKey: 'ach_streak_15',
			descriptionKey: 'ach_streak_15_desc',
			icon: 'Flame',
			threshold: 15,
			current: longestStreak,
			unit: 'streak'
		},
		{
			id: 'thousand_hours',
			labelKey: 'ach_thousand_hours',
			descriptionKey: 'ach_thousand_hours_desc',
			icon: 'Crown',
			threshold: 1000,
			current: totalHours,
			unit: 'hours'
		}
	];
	return defs.map((d) => ({
		...d,
		unlocked: d.current >= d.threshold,
		progress: Math.min(1, d.current / d.threshold)
	}));
}

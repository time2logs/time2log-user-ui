import type { ActivityRecord, AbsenceRecord } from './types';
import { isDateInAbsence } from './absenceStorage';
import { isoFromDate } from './statsUtils';

export type LocationStat = { location: string; hours: number; entries: number };

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

export type LevelInfo = {
	level: number;
	xpInLevel: number;
	xpForNext: number;
	progress: number;
};

const MS_PER_DAY = 86_400_000;

function parseIsoDate(iso: string): Date {
	const [y, m, d] = iso.split('-').map(Number);
	return new Date(y, m - 1, d);
}

function isWeekend(date: Date): boolean {
	const day = date.getDay();
	return day === 0 || day === 6;
}

export function computeTopLocations(
	activities: ActivityRecord[],
	topN: number = 5,
	otherLabel: string = 'Other'
): LocationStat[] {
	const map = new Map<string, { hours: number; entries: number }>();
	for (const a of activities) {
		const loc = (a.location ?? '').trim();
		if (!loc) continue;
		const cur = map.get(loc) ?? { hours: 0, entries: 0 };
		cur.hours += a.hours;
		cur.entries += 1;
		map.set(loc, cur);
	}
	const sorted = [...map.entries()].sort((a, b) => b[1].hours - a[1].hours);
	const top = sorted.slice(0, topN).map(([location, v]) => ({ location, ...v }));
	const rest = sorted.slice(topN);
	if (rest.length > 0) {
		const totals = rest.reduce(
			(acc, [, v]) => ({ hours: acc.hours + v.hours, entries: acc.entries + v.entries }),
			{ hours: 0, entries: 0 }
		);
		top.push({ location: otherLabel, ...totals });
	}
	return top;
}

function eachDayInRange(fromIso: string, toIso: string): string[] {
	const from = parseIsoDate(fromIso);
	const to = parseIsoDate(toIso);
	if (to < from) return [];
	const dates: string[] = [];
	for (let t = from.getTime(); t <= to.getTime(); t += MS_PER_DAY) {
		dates.push(isoFromDate(new Date(t)));
	}
	return dates;
}

function sumSickFractionForDate(date: string, sickAbsences: AbsenceRecord[]): number {
	let sum = 0;
	for (const a of sickAbsences) {
		if (isDateInAbsence(date, a)) sum += Number(a.day_fraction ?? 1);
	}
	return Math.min(1, sum);
}

function getEarliestSickDate(sickAbsences: AbsenceRecord[]): string | null {
	let earliest: string | null = null;
	for (const a of sickAbsences) {
		if (!earliest || a.start_date < earliest) earliest = a.start_date;
	}
	return earliest;
}

export function computeSickDays(
	absences: AbsenceRecord[],
	range?: { from: string; to: string }
): number {
	const sick = absences.filter((a) => a.absence_type_id === 'sick');
	if (sick.length === 0) return 0;

	const fromIso = range?.from ?? getEarliestSickDate(sick);
	const toIso = range?.to ?? isoFromDate(new Date());
	if (!fromIso) return 0;

	let total = 0;
	for (const date of eachDayInRange(fromIso, toIso)) {
		const d = parseIsoDate(date);
		if (isWeekend(d)) continue;
		total += sumSickFractionForDate(date, sick);
	}
	return Math.round(total * 100) / 100;
}

export function computeSickDaysByMonth(
	absences: AbsenceRecord[],
	year: number
): { month: string; monthIndex: number; days: number }[] {
	const sick = absences.filter((a) => a.absence_type_id === 'sick');
	const buckets: { month: string; monthIndex: number; days: number }[] = [];
	const monthLabels = [
		'Jan',
		'Feb',
		'Mär',
		'Apr',
		'Mai',
		'Jun',
		'Jul',
		'Aug',
		'Sep',
		'Okt',
		'Nov',
		'Dez'
	];

	for (let m = 0; m < 12; m++) {
		const firstDay = new Date(year, m, 1);
		const lastDay = new Date(year, m + 1, 0);
		const from = isoFromDate(firstDay);
		const to = isoFromDate(lastDay);
		let days = 0;
		if (sick.length > 0) {
			for (const date of eachDayInRange(from, to)) {
				const d = parseIsoDate(date);
				if (isWeekend(d)) continue;
				days += sumSickFractionForDate(date, sick);
			}
		}
		buckets.push({ month: monthLabels[m], monthIndex: m, days: Math.round(days * 100) / 100 });
	}
	return buckets;
}

function isSickOnDate(date: string, sickAbsences: AbsenceRecord[]): boolean {
	for (const a of sickAbsences) {
		if (isDateInAbsence(date, a)) return true;
	}
	return false;
}

export function computeCurrentStreak(
	activities: ActivityRecord[],
	absences: AbsenceRecord[],
	today: Date
): number {
	const sick = absences.filter((a) => a.absence_type_id === 'sick');
	const allAbsences = absences;
	const activityDates = new Set(activities.map((a) => a.entry_date));

	let streak = 0;
	let cursor = new Date(today);
	cursor.setHours(0, 0, 0, 0);
	let safety = 0;

	while (safety++ < 3650) {
		if (isWeekend(cursor)) {
			cursor = new Date(cursor.getTime() - MS_PER_DAY);
			continue;
		}
		const iso = isoFromDate(cursor);
		if (isSickOnDate(iso, sick) || allAbsences.some((a) => isDateInAbsence(iso, a))) {
			cursor = new Date(cursor.getTime() - MS_PER_DAY);
			continue;
		}
		if (activityDates.has(iso)) {
			streak++;
			cursor = new Date(cursor.getTime() - MS_PER_DAY);
		} else {
			break;
		}
	}
	return streak;
}

export function computeLongestStreak(
	activities: ActivityRecord[],
	absences: AbsenceRecord[]
): number {
	if (activities.length === 0) return 0;
	const activityDates = new Set(activities.map((a) => a.entry_date));
	const sortedDates = [...activityDates].sort();
	const firstIso = sortedDates[0];
	const today = new Date();
	today.setHours(0, 0, 0, 0);
	const todayIso = isoFromDate(today);

	let longest = 0;
	let current = 0;
	for (const date of eachDayInRange(firstIso, todayIso)) {
		const d = parseIsoDate(date);
		if (isWeekend(d)) continue;
		if (absences.some((a) => isDateInAbsence(date, a))) continue;
		if (activityDates.has(date)) {
			current++;
			if (current > longest) longest = current;
		} else {
			current = 0;
		}
	}
	return longest;
}

export function computeLevel(totalHours: number): LevelInfo {
	const safe = Math.max(0, totalHours);
	const level = Math.floor(Math.sqrt(safe / 10)) + 1;
	const currentLevelStart = 10 * Math.pow(level - 1, 2);
	const nextLevelStart = 10 * Math.pow(level, 2);
	const xpInLevel = Math.round((safe - currentLevelStart) * 100) / 100;
	const xpForNext = Math.round((nextLevelStart - currentLevelStart) * 100) / 100;
	const progress = xpForNext > 0 ? Math.min(1, xpInLevel / xpForNext) : 0;
	return { level, xpInLevel, xpForNext, progress };
}

export function computeWorkdaysSince(startDate: string, today: Date): number {
	const todayIso = isoFromDate(today);
	let count = 0;
	for (const date of eachDayInRange(startDate, todayIso)) {
		const d = parseIsoDate(date);
		if (!isWeekend(d)) count++;
	}
	return count;
}

function computeMaxHoursInSingleDay(activities: ActivityRecord[]): number {
	const perDay = new Map<string, number>();
	for (const a of activities) {
		perDay.set(a.entry_date, (perDay.get(a.entry_date) ?? 0) + a.hours);
	}
	let max = 0;
	for (const h of perDay.values()) if (h > max) max = h;
	return max;
}

function computeDaysSinceLastSick(absences: AbsenceRecord[], today: Date): number {
	const sick = absences.filter((a) => a.absence_type_id === 'sick');
	if (sick.length === 0) return Number.POSITIVE_INFINITY;

	let cursor = new Date(today);
	cursor.setHours(0, 0, 0, 0);
	let days = 0;
	let safety = 0;
	while (safety++ < 3650) {
		const iso = isoFromDate(cursor);
		if (isSickOnDate(iso, sick)) break;
		days++;
		cursor = new Date(cursor.getTime() - MS_PER_DAY);
	}
	return days;
}

export function computeAchievements(
	activities: ActivityRecord[],
	absences: AbsenceRecord[],
	today: Date
): AchievementStatus[] {
	const totalHours = activities.reduce((s, a) => s + a.hours, 0);
	const longestStreak = computeLongestStreak(activities, absences);
	const distinctActivities = new Set(activities.map((a) => a.activity_name)).size;
	const distinctLocations = new Set(
		activities.map((a) => (a.location ?? '').trim()).filter((l) => l.length > 0)
	).size;
	const maxDayHours = computeMaxHoursInSingleDay(activities);
	const daysSinceSick = computeDaysSinceLastSick(absences, today);

	const defs: Array<
		Omit<AchievementStatus, 'current' | 'unlocked' | 'progress'> & { current: number }
	> = [
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
			id: 'ten_hours',
			labelKey: 'ach_ten_hours',
			descriptionKey: 'ach_ten_hours_desc',
			icon: 'Clock',
			threshold: 10,
			current: totalHours,
			unit: 'hours'
		},
		{
			id: 'hundred_hours',
			labelKey: 'ach_hundred_hours',
			descriptionKey: 'ach_hundred_hours_desc',
			icon: 'Hourglass',
			threshold: 100,
			current: totalHours,
			unit: 'hours'
		},
		{
			id: 'five_hundred_hours',
			labelKey: 'ach_five_hundred_hours',
			descriptionKey: 'ach_five_hundred_hours_desc',
			icon: 'Trophy',
			threshold: 500,
			current: totalHours,
			unit: 'hours'
		},
		{
			id: 'thousand_hours',
			labelKey: 'ach_thousand_hours',
			descriptionKey: 'ach_thousand_hours_desc',
			icon: 'Crown',
			threshold: 1000,
			current: totalHours,
			unit: 'hours'
		},
		{
			id: 'streak_5',
			labelKey: 'ach_streak_5',
			descriptionKey: 'ach_streak_5_desc',
			icon: 'Flame',
			threshold: 5,
			current: longestStreak,
			unit: 'streak'
		},
		{
			id: 'streak_20',
			labelKey: 'ach_streak_20',
			descriptionKey: 'ach_streak_20_desc',
			icon: 'Flame',
			threshold: 20,
			current: longestStreak,
			unit: 'streak'
		},
		{
			id: 'varied_5',
			labelKey: 'ach_varied_5',
			descriptionKey: 'ach_varied_5_desc',
			icon: 'Layers',
			threshold: 5,
			current: distinctActivities,
			unit: 'count'
		},
		{
			id: 'globetrotter_3',
			labelKey: 'ach_globetrotter_3',
			descriptionKey: 'ach_globetrotter_3_desc',
			icon: 'MapPin',
			threshold: 3,
			current: distinctLocations,
			unit: 'count'
		},
		{
			id: 'marathon_day',
			labelKey: 'ach_marathon_day',
			descriptionKey: 'ach_marathon_day_desc',
			icon: 'Zap',
			threshold: 8,
			current: maxDayHours,
			unit: 'hours'
		},
		{
			id: 'iron_health',
			labelKey: 'ach_iron_health',
			descriptionKey: 'ach_iron_health_desc',
			icon: 'Shield',
			threshold: 90,
			current: Number.isFinite(daysSinceSick) ? daysSinceSick : 9999,
			unit: 'days'
		}
	];

	return defs.map((d) => {
		const unlocked = d.current >= d.threshold;
		const progress = Math.min(1, d.current / d.threshold);
		return { ...d, unlocked, progress };
	});
}

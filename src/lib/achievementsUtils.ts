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

export type SickMonthBucket = { monthIndex: number; days: number };

// JS Date.getDay(): 0 = Sunday, 6 = Saturday. Swiss/EU weeks start on Monday,
// but Saturday and Sunday are still the weekend, so this is locale-agnostic.
const SUNDAY = 0;
const SATURDAY = 6;

function parseIsoDate(iso: string): Date {
	const [year, month, day] = iso.split('-').map(Number);
	return new Date(year, month - 1, day);
}

function isWeekend(date: Date): boolean {
	const dayOfWeek = date.getDay();
	return dayOfWeek === SUNDAY || dayOfWeek === SATURDAY;
}

export function addDays(iso: string, dayDelta: number): string {
	const date = parseIsoDate(iso);
	date.setDate(date.getDate() + dayDelta);
	return isoFromDate(date);
}

export function subtractYears(iso: string, yearDelta: number): string {
	const date = parseIsoDate(iso);
	date.setFullYear(date.getFullYear() - yearDelta);
	return isoFromDate(date);
}

function* iterateDates(fromIso: string, toIso: string): Generator<string> {
	if (toIso < fromIso) return;
	let cursorIso = fromIso;
	while (cursorIso <= toIso) {
		yield cursorIso;
		cursorIso = addDays(cursorIso, 1);
	}
}

export function computeTopLocations(
	activities: ActivityRecord[],
	topN: number,
	otherLabel: string
): LocationStat[] {
	const totalsByLocation = new Map<string, { hours: number; entries: number }>();
	for (const activity of activities) {
		const location = (activity.location ?? '').trim();
		if (!location) continue;
		const existing = totalsByLocation.get(location) ?? { hours: 0, entries: 0 };
		existing.hours += activity.hours;
		existing.entries += 1;
		totalsByLocation.set(location, existing);
	}

	const sorted = [...totalsByLocation.entries()].sort(
		([, left], [, right]) => right.hours - left.hours
	);
	const ranked = sorted.slice(0, topN).map(([location, totals]) => ({ location, ...totals }));
	const remainder = sorted.slice(topN);

	if (remainder.length > 0) {
		const aggregated = remainder.reduce(
			(acc, [, totals]) => ({
				hours: acc.hours + totals.hours,
				entries: acc.entries + totals.entries
			}),
			{ hours: 0, entries: 0 }
		);
		ranked.push({ location: otherLabel, ...aggregated });
	}
	return ranked;
}

/**
 * Pre-compute the sick-day fraction per ISO date within [fromIso, toIso].
 * Doing this once per range lets callers do O(1) Map lookups instead of
 * re-running `isDateInAbsence` per (date × absence) pair.
 */
function buildSickFractionByDate(
	absences: AbsenceRecord[],
	fromIso: string,
	toIso: string
): Map<string, number> {
	const fractionsByDate = new Map<string, number>();
	const sickAbsences = absences.filter((absence) => absence.absence_type_id === 'sick');
	if (sickAbsences.length === 0 || toIso < fromIso) return fractionsByDate;

	for (const absence of sickAbsences) {
		const fraction = Number(absence.day_fraction ?? 1);

		if (absence.is_recurring && absence.rrule) {
			// For recurring rules we still need to ask `isDateInAbsence` per day in range;
			// rules can match arbitrary days so there's no shortcut without the rrule lib.
			for (const dateIso of iterateDates(fromIso, toIso)) {
				if (isWeekend(parseIsoDate(dateIso))) continue;
				if (!isDateInAbsence(dateIso, absence)) continue;
				const current = fractionsByDate.get(dateIso) ?? 0;
				fractionsByDate.set(dateIso, Math.min(1, current + fraction));
			}
			continue;
		}

		// Non-recurring: iterate only the absence's own range, clipped to [fromIso, toIso].
		const startIso = absence.start_date > fromIso ? absence.start_date : fromIso;
		const endIso = absence.end_date < toIso ? absence.end_date : toIso;
		for (const dateIso of iterateDates(startIso, endIso)) {
			if (isWeekend(parseIsoDate(dateIso))) continue;
			const current = fractionsByDate.get(dateIso) ?? 0;
			fractionsByDate.set(dateIso, Math.min(1, current + fraction));
		}
	}

	return fractionsByDate;
}

function sumFractions(fractionsByDate: Map<string, number>): number {
	let total = 0;
	for (const fraction of fractionsByDate.values()) total += fraction;
	return Math.round(total * 100) / 100;
}

function getEarliestSickStartDate(absences: AbsenceRecord[]): string | null {
	let earliest: string | null = null;
	for (const absence of absences) {
		if (absence.absence_type_id !== 'sick') continue;
		if (!earliest || absence.start_date < earliest) earliest = absence.start_date;
	}
	return earliest;
}

export function computeSickDays(absences: AbsenceRecord[], fromIso: string, toIso: string): number {
	return sumFractions(buildSickFractionByDate(absences, fromIso, toIso));
}

export function computeSickDaysAllTime(absences: AbsenceRecord[], todayIso: string): number {
	const earliestStart = getEarliestSickStartDate(absences);
	if (!earliestStart) return 0;
	return computeSickDays(absences, earliestStart, todayIso);
}

export function computeSickDaysByMonth(absences: AbsenceRecord[], year: number): SickMonthBucket[] {
	const yearStart = `${year}-01-01`;
	const yearEnd = `${year}-12-31`;
	const fractionsByDate = buildSickFractionByDate(absences, yearStart, yearEnd);

	const buckets: SickMonthBucket[] = Array.from({ length: 12 }, (_, monthIndex) => ({
		monthIndex,
		days: 0
	}));
	for (const [dateIso, fraction] of fractionsByDate) {
		const monthIndex = parseIsoDate(dateIso).getMonth();
		buckets[monthIndex].days += fraction;
	}
	for (const bucket of buckets) bucket.days = Math.round(bucket.days * 100) / 100;
	return buckets;
}

function buildAbsenceBlockedDates(
	absences: AbsenceRecord[],
	fromIso: string,
	toIso: string
): Set<string> {
	const blocked = new Set<string>();
	if (toIso < fromIso) return blocked;

	for (const absence of absences) {
		if (absence.is_recurring && absence.rrule) {
			for (const dateIso of iterateDates(fromIso, toIso)) {
				if (isDateInAbsence(dateIso, absence)) blocked.add(dateIso);
			}
			continue;
		}
		const startIso = absence.start_date > fromIso ? absence.start_date : fromIso;
		const endIso = absence.end_date < toIso ? absence.end_date : toIso;
		for (const dateIso of iterateDates(startIso, endIso)) blocked.add(dateIso);
	}
	return blocked;
}

export function computeCurrentStreak(
	activities: ActivityRecord[],
	absences: AbsenceRecord[],
	todayIso: string
): number {
	const activityDates = new Set(activities.map((activity) => activity.entry_date));
	if (activityDates.size === 0) return 0;

	// Look back at most ~10 years; the streak can only be as long as the user has data.
	const lookbackStartIso = subtractYears(todayIso, 10);
	const blockedDates = buildAbsenceBlockedDates(absences, lookbackStartIso, todayIso);

	let streak = 0;
	let cursorIso = todayIso;
	while (cursorIso >= lookbackStartIso) {
		const cursorDate = parseIsoDate(cursorIso);
		const skip = isWeekend(cursorDate) || blockedDates.has(cursorIso);
		if (!skip) {
			if (activityDates.has(cursorIso)) {
				streak += 1;
			} else {
				break;
			}
		}
		cursorIso = addDays(cursorIso, -1);
	}
	return streak;
}

export function computeLongestStreak(
	activities: ActivityRecord[],
	absences: AbsenceRecord[],
	todayIso: string
): number {
	if (activities.length === 0) return 0;

	const activityDates = new Set(activities.map((activity) => activity.entry_date));
	const firstDateIso = [...activityDates].reduce(
		(earliest, dateIso) => (dateIso < earliest ? dateIso : earliest),
		todayIso
	);
	const blockedDates = buildAbsenceBlockedDates(absences, firstDateIso, todayIso);

	let longest = 0;
	let current = 0;
	for (const dateIso of iterateDates(firstDateIso, todayIso)) {
		if (isWeekend(parseIsoDate(dateIso))) continue;
		if (blockedDates.has(dateIso)) continue;
		if (activityDates.has(dateIso)) {
			current += 1;
			if (current > longest) longest = current;
		} else {
			current = 0;
		}
	}
	return longest;
}

export function computeLevel(totalHours: number): LevelInfo {
	const safeHours = Math.max(0, totalHours);
	const level = Math.floor(Math.sqrt(safeHours / 10)) + 1;
	const currentLevelStart = 10 * (level - 1) ** 2;
	const nextLevelStart = 10 * level ** 2;
	const xpInLevel = Math.round((safeHours - currentLevelStart) * 100) / 100;
	const xpForNext = Math.round((nextLevelStart - currentLevelStart) * 100) / 100;
	const progress = xpForNext > 0 ? Math.min(1, xpInLevel / xpForNext) : 0;
	return { level, xpInLevel, xpForNext, progress };
}

export function computeWorkdaysSince(startIso: string, todayIso: string): number {
	let workdayCount = 0;
	for (const dateIso of iterateDates(startIso, todayIso)) {
		if (!isWeekend(parseIsoDate(dateIso))) workdayCount += 1;
	}
	return workdayCount;
}

function computeMaxHoursInSingleDay(activities: ActivityRecord[]): number {
	const hoursByDate = new Map<string, number>();
	for (const activity of activities) {
		hoursByDate.set(
			activity.entry_date,
			(hoursByDate.get(activity.entry_date) ?? 0) + activity.hours
		);
	}
	let max = 0;
	for (const hours of hoursByDate.values()) if (hours > max) max = hours;
	return max;
}

function computeDaysSinceLastSick(absences: AbsenceRecord[], todayIso: string): number {
	const earliestStart = getEarliestSickStartDate(absences);
	if (!earliestStart) return Number.POSITIVE_INFINITY;

	// Find the most recent sick date by walking backwards through the
	// pre-computed fraction map — much cheaper than per-day `isDateInAbsence`.
	const fractionsByDate = buildSickFractionByDate(absences, earliestStart, todayIso);
	if (fractionsByDate.size === 0) return Number.POSITIVE_INFINITY;

	const sickDates = [...fractionsByDate.keys()].sort();
	const lastSickIso = sickDates[sickDates.length - 1];

	let days = 0;
	let cursorIso = todayIso;
	while (cursorIso > lastSickIso) {
		days += 1;
		cursorIso = addDays(cursorIso, -1);
	}
	return days;
}

export function computeAchievements(
	activities: ActivityRecord[],
	absences: AbsenceRecord[],
	todayIso: string
): AchievementStatus[] {
	const totalHours = activities.reduce((sum, activity) => sum + activity.hours, 0);
	const longestStreak = computeLongestStreak(activities, absences, todayIso);
	const distinctActivities = new Set(activities.map((activity) => activity.activity_name)).size;
	const distinctLocations = new Set(
		activities
			.map((activity) => (activity.location ?? '').trim())
			.filter((location) => location.length > 0)
	).size;
	const maxHoursInSingleDay = computeMaxHoursInSingleDay(activities);
	const daysSinceSick = computeDaysSinceLastSick(absences, todayIso);

	const definitions: Array<Omit<AchievementStatus, 'unlocked' | 'progress'>> = [
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
			current: maxHoursInSingleDay,
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

	return definitions.map((definition) => ({
		...definition,
		unlocked: definition.current >= definition.threshold,
		progress: Math.min(1, definition.current / definition.threshold)
	}));
}

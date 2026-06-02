import type { ActivityRecord, AbsenceRecord } from './types';
import { isDateInAbsence } from './absenceStorage';
import { isoFromDate } from './statsUtils';

export type AchievementUnit = 'hours' | 'days' | 'count' | 'streak';
export type AchievementStatus = {
	id: string;
	labelMessageKey: string;
	descriptionMessageKey: string;
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

function parseIsoDate(isoDate: string): Date {
	const [year, month, day] = isoDate.split('-').map(Number);
	return new Date(year, month - 1, day);
}

function isWeekend(date: Date): boolean {
	const dayOfWeek = date.getDay();
	return dayOfWeek === SUNDAY || dayOfWeek === SATURDAY;
}

export function addDays(isoDate: string, dayDelta: number): string {
	const date = parseIsoDate(isoDate);
	date.setDate(date.getDate() + dayDelta);
	return isoFromDate(date);
}

export function subtractYears(isoDate: string, yearDelta: number): string {
	const date = parseIsoDate(isoDate);
	date.setFullYear(date.getFullYear() - yearDelta);
	return isoFromDate(date);
}

function* iterateDates(fromIsoDate: string, toIsoDate: string): Generator<string> {
	if (toIsoDate < fromIsoDate) return;
	let currentIsoDate = fromIsoDate;
	while (currentIsoDate <= toIsoDate) {
		yield currentIsoDate;
		currentIsoDate = addDays(currentIsoDate, 1);
	}
}

function getAbsenceBlockedDates(
	absences: AbsenceRecord[],
	fromIsoDate: string,
	toIsoDate: string
): Set<string> {
	const absenceBlockedDates = new Set<string>();
	for (const absence of absences) {
		if (absence.is_recurring && absence.rrule) {
			for (const isoDate of iterateDates(fromIsoDate, toIsoDate)) {
				if (isDateInAbsence(isoDate, absence)) absenceBlockedDates.add(isoDate);
			}
			continue;
		}
		const absenceStartIsoDate = absence.start_date > fromIsoDate ? absence.start_date : fromIsoDate;
		const absenceEndIsoDate = absence.end_date < toIsoDate ? absence.end_date : toIsoDate;
		for (const isoDate of iterateDates(absenceStartIsoDate, absenceEndIsoDate)) {
			absenceBlockedDates.add(isoDate);
		}
	}
	return absenceBlockedDates;
}

export function computeCurrentStreak(
	activities: ActivityRecord[],
	absences: AbsenceRecord[],
	todayIsoDate: string
): number {
	const loggedActivityDates = new Set(activities.map((activity) => activity.entry_date));
	if (loggedActivityDates.size === 0) return 0;
	const lookbackStartIsoDate = subtractYears(todayIsoDate, 10);
	const absenceBlockedDates = getAbsenceBlockedDates(absences, lookbackStartIsoDate, todayIsoDate);
	let currentStreakDays = 0;
	let cursorIsoDate = todayIsoDate;
	while (cursorIsoDate >= lookbackStartIsoDate) {
		if (!isWeekend(parseIsoDate(cursorIsoDate)) && !absenceBlockedDates.has(cursorIsoDate)) {
			if (loggedActivityDates.has(cursorIsoDate)) currentStreakDays++;
			else break;
		}
		cursorIsoDate = addDays(cursorIsoDate, -1);
	}
	return currentStreakDays;
}

export function computeLongestStreak(
	activities: ActivityRecord[],
	absences: AbsenceRecord[],
	todayIsoDate: string
): number {
	if (activities.length === 0) return 0;
	const loggedActivityDates = new Set(activities.map((activity) => activity.entry_date));
	const firstActivityIsoDate = [...loggedActivityDates].reduce(
		(earliestIsoDate, isoDate) => (isoDate < earliestIsoDate ? isoDate : earliestIsoDate),
		todayIsoDate
	);
	const absenceBlockedDates = getAbsenceBlockedDates(absences, firstActivityIsoDate, todayIsoDate);
	let longestStreakDays = 0;
	let currentStreakDays = 0;
	for (const isoDate of iterateDates(firstActivityIsoDate, todayIsoDate)) {
		if (isWeekend(parseIsoDate(isoDate)) || absenceBlockedDates.has(isoDate)) continue;
		if (loggedActivityDates.has(isoDate)) {
			currentStreakDays++;
			if (currentStreakDays > longestStreakDays) longestStreakDays = currentStreakDays;
		} else currentStreakDays = 0;
	}
	return longestStreakDays;
}

export function computeLevel(totalHours: number): LevelInfo {
	const normalizedTotalHours = Math.max(0, totalHours);
	const level = Math.floor(Math.sqrt(normalizedTotalHours / 10)) + 1;
	const currentLevelStartHours = 10 * (level - 1) ** 2;
	const nextLevelStartHours = 10 * level ** 2;
	const xpInLevel = Math.round((normalizedTotalHours - currentLevelStartHours) * 100) / 100;
	const xpForNext = Math.round((nextLevelStartHours - currentLevelStartHours) * 100) / 100;
	return {
		level,
		xpInLevel,
		xpForNext,
		progress: xpForNext > 0 ? Math.min(1, xpInLevel / xpForNext) : 0
	};
}

export type LocationStat = { location: string; hours: number };

export function computeTopLocations(
	activities: ActivityRecord[],
	topCount: number
): LocationStat[] {
	const hoursByLocation = new Map<string, number>();
	for (const activity of activities) {
		const location = (activity.location ?? '').trim();
		if (location)
			hoursByLocation.set(location, (hoursByLocation.get(location) ?? 0) + activity.hours);
	}
	return [...hoursByLocation.entries()]
		.sort(([, leftHours], [, rightHours]) => rightHours - leftHours)
		.slice(0, topCount)
		.map(([location, hours]) => ({ location, hours: Math.round(hours * 10) / 10 }));
}

export function computeSickDays(
	absences: AbsenceRecord[],
	fromIsoDate: string,
	toIsoDate: string
): number {
	let sickDayTotal = 0;
	for (const absence of absences.filter((absence) => absence.absence_type_id === 'sick')) {
		const dayFraction = Number(absence.day_fraction ?? 1);
		const absenceStartIsoDate = absence.start_date > fromIsoDate ? absence.start_date : fromIsoDate;
		const absenceEndIsoDate = absence.end_date < toIsoDate ? absence.end_date : toIsoDate;
		if (absence.is_recurring && absence.rrule) {
			for (const isoDate of iterateDates(fromIsoDate, toIsoDate)) {
				if (!isWeekend(parseIsoDate(isoDate)) && isDateInAbsence(isoDate, absence)) {
					sickDayTotal = Math.min(1, sickDayTotal + dayFraction);
				}
			}
			continue;
		}
		for (const isoDate of iterateDates(absenceStartIsoDate, absenceEndIsoDate)) {
			if (!isWeekend(parseIsoDate(isoDate))) {
				sickDayTotal = Math.min(1, sickDayTotal + dayFraction);
			}
		}
	}
	return Math.round(sickDayTotal * 100) / 100;
}

export function computeAchievements(
	activities: ActivityRecord[],
	absences: AbsenceRecord[],
	todayIsoDate: string
): AchievementStatus[] {
	const totalHours = activities.reduce((sum, activity) => sum + activity.hours, 0);
	const longestStreak = computeLongestStreak(activities, absences, todayIsoDate);
	const achievementDefinitions: Array<Omit<AchievementStatus, 'unlocked' | 'progress'>> = [
		{
			id: 'first_log',
			labelMessageKey: 'achievement_first_log',
			descriptionMessageKey: 'achievement_first_log_desc',
			icon: 'Sparkles',
			threshold: 1,
			current: activities.length,
			unit: 'count'
		},
		{
			id: '250_hours',
			labelMessageKey: 'achievement_250_hours',
			descriptionMessageKey: 'achievement_250_hours_desc',
			icon: 'Clock',
			threshold: 250,
			current: totalHours,
			unit: 'hours'
		},
		{
			id: 'streak_15',
			labelMessageKey: 'achievement_streak_15',
			descriptionMessageKey: 'achievement_streak_15_desc',
			icon: 'Flame',
			threshold: 15,
			current: longestStreak,
			unit: 'streak'
		},
		{
			id: 'thousand_hours',
			labelMessageKey: 'achievement_thousand_hours',
			descriptionMessageKey: 'achievement_thousand_hours_desc',
			icon: 'Crown',
			threshold: 1000,
			current: totalHours,
			unit: 'hours'
		}
	];
	return achievementDefinitions.map((achievementDefinition) => ({
		...achievementDefinition,
		unlocked: achievementDefinition.current >= achievementDefinition.threshold,
		progress: Math.min(1, achievementDefinition.current / achievementDefinition.threshold)
	}));
}

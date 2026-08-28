import { rrulestr } from 'rrule';
import { getRruleUntil } from './rruleUtils';

const SUNDAY_INDEX = 0;
const SATURDAY_INDEX = 6;

const UNBOUNDED_RULE_HORIZON_DAYS = 365;

export function parseIsoDate(isoDate: string): Date {
	const [year, month, day] = isoDate.split('-').map(Number);
	return new Date(year, month - 1, day);
}

export function isoFromDate(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

export function isWeekendIsoDate(isoDate: string): boolean {
	const dayOfWeek = parseIsoDate(isoDate).getDay();
	return dayOfWeek === SUNDAY_INDEX || dayOfWeek === SATURDAY_INDEX;
}

export function addDays(isoDate: string, dayDelta: number): string {
	const date = parseIsoDate(isoDate);
	date.setDate(date.getDate() + dayDelta);
	return isoFromDate(date);
}

export function* iterateDates(fromIsoDate: string, toIsoDate: string): Generator<string> {
	if (toIsoDate < fromIsoDate) return;
	let currentIsoDate = fromIsoDate;
	while (currentIsoDate <= toIsoDate) {
		yield currentIsoDate;
		currentIsoDate = addDays(currentIsoDate, 1);
	}
}

export function countWeekdaysInRange(fromIsoDate: string, toIsoDate: string): number {
	let count = 0;
	for (const isoDate of iterateDates(fromIsoDate, toIsoDate)) {
		if (!isWeekendIsoDate(isoDate)) count++;
	}
	return count;
}

/**
 * Semester key for a date: August–December belong to "S1" of that year,
 * January–July to "S2" of the previous year (e.g. 2024-08-15 → "2024/S1").
 */
export function semesterKeyForIsoDate(isoDate: string): string {
	const date = parseIsoDate(isoDate);
	const year = date.getFullYear();
	const month = date.getMonth() + 1;
	const semesterNum = month >= 8 ? 1 : 2;
	const semesterYear = month >= 8 ? year : year - 1;
	return `${semesterYear}/S${semesterNum}`;
}

export type ExpandableAbsence = {
	start_date: string;
	end_date: string;
	is_recurring: boolean | null;
	rrule: string | null;
};

/**
 * Expand an absence into the ISO dates it covers, excluding weekends.
 * Fixed ranges use start_date..end_date; recurring rules are expanded from
 * start_date up to their UNTIL — or 365 days past `todayIsoDate` when the
 * rule is unbounded. An invalid rrule yields no dates.
 */
export function expandAbsenceDates(absence: ExpandableAbsence, todayIsoDate?: string): string[] {
	let dates: string[];

	if (absence.is_recurring && absence.rrule) {
		try {
			const rule = rrulestr(absence.rrule, {
				dtstart: new Date(`${absence.start_date}T00:00:00Z`)
			});
			const untilIsoDate = getRruleUntil(absence.rrule);
			const lastIsoDate =
				untilIsoDate ??
				addDays(todayIsoDate ?? isoFromDate(new Date()), UNBOUNDED_RULE_HORIZON_DAYS);
			dates = rule
				.between(
					new Date(`${absence.start_date}T00:00:00Z`),
					new Date(`${lastIsoDate}T00:00:00Z`),
					true
				)
				.map((date) => date.toISOString().split('T')[0]);
		} catch (error) {
			console.error(
				'[DateUtils] Error parsing rrule — treating absence as having no dates:',
				error,
				{ absenceId: (absence as { id?: string }).id, rrule: absence.rrule }
			);
			return [];
		}
	} else {
		dates = [...iterateDates(absence.start_date, absence.end_date)];
	}

	return [...new Set(dates)].filter((isoDate) => !isWeekendIsoDate(isoDate)).sort();
}

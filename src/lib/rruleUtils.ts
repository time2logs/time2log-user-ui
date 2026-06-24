import { Frequency } from 'rrule';

export function getFrequencyString(freq: number): 'daily' | 'weekly' {
	switch (freq) {
		case Frequency.DAILY:
			return 'daily';
		case Frequency.WEEKLY:
			return 'weekly';
		default:
			return 'weekly';
	}
}

export function getFrequencyEnum(freq: string): Frequency {
	switch (freq) {
		case 'daily':
			return Frequency.DAILY;
		case 'weekly':
			return Frequency.WEEKLY;
		default:
			return Frequency.WEEKLY;
	}
}

export interface RruleParams {
	startDate: string;
	isRecurring: boolean;
	recurrenceFrequency: 'daily' | 'weekly';
	selectedDays: number[]; // 0=Sun … 6=Sat
	recurrenceUntil: string; // YYYY-MM-DD or empty
}

const DAY_MAP = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'] as const;

/**
 * Convert a parsed rrule BYDAY entry into a Sunday-based index (0=Sun … 6=Sat).
 * Handles three representations produced by rrule.js: a numeric weekday,
 * an RFC-5545 string code ('MO'), or a Weekday object whose `.weekday` is
 * Monday-based (MO=0 … SU=6).
 */
export function byweekdayToIndex(d: unknown): number | undefined {
	if (typeof d === 'number') return d;
	if (typeof d === 'string') {
		const idx = DAY_MAP.indexOf(d as (typeof DAY_MAP)[number]);
		return idx >= 0 ? idx : undefined;
	}
	if (d != null && typeof d === 'object' && 'weekday' in d) {
		const wd = (d as { weekday: number }).weekday;
		return (wd + 1) % 7;
	}
	return undefined;
}

/** Extract the UNTIL date (YYYY-MM-DD) from an rrule string, or null. */
export function getRruleUntil(rrule: string): string | null {
	const match = rrule.match(/UNTIL=(\d{8})/);
	if (!match) return null;
	const raw = match[1];
	return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
}

export function buildRruleString(params: RruleParams): string {
	const { startDate, isRecurring, recurrenceFrequency, selectedDays, recurrenceUntil } = params;

	if (!startDate || !isRecurring) return '';

	const freq = getFrequencyEnum(recurrenceFrequency);
	let rruleStr = `DTSTART:${startDate.replace(/-/g, '')}T000000Z\nFREQ=${Frequency[freq]}`;

	if (recurrenceFrequency === 'weekly' && selectedDays.length > 0) {
		const days = selectedDays.map((d) => DAY_MAP[d]).join(',');
		rruleStr += `;BYDAY=${days}`;
	}

	if (recurrenceUntil) {
		rruleStr += `;UNTIL=${recurrenceUntil.replace(/-/g, '')}T235959Z`;
	}

	return rruleStr;
}

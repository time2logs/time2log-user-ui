import { Frequency } from 'rrule';

export function getFrequencyString(freq: number): 'daily' | 'weekly' | 'monthly' {
	switch (freq) {
		case Frequency.DAILY:
			return 'daily';
		case Frequency.WEEKLY:
			return 'weekly';
		case Frequency.MONTHLY:
			return 'monthly';
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
		case 'monthly':
			return Frequency.MONTHLY;
		default:
			return Frequency.WEEKLY;
	}
}

export interface RruleParams {
	startDate: string;
	isRecurring: boolean;
	recurrenceFrequency: 'daily' | 'weekly' | 'monthly';
	selectedDays: number[]; // 0=Sun … 6=Sat
	recurrenceUntil: string; // YYYY-MM-DD or empty
}

const DAY_MAP = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'] as const;

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

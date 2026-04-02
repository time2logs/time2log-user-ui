export type RecurrenceFrequency = 'weekly' | 'biweekly' | 'monthly';

export interface RecurrencePattern {
	frequency: RecurrenceFrequency;
	days: number[];
	until: string;
}

export function generateRecurrenceDates(
	startDate: string,
	pattern: RecurrencePattern,
	maxFutureDates: number = 52
): string[] {
	const dates: string[] = [];
	const start = new Date(`${startDate}T12:00:00`);
	const until = pattern.until ? new Date(`${pattern.until}T12:00:00`) : null;

	const maxDate = until || new Date(start);
	maxDate.setMonth(maxDate.getMonth() + 12);

	let current = new Date(start);
	let count = 0;

	while (current <= maxDate && count < maxFutureDates) {
		const dayOfWeek = current.getDay();

		if (pattern.days.length === 0 || pattern.days.includes(dayOfWeek)) {
			dates.push(current.toISOString().split('T')[0]);
			count++;
		}

		switch (pattern.frequency) {
			case 'weekly':
				current.setDate(current.getDate() + 7);
				break;
			case 'biweekly':
				current.setDate(current.getDate() + 14);
				break;
			case 'monthly':
				current.setMonth(current.getMonth() + 1);
				break;
		}
	}

	return dates;
}

export function getWeekdayLabels(): { value: number; short: string; long: string }[] {
	return [
		{ value: 0, short: 'Sun', long: 'Sunday' },
		{ value: 1, short: 'Mon', long: 'Monday' },
		{ value: 2, short: 'Tue', long: 'Tuesday' },
		{ value: 3, short: 'Wed', long: 'Wednesday' },
		{ value: 4, short: 'Thu', long: 'Thursday' },
		{ value: 5, short: 'Fri', long: 'Friday' },
		{ value: 6, short: 'Sat', long: 'Saturday' }
	];
}

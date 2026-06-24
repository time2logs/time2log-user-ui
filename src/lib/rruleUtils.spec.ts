import { describe, expect, it } from 'vitest';
import { Frequency } from 'rrule';
import { buildRruleString, getFrequencyEnum, getFrequencyString } from './rruleUtils';

describe('getFrequencyString', () => {
	it('maps DAILY (1) to "daily"', () => {
		expect(getFrequencyString(Frequency.DAILY)).toBe('daily');
	});

	it('maps WEEKLY (2) to "weekly"', () => {
		expect(getFrequencyString(Frequency.WEEKLY)).toBe('weekly');
	});

	it('defaults to "weekly" for unknown values', () => {
		expect(getFrequencyString(99)).toBe('weekly');
	});
});

describe('getFrequencyEnum', () => {
	it('maps "daily" to Frequency.DAILY', () => {
		expect(getFrequencyEnum('daily')).toBe(Frequency.DAILY);
	});

	it('maps "weekly" to Frequency.WEEKLY', () => {
		expect(getFrequencyEnum('weekly')).toBe(Frequency.WEEKLY);
	});

	it('defaults to Frequency.WEEKLY for unknown strings', () => {
		expect(getFrequencyEnum('unknown')).toBe(Frequency.WEEKLY);
	});
});

describe('buildRruleString', () => {
	it('returns empty string when startDate is empty', () => {
		expect(
			buildRruleString({
				startDate: '',
				isRecurring: true,
				recurrenceFrequency: 'weekly',
				selectedDays: [],
				recurrenceUntil: ''
			})
		).toBe('');
	});

	it('returns empty string when isRecurring is false', () => {
		expect(
			buildRruleString({
				startDate: '2024-01-01',
				isRecurring: false,
				recurrenceFrequency: 'weekly',
				selectedDays: [],
				recurrenceUntil: ''
			})
		).toBe('');
	});

	it('builds a weekly rrule with DTSTART and FREQ', () => {
		const result = buildRruleString({
			startDate: '2024-01-01',
			isRecurring: true,
			recurrenceFrequency: 'weekly',
			selectedDays: [],
			recurrenceUntil: ''
		});
		expect(result).toContain('DTSTART:20240101T000000Z');
		expect(result).toContain('FREQ=WEEKLY');
	});

	it('builds a daily rrule', () => {
		const result = buildRruleString({
			startDate: '2024-03-15',
			isRecurring: true,
			recurrenceFrequency: 'daily',
			selectedDays: [],
			recurrenceUntil: ''
		});
		expect(result).toContain('FREQ=DAILY');
	});

	it('adds BYDAY for weekly frequency with selected days', () => {
		const result = buildRruleString({
			startDate: '2024-01-01',
			isRecurring: true,
			recurrenceFrequency: 'weekly',
			selectedDays: [1, 3, 5], // Mon, Wed, Fri
			recurrenceUntil: ''
		});
		expect(result).toContain('BYDAY=MO,WE,FR');
	});

	it('does not add BYDAY for weekly when no days selected', () => {
		const result = buildRruleString({
			startDate: '2024-01-01',
			isRecurring: true,
			recurrenceFrequency: 'weekly',
			selectedDays: [],
			recurrenceUntil: ''
		});
		expect(result).not.toContain('BYDAY');
	});

	it('adds UNTIL when recurrenceUntil is set', () => {
		const result = buildRruleString({
			startDate: '2024-01-01',
			isRecurring: true,
			recurrenceFrequency: 'weekly',
			selectedDays: [],
			recurrenceUntil: '2024-12-31'
		});
		expect(result).toContain('UNTIL=20241231T235959Z');
	});

	it('does not add UNTIL when recurrenceUntil is empty', () => {
		const result = buildRruleString({
			startDate: '2024-01-01',
			isRecurring: true,
			recurrenceFrequency: 'weekly',
			selectedDays: [],
			recurrenceUntil: ''
		});
		expect(result).not.toContain('UNTIL');
	});

	it('maps all 7 weekday values to correct RFC 5545 abbreviations', () => {
		const result = buildRruleString({
			startDate: '2024-01-01',
			isRecurring: true,
			recurrenceFrequency: 'weekly',
			selectedDays: [0, 1, 2, 3, 4, 5, 6],
			recurrenceUntil: ''
		});
		expect(result).toContain('BYDAY=SU,MO,TU,WE,TH,FR,SA');
	});
});

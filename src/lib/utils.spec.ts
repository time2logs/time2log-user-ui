import { describe, expect, it } from 'vitest';
import {
	cn,
	getAbsenceReferenceDate,
	isAbsenceWithinEditWindow,
	isWithinEditWindow,
	formatHoursMinutes,
	EDIT_WINDOW_DAYS
} from './utils';

describe('cn', () => {
	it('joins single class name', () => {
		// Arrange
		const input = 'foo';

		// Act
		const result = cn(input);

		// Assert
		expect(result).toBe('foo');
	});

	it('joins multiple class names', () => {
		// Arrange
		const a = 'foo',
			b = 'bar',
			c = 'baz';

		// Act
		const result = cn(a, b, c);

		// Assert
		expect(result).toBe('foo bar baz');
	});

	it('ignores falsy values', () => {
		// Arrange
		const inputs = ['foo', false, undefined, null, 0 as never] as const;

		// Act
		const result = cn(...inputs);

		// Assert
		expect(result).toBe('foo');
	});

	it('handles conditional (false && ...) expressions', () => {
		// Arrange
		const active = false;

		// Act
		const result = cn('base', active && 'active');

		// Assert
		expect(result).toBe('base');
	});

	it('handles conditional (true && ...) expressions', () => {
		// Arrange
		const active = true;

		// Act
		const result = cn('base', active && 'active');

		// Assert
		expect(result).toBe('base active');
	});

	it('handles object syntax (clsx feature)', () => {
		// Arrange
		const flags = { foo: true, bar: false, baz: true };

		// Act
		const result = cn(flags);

		// Assert
		expect(result).toBe('foo baz');
	});

	it('merges conflicting tailwind classes — last one wins', () => {
		// Arrange
		const paddingInputs = ['px-2', 'px-4'] as const;
		const textInputs = ['text-sm text-red-500', 'text-lg'] as const;

		// Act
		const paddingResult = cn(...paddingInputs);
		const textResult = cn(...textInputs);

		// Assert
		expect(paddingResult).toBe('px-4');
		expect(textResult).toBe('text-red-500 text-lg');
	});

	it('handles array input', () => {
		// Arrange
		const input = ['foo', 'bar'];

		// Act
		const result = cn(input);

		// Assert
		expect(result).toBe('foo bar');
	});

	it('returns empty string for all falsy inputs', () => {
		// Arrange
		const inputs = [false, undefined, null] as never[];

		// Act
		const result = cn(...inputs);

		// Assertt
		expect(result).toBe('');
	});
});

describe('getAbsenceReferenceDate', () => {
	// Use a fixed "now" so tests are deterministic. EDIT_WINDOW_DAYS = 14.
	const now = new Date(2024, 0, 20); // 2024-01-20

	it('returns today when today falls inside the range', () => {
		const ref = getAbsenceReferenceDate({ start_date: '2024-01-15', end_date: '2024-01-25' }, now);
		expect(ref).toBe('2024-01-20');
	});

	it('returns end_date when today is after the range', () => {
		const ref = getAbsenceReferenceDate({ start_date: '2024-01-01', end_date: '2024-01-05' }, now);
		expect(ref).toBe('2024-01-05');
	});

	it('returns start_date when today is before the range (future absence)', () => {
		const ref = getAbsenceReferenceDate({ start_date: '2024-02-01', end_date: '2024-02-03' }, now);
		expect(ref).toBe('2024-02-01');
	});

	it('returns start_date when today equals start_date (lower boundary)', () => {
		const ref = getAbsenceReferenceDate({ start_date: '2024-01-20', end_date: '2024-01-25' }, now);
		expect(ref).toBe('2024-01-20');
	});

	it('returns end_date when today equals end_date (upper boundary)', () => {
		const ref = getAbsenceReferenceDate({ start_date: '2024-01-15', end_date: '2024-01-20' }, now);
		expect(ref).toBe('2024-01-20');
	});

	it('handles a single-day absence (start === end) on that day', () => {
		const ref = getAbsenceReferenceDate({ start_date: '2024-01-20', end_date: '2024-01-20' }, now);
		expect(ref).toBe('2024-01-20');
	});

	it('handles a single-day absence in the past', () => {
		const ref = getAbsenceReferenceDate({ start_date: '2024-01-01', end_date: '2024-01-01' }, now);
		expect(ref).toBe('2024-01-01');
	});
});

describe('isAbsenceWithinEditWindow', () => {
	it('is editable when the reference day is within the window (range ending recently)', () => {
		// Reference date clamps to end_date = 2024-01-10, which is 10 days before now (2024-01-20).
		const now = new Date(2024, 0, 20);
		expect(
			isAbsenceWithinEditWindow({ start_date: '2024-01-01', end_date: '2024-01-10' }, now)
		).toBe(true);
	});

	it('is editable when today is inside an active range', () => {
		const now = new Date(2024, 0, 20);
		expect(
			isAbsenceWithinEditWindow({ start_date: '2024-01-15', end_date: '2024-01-25' }, now)
		).toBe(true);
	});

	it('is editable for a future absence (reference day is start_date, in the future)', () => {
		const now = new Date(2024, 0, 20);
		expect(
			isAbsenceWithinEditWindow({ start_date: '2024-02-01', end_date: '2024-02-03' }, now)
		).toBe(true);
	});

	it('is locked when the reference day is older than the edit window', () => {
		// end_date 2024-01-01 is 19 days before now (2024-01-20) -> > EDIT_WINDOW_DAYS (14).
		const now = new Date(2024, 0, 20);
		expect(
			isAbsenceWithinEditWindow({ start_date: '2023-12-28', end_date: '2024-01-01' }, now)
		).toBe(false);
	});

	it('is editable exactly on the window boundary (end_date = today - EDIT_WINDOW_DAYS)', () => {
		// 2024-01-20 minus 14 days = 2024-01-06. End date exactly 14 days ago should be editable.
		const now = new Date(2024, 0, 20);
		expect(
			isAbsenceWithinEditWindow({ start_date: '2023-12-01', end_date: '2024-01-06' }, now)
		).toBe(true);
	});

	it('is locked one day past the window boundary', () => {
		// end_date 2024-01-05 is 15 days before now -> locked.
		const now = new Date(2024, 0, 20);
		expect(
			isAbsenceWithinEditWindow({ start_date: '2023-12-01', end_date: '2024-01-05' }, now)
		).toBe(false);
	});

	it('respects EDIT_WINDOW_DAYS constant value', () => {
		expect(EDIT_WINDOW_DAYS).toBe(14);
	});
});

// ── isWithinEditWindow ─────────────────────────────────────────────────────

describe('isWithinEditWindow', () => {
	it('returns true for today', () => {
		const today = new Date().toISOString().slice(0, 10);
		expect(isWithinEditWindow(today)).toBe(true);
	});

	it('returns true for a date within the 14-day window', () => {
		const now = new Date(2024, 0, 20);
		expect(isWithinEditWindow('2024-01-10', now)).toBe(true);
	});

	it('returns true on the window boundary (exactly 14 days ago)', () => {
		const now = new Date(2024, 0, 20);
		expect(isWithinEditWindow('2024-01-06', now)).toBe(true);
	});

	it('returns false one day past the window boundary', () => {
		const now = new Date(2024, 0, 20);
		expect(isWithinEditWindow('2024-01-05', now)).toBe(false);
	});

	it('returns true for a future date', () => {
		const now = new Date(2024, 0, 20);
		expect(isWithinEditWindow('2024-06-01', now)).toBe(true);
	});

	it('returns false for an invalid date string', () => {
		expect(isWithinEditWindow('not-a-date')).toBe(false);
	});
});

// ── formatHoursMinutes ─────────────────────────────────────────────────────

describe('formatHoursMinutes', () => {
	it('formats whole hours', () => {
		expect(formatHoursMinutes(3)).toBe('3h');
	});

	it('formats zero hours', () => {
		expect(formatHoursMinutes(0)).toBe('0h');
	});

	it('formats minutes only when whole hours is 0', () => {
		expect(formatHoursMinutes(0.5)).toBe('30min');
	});

	it('formats hours and minutes together', () => {
		expect(formatHoursMinutes(2.5)).toBe('2h 30min');
	});

	it('formats quarter hours', () => {
		expect(formatHoursMinutes(1.25)).toBe('1h 15min');
	});

	it('formats when minutes round to 0', () => {
		expect(formatHoursMinutes(1.0)).toBe('1h');
	});
});

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const supabaseMock = { from: vi.fn() };

vi.mock('./supabaseClient', () => ({ supabase: supabaseMock }));

beforeEach(() => {
	localStorage.clear();
	vi.clearAllMocks();
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe('exported constants', () => {
	it('MIN_HOURS equals 1', async () => {
		// Arrange
		const { MIN_HOURS } = await import('./activityStorage');

		// Act

		// Assert
		expect(MIN_HOURS).toBe(1);
	});

	it('DEFAULT_MAX_HOURS_PER_DAY equals 10', async () => {
		// Arrange
		const { DEFAULT_MAX_HOURS_PER_DAY } = await import('./activityStorage');

		// Act

		// Assert
		expect(DEFAULT_MAX_HOURS_PER_DAY).toBe(10);
	});
});

describe('getLastActivityId', () => {
	it('returns null when nothing is stored', async () => {
		// Arrange
		const { getLastActivityId } = await import('./activityStorage');

		// Act
		const result = getLastActivityId();

		// Assert
		expect(result).toBeNull();
	});

	it('returns the stored activity id from localStorage', async () => {
		// Arrange
		localStorage.setItem('last_activity_id', 'act-99');
		const { getLastActivityId } = await import('./activityStorage');

		// Act
		const result = getLastActivityId();

		// Assert
		expect(result).toBe('act-99');
	});
});

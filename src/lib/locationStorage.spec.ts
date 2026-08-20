import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createQueryChain } from '../tests/helpers/supabaseMock';
import { STORAGE_KEYS } from './storageKeys';

const { supabaseMock } = vi.hoisted(() => ({
	supabaseMock: { from: vi.fn() }
}));

vi.mock('./supabaseClient', () => ({ supabase: supabaseMock }));

import { addUserLocation, renameUserLocation, deleteUserLocation } from './locationStorage';

const USER = 'user-1';

function locationsChain(rows: { location: string }[]) {
	return createQueryChain({ data: rows, error: null });
}

function okChain() {
	return createQueryChain({ data: null, error: null });
}

function errorChain() {
	return createQueryChain({ data: null, error: { message: 'boom' } });
}

function mockFrom(tables: Record<string, ReturnType<typeof createQueryChain>>) {
	supabaseMock.from.mockImplementation((table: string) => tables[table] ?? okChain());
}

beforeEach(() => {
	localStorage.clear();
	vi.clearAllMocks();
});

afterEach(() => {
	vi.restoreAllMocks();
});

// ── addUserLocation ───────────────────────────────────────────────────────

describe('addUserLocation', () => {
	it('rejects an empty label', async () => {
		await expect(addUserLocation('   ', USER)).rejects.toThrow('Location must not be empty.');
		expect(supabaseMock.from).not.toHaveBeenCalled();
	});

	it('rejects duplicates case-insensitively', async () => {
		mockFrom({ user_locations: locationsChain([{ location: 'Office' }]) });
		await expect(addUserLocation('office', USER)).rejects.toThrow('DUPLICATE_LOCATION');
	});

	it('returns the trimmed label on success', async () => {
		mockFrom({ user_locations: locationsChain([]) });
		await expect(addUserLocation('  Home office  ', USER)).resolves.toBe('Home office');
	});
});

// ── renameUserLocation ────────────────────────────────────────────────────

describe('renameUserLocation', () => {
	it('rejects an empty new label', async () => {
		await expect(renameUserLocation('Office', ' ', USER)).rejects.toThrow(
			'Location must not be empty.'
		);
		expect(supabaseMock.from).not.toHaveBeenCalled();
	});

	it('is a no-op when the label is unchanged', async () => {
		await expect(renameUserLocation('Office', 'Office', USER)).resolves.toBe('Office');
		expect(supabaseMock.from).not.toHaveBeenCalled();
	});

	it('rejects a rename onto an existing label', async () => {
		mockFrom({ user_locations: locationsChain([{ location: 'Office' }, { location: 'Home' }]) });
		await expect(renameUserLocation('Office', 'home', USER)).rejects.toThrow('DUPLICATE_LOCATION');
		expect(supabaseMock.from).not.toHaveBeenCalledWith('activity_records');
	});

	it('allows a case-only rename', async () => {
		mockFrom({ user_locations: locationsChain([{ location: 'Office' }, { location: 'Home' }]) });
		await expect(renameUserLocation('Office', 'OFFICE', USER)).resolves.toBe('OFFICE');
	});

	it('cascades to activity_records before renaming the dropdown entry', async () => {
		mockFrom({ user_locations: locationsChain([{ location: 'Office' }]) });
		await renameUserLocation('Office', 'Office Zurich', USER);

		expect(supabaseMock.from).toHaveBeenNthCalledWith(1, 'user_locations');
		expect(supabaseMock.from).toHaveBeenNthCalledWith(2, 'activity_records');
		expect(supabaseMock.from).toHaveBeenNthCalledWith(3, 'user_locations');
	});

	it('updates the stored last location when it matched the old label', async () => {
		mockFrom({ user_locations: locationsChain([{ location: 'Office' }]) });
		localStorage.setItem(STORAGE_KEYS.lastLocation, 'Office');

		await renameUserLocation('Office', 'Office Zurich', USER);

		expect(localStorage.getItem(STORAGE_KEYS.lastLocation)).toBe('Office Zurich');
	});

	it('leaves the stored last location untouched when it did not match', async () => {
		mockFrom({ user_locations: locationsChain([{ location: 'Office' }]) });
		localStorage.setItem(STORAGE_KEYS.lastLocation, 'Home');

		await renameUserLocation('Office', 'Office Zurich', USER);

		expect(localStorage.getItem(STORAGE_KEYS.lastLocation)).toBe('Home');
	});

	it('propagates errors from the activity cascade', async () => {
		mockFrom({
			user_locations: locationsChain([{ location: 'Office' }]),
			activity_records: errorChain()
		});
		await expect(renameUserLocation('Office', 'Office Zurich', USER)).rejects.toThrow('boom');
		expect(supabaseMock.from).toHaveBeenCalledTimes(2);
	});
});

// ── deleteUserLocation ────────────────────────────────────────────────────

describe('deleteUserLocation', () => {
	it('deletes from user_locations scoped to the user and label', async () => {
		mockFrom({ user_locations: okChain() });
		await deleteUserLocation('Office', USER);

		expect(supabaseMock.from).toHaveBeenCalledWith('user_locations');
		const chain = supabaseMock.from.mock.results[0].value;
		expect(chain.delete).toHaveBeenCalled();
		expect(chain.eq).toHaveBeenCalledWith('user_id', USER);
		expect(chain.eq).toHaveBeenCalledWith('location', 'Office');
	});

	it('removes the stored last location when it matched', async () => {
		mockFrom({ user_locations: okChain() });
		localStorage.setItem(STORAGE_KEYS.lastLocation, 'Office');

		await deleteUserLocation('Office', USER);

		expect(localStorage.getItem(STORAGE_KEYS.lastLocation)).toBeNull();
	});

	it('keeps the stored last location when it did not match', async () => {
		mockFrom({ user_locations: okChain() });
		localStorage.setItem(STORAGE_KEYS.lastLocation, 'Home');

		await deleteUserLocation('Office', USER);

		expect(localStorage.getItem(STORAGE_KEYS.lastLocation)).toBe('Home');
	});

	it('propagates errors', async () => {
		mockFrom({ user_locations: errorChain() });
		await expect(deleteUserLocation('Office', USER)).rejects.toThrow('boom');
	});
});

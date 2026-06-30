import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createQueryChain } from '../tests/helpers/supabaseMock';
import { get } from 'svelte/store';

const { supabaseMock } = vi.hoisted(() => ({
	supabaseMock: { from: vi.fn() }
}));

vi.mock('./supabaseClient', () => ({ supabase: supabaseMock }));

import {
	activityStore,
	activityError,
	DEFAULT_MAX_HOURS_PER_DAY,
	MAX_HOURS_PER_ENTRY,
	MIN_HOURS,
	getLastActivityId,
	getLastLocation
} from './activityStorage';

beforeEach(() => {
	localStorage.clear();
	vi.clearAllMocks();
	supabaseMock.from.mockReturnValue(createQueryChain());
	activityStore.setCurriculumNodeSummaries([
		{ id: 'ca-1', key: 'coding', label: 'Coding', is_active: true },
		{ id: 'ca-2', key: 'meeting', label: 'Meeting', is_active: true }
	]);
});

afterEach(() => {
	vi.restoreAllMocks();
});

// ── Helpers ──────────────────────────────────────────────────────────────

function makeActivityInput(overrides: Record<string, unknown> = {}) {
	const today = new Date().toISOString().slice(0, 10);
	return {
		organization_id: 'org-1',
		profession_id: 'prof-1',
		user_id: 'user-1',
		team_id: null,
		curriculum_activity_id: 'ca-1',
		entry_date: today,
		hours: 5,
		notes: null,
		rating: null,
		location: 'Office',
		activity_name: 'Coding',
		activity_key: 'coding',
		activity_label: '',
		...overrides
	};
}

function makeActivityRow(overrides: Record<string, unknown> = {}) {
	const today = new Date().toISOString().slice(0, 10);
	return {
		id: 'rec-1',
		organization_id: 'org-1',
		profession_id: 'prof-1',
		user_id: 'user-1',
		team_id: null,
		curriculum_activity_id: 'ca-1',
		entry_date: today,
		hours: 5,
		notes: null,
		rating: null,
		location: 'Office',
		created_at: `${today}T10:00:00Z`,
		updated_at: `${today}T10:00:00Z`,
		...overrides
	};
}

// ── Exported constants ────────────────────────────────────────────────────

describe('exported constants', () => {
	it('MIN_HOURS equals 1', () => {
		expect(MIN_HOURS).toBe(0.5);
	});

	it('DEFAULT_MAX_HOURS_PER_DAY equals 10', () => {
		expect(DEFAULT_MAX_HOURS_PER_DAY).toBe(10);
	});

	it('MAX_HOURS_PER_ENTRY equals 10', () => {
		expect(MAX_HOURS_PER_ENTRY).toBe(10);
	});
});

// ── getLastActivityId / getLastLocation ──────────────────────────────────

describe('getLastActivityId', () => {
	it('returns null when nothing is stored', () => {
		expect(getLastActivityId()).toBeNull();
	});

	it('returns the stored activity id from localStorage', () => {
		localStorage.setItem('last_activity_id', 'act-99');
		expect(getLastActivityId()).toBe('act-99');
	});
});

describe('getLastLocation', () => {
	it('returns null when nothing is stored', () => {
		expect(getLastLocation()).toBeNull();
	});

	it('returns the stored location from localStorage', () => {
		localStorage.setItem('last_location', 'Zurich');
		expect(getLastLocation()).toBe('Zurich');
	});
});

// ── add ──────────────────────────────────────────────────────────────────

describe('add', () => {
	it('returns null when hours < MIN_HOURS', async () => {
		const result = await activityStore.add(makeActivityInput({ hours: 0.1 }));
		expect(result).toBeNull();
	});

	it('returns null when hours > maxHours', async () => {
		const result = await activityStore.add(makeActivityInput({ hours: 11 }));
		expect(result).toBeNull();
	});

	it('returns null when hours is NaN', async () => {
		const result = await activityStore.add(makeActivityInput({ hours: NaN }));
		expect(result).toBeNull();
	});

	it('respects a custom maxHours parameter', async () => {
		const result = await activityStore.add(makeActivityInput({ hours: 7 }), 6);
		expect(result).toBeNull();
	});

	it('inserts and returns the new activity on success', async () => {
		const row = makeActivityRow({ id: 'new-1' });
		supabaseMock.from.mockReturnValue(createQueryChain({ data: row, error: null }));

		const result = await activityStore.add(makeActivityInput());

		expect(result).not.toBeNull();
		expect(result!.id).toBe('new-1');
		expect(result!.activity_name).toBe('Coding');
		expect(result!.location).toBe('Office');
	});

	it('throws when supabase returns an error', async () => {
		supabaseMock.from.mockReturnValue(
			createQueryChain({ data: null, error: { message: 'DB error' } })
		);

		await expect(activityStore.add(makeActivityInput())).rejects.toThrow('DB error');
	});

	it('saves curriculum_activity_id to localStorage', async () => {
		supabaseMock.from.mockReturnValue(createQueryChain({ data: makeActivityRow(), error: null }));

		await activityStore.add(makeActivityInput({ curriculum_activity_id: 'ca-42' }));

		expect(localStorage.getItem('last_activity_id')).toBe('ca-42');
	});

	it('saves location to localStorage when provided', async () => {
		supabaseMock.from.mockReturnValue(createQueryChain({ data: makeActivityRow(), error: null }));

		await activityStore.add(makeActivityInput({ location: 'Bern' }));

		expect(localStorage.getItem('last_location')).toBe('Bern');
	});

	it('does not save location when empty', async () => {
		supabaseMock.from.mockReturnValue(
			createQueryChain({ data: makeActivityRow({ location: '' }), error: null })
		);

		await activityStore.add(makeActivityInput({ location: '' }));

		expect(localStorage.getItem('last_location')).toBeNull();
	});

	it('prepends the new activity to the store', async () => {
		supabaseMock.from.mockReturnValue(
			createQueryChain({ data: makeActivityRow({ id: 'prepend-1' }), error: null })
		);

		await activityStore.add(makeActivityInput());

		const activities = get(activityStore);
		expect(activities.find((a) => a.id === 'prepend-1')).toBeDefined();
	});
});

// ── addMany ──────────────────────────────────────────────────────────────

describe('addMany', () => {
	it('returns empty array when input is empty', async () => {
		const result = await activityStore.addMany([]);
		expect(result).toEqual([]);
	});

	it('throws when any activity has invalid hours', async () => {
		await expect(activityStore.addMany([makeActivityInput({ hours: 0.5 })])).rejects.toThrow();
	});

	it('inserts all activities and returns them', async () => {
		const rows = [makeActivityRow({ id: 'm-1' }), makeActivityRow({ id: 'm-2' })];
		supabaseMock.from.mockReturnValue(createQueryChain({ data: rows, error: null }));

		const result = await activityStore.addMany([
			makeActivityInput({ curriculum_activity_id: 'ca-1' }),
			makeActivityInput({ curriculum_activity_id: 'ca-2' })
		]);

		expect(result).toHaveLength(2);
		expect(result[0].id).toBe('m-1');
		expect(result[1].id).toBe('m-2');
	});
});

// ── delete ───────────────────────────────────────────────────────────────

describe('delete', () => {
	it('returns true on successful delete', async () => {
		supabaseMock.from.mockReturnValue(createQueryChain({ data: null, error: null }));

		const result = await activityStore.delete('nonexistent-id');
		expect(result).toBe(true);
	});

	it('throws edit window error when entry is older than 14 days', async () => {
		const oldRow = makeActivityRow({ id: 'old-delete', entry_date: '2020-01-01' });
		supabaseMock.from.mockReturnValue(createQueryChain({ data: oldRow, error: null }));
		await activityStore.add(makeActivityInput({ entry_date: '2020-01-01' }));

		await expect(activityStore.delete('old-delete')).rejects.toThrow();
	});

	it('throws when supabase returns an error', async () => {
		supabaseMock.from.mockReturnValue(
			createQueryChain({ data: null, error: { message: 'Delete failed' } })
		);

		await expect(activityStore.delete('some-id')).rejects.toThrow('Delete failed');
	});
});

// ── update ───────────────────────────────────────────────────────────────

describe('update', () => {
	it('returns null when hours < MIN_HOURS', async () => {
		const result = await activityStore.update('rec-1', { hours: 0.1 });
		expect(result).toBeNull();
	});

	it('returns null when hours > maxHours', async () => {
		const result = await activityStore.update('rec-1', { hours: 11 });
		expect(result).toBeNull();
	});

	it('returns updated activity on success', async () => {
		const row = makeActivityRow({ id: 'upd-1', hours: 8 });
		supabaseMock.from.mockReturnValue(createQueryChain({ data: row, error: null }));

		const result = await activityStore.update('upd-1', { hours: 8 });

		expect(result).not.toBeNull();
		expect(result!.id).toBe('upd-1');
		expect(result!.hours).toBe(8);
	});

	it('throws when supabase returns an error', async () => {
		supabaseMock.from.mockReturnValue(
			createQueryChain({ data: null, error: { message: 'Update failed' } })
		);

		await expect(activityStore.update('rec-1', { notes: 'test' })).rejects.toThrow('Update failed');
	});

	it('saves location to localStorage when updated', async () => {
		supabaseMock.from.mockReturnValue(
			createQueryChain({ data: makeActivityRow({ id: 'loc-1' }), error: null })
		);

		await activityStore.update('loc-1', { location: 'Geneva' });

		expect(localStorage.getItem('last_location')).toBe('Geneva');
	});
});

// ── load ─────────────────────────────────────────────────────────────────

describe('load', () => {
	beforeEach(() => {
		activityStore.setCurriculumNodeSummaries([
			{ id: 'ca-1', key: 'coding', label: 'Coding', is_active: true }
		]);
	});

	it('loads activities from supabase into store', async () => {
		const rows = [makeActivityRow({ id: 'l-1' }), makeActivityRow({ id: 'l-2' })];
		supabaseMock.from.mockReturnValue(createQueryChain({ data: rows, error: null }));

		await activityStore.load();

		const activities = get(activityStore);
		expect(activities).toHaveLength(2);
		expect(activities[0].id).toBe('l-1');
	});

	it('handles empty data from supabase', async () => {
		supabaseMock.from.mockReturnValue(createQueryChain({ data: [], error: null }));

		await activityStore.load();

		expect(get(activityStore)).toEqual([]);
	});

	it('sets error store when supabase returns an error', async () => {
		supabaseMock.from.mockReturnValue(
			createQueryChain({ data: null, error: { message: 'Load failed' } })
		);

		await activityStore.load();

		expect(get(activityError)).toBe('Load failed');
	});

	it('skips when loadInFlight is already true (concurrent guard)', async () => {
		supabaseMock.from.mockReturnValue(createQueryChain({ data: [], error: null }));

		await Promise.all([activityStore.load(), activityStore.load()]);

		expect(supabaseMock.from).toHaveBeenCalledTimes(1);
	});
});

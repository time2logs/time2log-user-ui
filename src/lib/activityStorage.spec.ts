import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ActivityRecord } from './types';

// ---- Supabase mock ----------------------------------------------------------

const supabaseMock = {
	from: vi.fn()
};

vi.mock('./supabaseClient', () => ({
	supabase: supabaseMock
}));

// ---- Helpers ----------------------------------------------------------------

function makeRecord(overrides: Partial<ActivityRecord> = {}): ActivityRecord {
	return {
		id: 'rec-1',
		organization_id: 'org-1',
		profession_id: 'prof-1',
		user_id: 'user-1',
		team_id: null,
		curriculum_activity_id: 'act-1',
		entry_date: '2024-01-15',
		hours: 4,
		notes: null,
		rating: null,
		location: 'Berlin',
		created_at: '2024-01-15T10:00:00Z',
		updated_at: '2024-01-15T10:00:00Z',
		activity_name: 'Diagnose',
		activity_key: 'diagnosis',
		activity_label: '',
		...overrides
	};
}

/** Builds a chainable Supabase query mock that resolves to { data, error }. */
function makeQueryMock(result: { data: unknown; error: unknown }) {
	const chain: Record<string, ReturnType<typeof vi.fn>> = {};
	const methods = ['select', 'insert', 'update', 'delete', 'eq', 'order', 'single'];
	methods.forEach((m) => {
		chain[m] = vi.fn().mockReturnValue(chain);
	});
	// The last call in a chain resolves the promise
	chain['single'] = vi.fn().mockResolvedValue(result);
	// Also make the chain itself a promise (for cases without .single())
	(chain as any).then = undefined;
	// Override select/order/delete to support awaiting
	chain['order'] = vi.fn().mockResolvedValue(result);
	chain['delete'] = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue(result) });

	return chain;
}

// ---- Tests ------------------------------------------------------------------

beforeEach(() => {
	localStorage.clear();
	vi.clearAllMocks();
});

afterEach(() => {
	vi.restoreAllMocks();
});

// ---- Constants --------------------------------------------------------------

describe('exported constants', () => {
	it('MIN_HOURS is 0.5', async () => {
		const { MIN_HOURS } = await import('./activityStorage');
		expect(MIN_HOURS).toBe(0.5);
	});

	it('MAX_HOURS_PER_ENTRY is 10', async () => {
		const { MAX_HOURS_PER_ENTRY } = await import('./activityStorage');
		expect(MAX_HOURS_PER_ENTRY).toBe(10);
	});
});

// ---- validateActivity (tested indirectly via addActivity) -------------------

describe('addActivity — validation', () => {
	it('throws when hours is 0', async () => {
		const { addActivity } = await import('./activityStorage');
		const activity = { ...makeRecord(), hours: 0 };
		await expect(addActivity(activity)).rejects.toThrow(/hours must be a positive number/i);
	});

	it('throws when hours is negative', async () => {
		const { addActivity } = await import('./activityStorage');
		const activity = { ...makeRecord(), hours: -2 };
		await expect(addActivity(activity)).rejects.toThrow(/hours must be a positive number/i);
	});

	it('throws when hours is NaN', async () => {
		const { addActivity } = await import('./activityStorage');
		const activity = { ...makeRecord(), hours: NaN };
		await expect(addActivity(activity)).rejects.toThrow(/hours must be a positive number/i);
	});

	it('throws when hours is below MIN_HOURS (0.4 < 0.5)', async () => {
		const { addActivity } = await import('./activityStorage');
		const activity = { ...makeRecord(), hours: 0.4 };
		await expect(addActivity(activity)).rejects.toThrow(/hours must be a positive number/i);
	});

	it('throws when hours exceed MAX_HOURS_PER_ENTRY (11 > 10)', async () => {
		const { addActivity } = await import('./activityStorage');
		const activity = { ...makeRecord(), hours: 11 };
		await expect(addActivity(activity)).rejects.toThrow(/hours must be a positive number/i);
	});

	it('accepts hours exactly at MIN_HOURS boundary (0.5)', async () => {
		const insertedRow = { ...makeRecord(), id: 'new-id', hours: 0.5 };
		const singleMock = vi.fn().mockResolvedValue({ data: insertedRow, error: null });
		const selectMock = vi.fn().mockReturnValue({ single: singleMock });
		const insertMock = vi.fn().mockReturnValue({ select: selectMock });
		supabaseMock.from.mockReturnValue({ insert: insertMock });

		const { addActivity } = await import('./activityStorage');
		const result = await addActivity({ ...makeRecord(), hours: 0.5 });
		expect(result.hours).toBe(0.5);
	});

	it('accepts hours exactly at MAX_HOURS_PER_ENTRY boundary (10)', async () => {
		const insertedRow = { ...makeRecord(), id: 'new-id', hours: 10 };
		const singleMock = vi.fn().mockResolvedValue({ data: insertedRow, error: null });
		const selectMock = vi.fn().mockReturnValue({ single: singleMock });
		const insertMock = vi.fn().mockReturnValue({ select: selectMock });
		supabaseMock.from.mockReturnValue({ insert: insertMock });

		const { addActivity } = await import('./activityStorage');
		const result = await addActivity({ ...makeRecord(), hours: 10 });
		expect(result.hours).toBe(10);
	});
});

// ---- getLastActivityId ------------------------------------------------------

describe('getLastActivityId', () => {
	it('returns null when nothing is stored', async () => {
		const { getLastActivityId } = await import('./activityStorage');
		expect(getLastActivityId()).toBeNull();
	});

	it('returns stored activity id from localStorage', async () => {
		localStorage.setItem('last_activity_id', 'act-99');
		const { getLastActivityId } = await import('./activityStorage');
		expect(getLastActivityId()).toBe('act-99');
	});
});

// ---- getActivities ----------------------------------------------------------

describe('getActivities', () => {
	it('returns empty array on Supabase error', async () => {
		const queryChain = {
			select: vi.fn().mockReturnThis(),
			order: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } })
		};
		supabaseMock.from.mockReturnValue(queryChain);

		const { getActivities } = await import('./activityStorage');
		const result = await getActivities();
		expect(result).toEqual([]);
	});

	it('returns empty array when data is empty', async () => {
		const queryChain = {
			select: vi.fn().mockReturnThis(),
			order: vi.fn().mockResolvedValue({ data: [], error: null })
		};
		supabaseMock.from.mockReturnValue(queryChain);

		const { getActivities } = await import('./activityStorage');
		const result = await getActivities();
		expect(result).toEqual([]);
	});

	it('maps Supabase rows to ActivityRecord shape', async () => {
		const row = {
			id: 'r1',
			organization_id: 'org-1',
			profession_id: 'prof-1',
			user_id: 'user-1',
			team_id: null,
			curriculum_activity_id: 'act-1',
			entry_date: '2024-01-15',
			hours: 3,
			notes: 'Test note',
			rating: 5,
			location: 'München',
			created_at: '2024-01-15T10:00:00Z',
			updated_at: '2024-01-15T10:00:00Z',
			curriculum_nodes: { id: 'act-1', key: 'diagnosis', label: 'Diagnose' }
		};
		const queryChain = {
			select: vi.fn().mockReturnThis(),
			order: vi.fn().mockResolvedValue({ data: [row], error: null })
		};
		supabaseMock.from.mockReturnValue(queryChain);

		const { getActivities } = await import('./activityStorage');
		const [activity] = await getActivities();

		expect(activity.id).toBe('r1');
		expect(activity.hours).toBe(3);
		expect(activity.activity_name).toBe('Diagnose');
		expect(activity.activity_key).toBe('diagnosis');
		expect(activity.location).toBe('München');
	});

	it('falls back to empty string when location is null', async () => {
		const row = {
			id: 'r2',
			organization_id: 'org-1',
			profession_id: 'prof-1',
			user_id: 'user-1',
			team_id: null,
			curriculum_activity_id: 'act-1',
			entry_date: '2024-01-15',
			hours: 1,
			notes: null,
			rating: null,
			location: null,
			created_at: '2024-01-15T10:00:00Z',
			updated_at: '2024-01-15T10:00:00Z',
			curriculum_nodes: { id: 'act-1', key: 'k', label: 'L' }
		};
		const queryChain = {
			select: vi.fn().mockReturnThis(),
			order: vi.fn().mockResolvedValue({ data: [row], error: null })
		};
		supabaseMock.from.mockReturnValue(queryChain);

		const { getActivities } = await import('./activityStorage');
		const [activity] = await getActivities();
		expect(activity.location).toBe('');
	});
});

// ---- deleteActivity ---------------------------------------------------------

describe('deleteActivity', () => {
	it('calls supabase delete with the correct id', async () => {
		const eqMock = vi.fn().mockResolvedValue({ error: null });
		const deleteMock = vi.fn().mockReturnValue({ eq: eqMock });
		supabaseMock.from.mockReturnValue({ delete: deleteMock });

		const { deleteActivity } = await import('./activityStorage');
		await deleteActivity('rec-1');

		expect(deleteMock).toHaveBeenCalled();
		expect(eqMock).toHaveBeenCalledWith('id', 'rec-1');
	});

	it('throws on Supabase error', async () => {
		const eqMock = vi.fn().mockResolvedValue({ error: { message: 'Delete failed' } });
		const deleteMock = vi.fn().mockReturnValue({ eq: eqMock });
		supabaseMock.from.mockReturnValue({ delete: deleteMock });

		const { deleteActivity } = await import('./activityStorage');
		await expect(deleteActivity('rec-1')).rejects.toThrow('Delete failed');
	});
});

// ---- addActivity (success path) ---------------------------------------------

describe('addActivity', () => {
	it('stores last activity id in localStorage on success', async () => {
		const insertedRow = { ...makeRecord(), id: 'new-id' };
		const singleMock = vi.fn().mockResolvedValue({ data: insertedRow, error: null });
		const selectMock = vi.fn().mockReturnValue({ single: singleMock });
		const insertMock = vi.fn().mockReturnValue({ select: selectMock });
		supabaseMock.from.mockReturnValue({ insert: insertMock });

		const { addActivity } = await import('./activityStorage');
		const activity = makeRecord({ id: undefined as any, created_at: undefined as any, updated_at: undefined as any });
		await addActivity(activity);

		expect(localStorage.getItem('last_activity_id')).toBe(activity.curriculum_activity_id);
	});

	it('throws when Supabase returns an error', async () => {
		const singleMock = vi.fn().mockResolvedValue({ data: null, error: { message: 'Insert failed' } });
		const selectMock = vi.fn().mockReturnValue({ single: singleMock });
		const insertMock = vi.fn().mockReturnValue({ select: selectMock });
		supabaseMock.from.mockReturnValue({ insert: insertMock });

		const { addActivity } = await import('./activityStorage');
		const activity = makeRecord({ id: undefined as any, created_at: undefined as any, updated_at: undefined as any });
		await expect(addActivity(activity)).rejects.toThrow('Insert failed');
	});
});

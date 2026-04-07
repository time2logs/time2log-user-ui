import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ActivityRecord } from './types';

const supabaseMock = { from: vi.fn() };

vi.mock('./supabaseClient', () => ({ supabase: supabaseMock }));

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

function makeInsertMock(result: { data: unknown; error: unknown }) {
	const singleMock = vi.fn().mockResolvedValue(result);
	const selectMock = vi.fn().mockReturnValue({ single: singleMock });
	const insertMock = vi.fn().mockReturnValue({ select: selectMock });
	return { insertMock, selectMock, singleMock };
}

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

	it('MAX_HOURS_PER_ENTRY equals 10', async () => {
		// Arrange
		const { MAX_HOURS_PER_ENTRY } = await import('./activityStorage');

		// Act

		// Assert
		expect(MAX_HOURS_PER_ENTRY).toBe(10);
	});
});

describe('addActivity — validation', () => {
	it('throws when hours is 0', async () => {
		// Arrange
		const { addActivity } = await import('./activityStorage');
		const activity = { ...makeRecord(), hours: 0 };

		// Act und Assert
		await expect(addActivity(activity)).rejects.toThrow(/hours must be a positive number/i);
	});

	it('throws when hours is negative', async () => {
		// Arrange
		const { addActivity } = await import('./activityStorage');
		const activity = { ...makeRecord(), hours: -2 };

		// Act und  Assert
		await expect(addActivity(activity)).rejects.toThrow(/hours must be a positive number/i);
	});

	it('throws when hours is NaN', async () => {
		// Arrange
		const { addActivity } = await import('./activityStorage');
		const activity = { ...makeRecord(), hours: NaN };

		// Act und Assert
		await expect(addActivity(activity)).rejects.toThrow(/hours must be a positive number/i);
	});

	it('throws when hours are below MIN_HOURS (0.9 < 1)', async () => {
		// Arrange
		const { addActivity } = await import('./activityStorage');
		const activity = { ...makeRecord(), hours: 0.9 };

		// Act und Assert
		await expect(addActivity(activity)).rejects.toThrow(/hours must be a positive number/i);
	});

	it('throws when hours exceed MAX_HOURS_PER_ENTRY (11 > 10)', async () => {
		// Arrange
		const { addActivity } = await import('./activityStorage');
		const activity = { ...makeRecord(), hours: 11 };

		// Act und Assert
		await expect(addActivity(activity)).rejects.toThrow(/hours must be a positive number/i);
	});

	it('accepts hours exactly at the MIN_HOURS lower boundary (1)', async () => {
		// Arrange
		const insertedRow = { ...makeRecord(), id: 'new-id', hours: 1 };
		const { insertMock } = makeInsertMock({ data: insertedRow, error: null });
		supabaseMock.from.mockReturnValue({ insert: insertMock });
		const { addActivity } = await import('./activityStorage');

		// Act
		const result = await addActivity({ ...makeRecord(), hours: 1 });

		// Assert
		expect(result.hours).toBe(1);
	});

	it('accepts hours exactly at the MAX_HOURS_PER_ENTRY upper boundary (10)', async () => {
		// Arrange
		const insertedRow = { ...makeRecord(), id: 'new-id', hours: 10 };
		const { insertMock } = makeInsertMock({ data: insertedRow, error: null });
		supabaseMock.from.mockReturnValue({ insert: insertMock });
		const { addActivity } = await import('./activityStorage');

		// Act
		const result = await addActivity({ ...makeRecord(), hours: 10 });

		// Assert
		expect(result.hours).toBe(10);
	});

	it('throws when hours are 0.5 (below new MIN_HOURS of 1)', async () => {
		// Arrange
		const { addActivity } = await import('./activityStorage');
		const activity = { ...makeRecord(), hours: 0.5 };

		// Act und Assert
		await expect(addActivity(activity)).rejects.toThrow(/hours must be a positive number/i);
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

describe('getActivities', () => {
	it('returns an empty array when Supabase reports an error', async () => {
		// Arrange
		const queryChain = {
			select: vi.fn().mockReturnThis(),
			order: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } })
		};
		supabaseMock.from.mockReturnValue(queryChain);
		const { getActivities } = await import('./activityStorage');

		// Act
		const result = await getActivities();

		// Assert
		expect(result).toEqual([]);
	});

	it('returns an empty array when Supabase returns no rows', async () => {
		// Arrange
		const queryChain = {
			select: vi.fn().mockReturnThis(),
			order: vi.fn().mockResolvedValue({ data: [], error: null })
		};
		supabaseMock.from.mockReturnValue(queryChain);
		const { getActivities } = await import('./activityStorage');

		// Act
		const result = await getActivities();

		// Assert
		expect(result).toEqual([]);
	});

	it('maps Supabase rows to the ActivityRecord shape', async () => {
		// Arrange
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
			updated_at: '2024-01-15T10:00:00Z'
		};
		const queryChain = {
			select: vi.fn().mockReturnThis(),
			order: vi.fn().mockResolvedValue({ data: [row], error: null })
		};
		supabaseMock.from.mockReturnValue(queryChain);
		const { getActivities, activityStore } = await import('./activityStorage');
		activityStore.setCurriculumNodeSummaries([
			{ id: 'act-1', key: 'diagnosis', label: 'Diagnose', is_active: true }
		]);

		// Act
		const [activity] = await getActivities();

		// Assert
		expect(activity.id).toBe('r1');
		expect(activity.hours).toBe(3);
		expect(activity.activity_name).toBe('Diagnose');
		expect(activity.activity_key).toBe('diagnosis');
		expect(activity.location).toBe('München');
	});

	it('falls back to an empty string when location is null', async () => {
		// Arrange
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
			updated_at: '2024-01-15T10:00:00Z'
		};
		const queryChain = {
			select: vi.fn().mockReturnThis(),
			order: vi.fn().mockResolvedValue({ data: [row], error: null })
		};
		supabaseMock.from.mockReturnValue(queryChain);
		const { getActivities, activityStore } = await import('./activityStorage');
		activityStore.setCurriculumNodeSummaries([
			{ id: 'act-1', key: 'k', label: 'L', is_active: true }
		]);

		// Act
		const [activity] = await getActivities();

		// Assert
		expect(activity.location).toBe('');
	});
});

describe('deleteActivity', () => {
	it('calls supabase.delete with the correct record id', async () => {
		// Arrange
		const eqMock = vi.fn().mockResolvedValue({ error: null });
		const deleteMock = vi.fn().mockReturnValue({ eq: eqMock });
		supabaseMock.from.mockReturnValue({ delete: deleteMock });
		const { deleteActivity } = await import('./activityStorage');

		// Act
		await deleteActivity('rec-1');

		// Assert
		expect(deleteMock).toHaveBeenCalled();
		expect(eqMock).toHaveBeenCalledWith('id', 'rec-1');
	});

	it('throws when Supabase returns an error', async () => {
		// Arrange
		const eqMock = vi.fn().mockResolvedValue({ error: { message: 'Delete failed' } });
		const deleteMock = vi.fn().mockReturnValue({ eq: eqMock });
		supabaseMock.from.mockReturnValue({ delete: deleteMock });
		const { deleteActivity } = await import('./activityStorage');

		// Actu nnd Assert
		await expect(deleteActivity('rec-1')).rejects.toThrow('Delete failed');
	});
});

describe('addActivity — success path', () => {
	it('persists the last activity id in localStorage after a successful insert', async () => {
		// Arrange
		const insertedRow = { ...makeRecord(), id: 'new-id' };
		const { insertMock } = makeInsertMock({ data: insertedRow, error: null });
		supabaseMock.from.mockReturnValue({ insert: insertMock });
		const { addActivity } = await import('./activityStorage');
		const activity = makeRecord({
			id: undefined as never,
			created_at: undefined as never,
			updated_at: undefined as never
		});

		// Act
		await addActivity(activity);

		// Assert
		expect(localStorage.getItem('last_activity_id')).toBe(activity.curriculum_activity_id);
	});

	it('throws when Supabase returns an insert error', async () => {
		// Arrange
		const { insertMock } = makeInsertMock({ data: null, error: { message: 'Insert failed' } });
		supabaseMock.from.mockReturnValue({ insert: insertMock });
		const { addActivity } = await import('./activityStorage');
		const activity = makeRecord({
			id: undefined as never,
			created_at: undefined as never,
			updated_at: undefined as never
		});

		// Act und  Assert
		await expect(addActivity(activity)).rejects.toThrow('Insert failed');
	});
});

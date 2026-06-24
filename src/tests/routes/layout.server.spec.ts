import { describe, expect, it, vi, beforeEach } from 'vitest';
import { isRedirect } from '@sveltejs/kit';

vi.mock('$lib/paraglide/messages.js', () => ({
	error_edit_window_delete: () => 'edit_window',
	error_edit_window_update: () => 'edit_window'
}));

import { load } from '../../routes/+layout.server';

type Result = { data: unknown; error: { message?: string } | null };

function makeLocals(
	opts: {
		session?: { user: { id: string } } | null;
		profile?: unknown;
		profileError?: Result['error'];
		teamMembers?: unknown[];
		team?: unknown;
		teamError?: Result['error'];
		nodes?: unknown;
		nodesError?: Result['error'];
		summary?: unknown;
		org?: unknown;
		profession?: unknown;
	} = {}
) {
	const session = opts.session ?? null;

	function chain(result: Result) {
		return {
			select: vi.fn().mockReturnThis(),
			eq: vi.fn().mockReturnThis(),
			order: vi.fn().mockReturnThis(),
			limit: vi.fn().mockReturnThis(),
			single: vi.fn().mockResolvedValue(result),
			then: (resolve: (v: Result) => void, reject?: (e: unknown) => void) =>
				Promise.resolve(result).then(resolve, reject)
		};
	}

	const supabaseAdmin = {
		from: vi.fn((table: string) => {
			if (table === 'team_members') {
				return chain({ data: opts.teamMembers ?? [], error: null });
			}
			if (table === 'teams') {
				return chain({ data: opts.team ?? null, error: opts.teamError ?? null });
			}
			if (table === 'curriculum_nodes') {
				if (opts.summary && !opts.nodes) {
					return chain({ data: opts.summary, error: null });
				}
				return chain({ data: opts.nodes ?? null, error: opts.nodesError ?? null });
			}
			if (table === 'organizations') {
				return chain({ data: opts.org ?? null, error: null });
			}
			if (table === 'professions') {
				return chain({ data: opts.profession ?? null, error: null });
			}
			return chain({ data: null, error: null });
		})
	};

	const supabase = {
		from: vi.fn(() => chain({ data: opts.profile ?? null, error: opts.profileError ?? null }))
	};

	return {
		safeGetSession: vi.fn().mockResolvedValue(session),
		supabase,
		supabaseAdmin
	} as unknown as App.Locals;
}

function makeUrl(pathname: string) {
	return new URL(`http://localhost${pathname}`);
}

beforeEach(() => {
	vi.clearAllMocks();
});

// ── No session ────────────────────────────────────────────────────────────

describe('load — no session', () => {
	it('redirects to /login for a protected path', async () => {
		const locals = makeLocals({ session: null });
		try {
			await load({ locals, url: makeUrl('/dashboard') } as never);
			expect.fail('Should have thrown redirect');
		} catch (e) {
			expect(isRedirect(e)).toBe(true);
			expect((e as { status: number }).status).toBe(303);
			expect((e as { location: string }).location).toBe('/login');
		}
	});

	it('returns empty data for a public path (/)', async () => {
		const locals = makeLocals({ session: null });
		const result = (await load({ locals, url: makeUrl('/') } as never)) as Record<string, unknown>;
		expect(result.profile).toBeNull();
		expect(result.teamMember).toBeNull();
	});

	it('returns empty data for /login', async () => {
		const locals = makeLocals({ session: null });
		const result = (await load({ locals, url: makeUrl('/login') } as never)) as Record<
			string,
			unknown
		>;
		expect(result.profile).toBeNull();
	});

	it('returns empty data for /forgot-password', async () => {
		const locals = makeLocals({ session: null });
		const result = (await load({ locals, url: makeUrl('/forgot-password') } as never)) as Record<
			string,
			unknown
		>;
		expect(result.profile).toBeNull();
	});

	it('returns empty data for /onboarding', async () => {
		const locals = makeLocals({ session: null });
		const result = (await load({ locals, url: makeUrl('/onboarding') } as never)) as Record<
			string,
			unknown
		>;
		expect(result.profile).toBeNull();
	});

	it('returns empty data for /reset-password', async () => {
		const locals = makeLocals({ session: null });
		const result = (await load({ locals, url: makeUrl('/reset-password') } as never)) as Record<
			string,
			unknown
		>;
		expect(result.profile).toBeNull();
	});
});

// ── Session but incomplete onboarding ──────────────────────────────────────

describe('load — session with incomplete onboarding', () => {
	it('redirects to /onboarding when onboarding_status is not completed', async () => {
		const locals = makeLocals({
			session: { user: { id: 'u1' } },
			profile: { onboarding_status: 'pending', id: 'u1' }
		});
		try {
			await load({ locals, url: makeUrl('/dashboard') } as never);
			expect.fail('Should have thrown redirect');
		} catch (e) {
			expect(isRedirect(e)).toBe(true);
			expect((e as { location: string }).location).toBe('/onboarding');
		}
	});

	it('does not redirect when onboarding_status is not completed but path is /onboarding', async () => {
		const locals = makeLocals({
			session: { user: { id: 'u1' } },
			profile: { onboarding_status: 'pending', id: 'u1' }
		});
		const result = (await load({ locals, url: makeUrl('/onboarding') } as never)) as Record<
			string,
			unknown
		>;
		expect(result.profile).toEqual({ onboarding_status: 'pending', id: 'u1' });
	});
});

// ── Session with no team member ────────────────────────────────────────────

describe('load — session without team membership', () => {
	it('returns nulls when team_members query returns no rows', async () => {
		const locals = makeLocals({
			session: { user: { id: 'u1' } },
			profile: { onboarding_status: 'completed', id: 'u1' },
			teamMembers: []
		});
		const result = (await load({ locals, url: makeUrl('/dashboard') } as never)) as Record<
			string,
			unknown
		>;
		expect(result.teamMember).toBeNull();
		expect(result.organization).toBeNull();
		expect(result.curriculumNodes).toEqual([]);
	});
});

// ── Full authenticated flow ────────────────────────────────────────────────

describe('load — fully authenticated', () => {
	it('returns all data when queries succeed', async () => {
		const locals = makeLocals({
			session: { user: { id: 'u1' } },
			profile: { onboarding_status: 'completed', id: 'u1', first_name: 'Anna' },
			teamMembers: [{ team_id: 't1', user_id: 'u1' }],
			team: { organization_id: 'org-1', profession_id: 'prof-1' },
			nodes: [{ id: 'n1', key: 'k', label: 'Label' }],
			summary: [{ id: 'n1', key: 'k', label: 'Label', is_active: true }],
			org: { id: 'org-1', name: 'Acme', target_hours: 4000 },
			profession: { label: 'Developer' }
		});
		const result = (await load({ locals, url: makeUrl('/dashboard') } as never)) as Record<
			string,
			unknown
		>;
		expect(result.profile).toEqual(expect.objectContaining({ first_name: 'Anna' }));
		expect(result.teamMember).toEqual(expect.objectContaining({ organization_id: 'org-1' }));
		expect(result.curriculumNodes).toHaveLength(1);
		expect(result.organization).toEqual(expect.objectContaining({ name: 'Acme' }));
		expect(result.professionLabel).toBe('Developer');
	});
});

// ── Error resilience ──────────────────────────────────────────────────────

describe('load — error resilience', () => {
	it('returns null teamMember when team query fails', async () => {
		const locals = makeLocals({
			session: { user: { id: 'u1' } },
			profile: { onboarding_status: 'completed', id: 'u1' },
			teamMembers: [{ team_id: 't1', user_id: 'u1' }],
			team: null,
			teamError: { message: 'team error' }
		});
		const result = (await load({ locals, url: makeUrl('/dashboard') } as never)) as Record<
			string,
			unknown
		>;
		expect(result.teamMember).toBeNull();
	});

	it('returns empty curriculum nodes when nodes query fails', async () => {
		const locals = makeLocals({
			session: { user: { id: 'u1' } },
			profile: { onboarding_status: 'completed', id: 'u1' },
			teamMembers: [{ team_id: 't1', user_id: 'u1' }],
			team: { organization_id: 'org-1', profession_id: 'prof-1' },
			nodes: null,
			nodesError: { message: 'nodes error' }
		});
		const result = (await load({ locals, url: makeUrl('/dashboard') } as never)) as Record<
			string,
			unknown
		>;
		expect(result.curriculumNodes).toEqual([]);
	});

	it('returns safe defaults when an unexpected exception occurs', async () => {
		const locals = {
			safeGetSession: vi.fn().mockRejectedValue(new Error('Connection refused'))
		} as unknown as App.Locals;
		const result = (await load({ locals, url: makeUrl('/dashboard') } as never)) as Record<
			string,
			unknown
		>;
		expect(result.profile).toBeNull();
		expect(result.teamMember).toBeNull();
		expect(result.curriculumNodes).toEqual([]);
	});
});

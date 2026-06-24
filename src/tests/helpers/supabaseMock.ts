import { vi } from 'vitest';

type QueryResult<T = unknown> = { data: T | null; error: { message?: string } | null };

/**
 * Creates a chainable mock of the PostgREST query builder returned by
 * `supabase.from(...)`. Every builder method (`.insert()`, `.eq()`, etc.)
 * returns the chain itself, while `.single()` resolves to the configured
 * result. The chain is also thenable so `await supabase.from(...).select()`
 * works without a terminal call.
 *
 * Usage:
 *   const chain = createQueryChain({ data: [...], error: null });
 *   vi.mocked(supabase.from).mockReturnValue(chain);
 */
export function createQueryChain(result: QueryResult = { data: null, error: null }) {
	const chain: Record<string, unknown> = {};

	// Builder methods that return the chain for further chaining
	for (const method of [
		'insert',
		'update',
		'delete',
		'upsert',
		'select',
		'eq',
		'neq',
		'order',
		'limit',
		'range',
		'in',
		'gt',
		'lt',
		'gte',
		'lte'
	]) {
		chain[method] = vi.fn().mockReturnValue(chain);
	}

	// Terminal: .single() resolves to the configured result
	chain['single'] = vi.fn().mockResolvedValue(result);

	// Make the chain thenable so `await chain` resolves to result
	chain['then'] = (
		resolve: (v: QueryResult) => void | PromiseLike<void>,
		reject?: (e: unknown) => void | PromiseLike<void>
	) => Promise.resolve(result).then(resolve, reject);

	return chain as unknown as Record<string, ReturnType<typeof vi.fn>>;
}

/**
 * Creates a complete supabase client mock with a configurable `from()` factory.
 *
 * Pass a map of table-name → result to auto-configure responses:
 *   const client = createSupabaseMock({ activity_records: { data: [...], error: null } });
 */
export function createSupabaseMock(
	tableResults: Record<string, QueryResult> = {},
	defaultResult: QueryResult = { data: null, error: null }
) {
	const chainsCreated: Record<string, unknown>[] = [];

	const from = vi.fn((table: string) => {
		const result = tableResults[table] ?? defaultResult;
		const chain = createQueryChain(result);
		chainsCreated.push(chain);
		return chain;
	});

	return {
		from,
		auth: {
			signInWithPassword: vi.fn().mockResolvedValue({ data: {}, error: null }),
			signOut: vi.fn().mockResolvedValue({ error: null }),
			getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
			getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
			updateUser: vi.fn().mockResolvedValue({ data: {}, error: null }),
			reauthenticate: vi.fn().mockResolvedValue({ data: {}, error: null }),
			resetPasswordForEmail: vi.fn().mockResolvedValue({ data: {}, error: null })
		},
		rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
		storage: {
			from: vi.fn(() => ({
				upload: vi.fn().mockResolvedValue({ error: null }),
				getPublicUrl: vi
					.fn()
					.mockReturnValue({ data: { publicUrl: 'https://example.com/avatar.jpg' } })
			}))
		},
		schema: vi.fn().mockReturnThis(),
		_chainsCreated: chainsCreated
	};
}

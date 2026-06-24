import { describe, expect, it, vi } from 'vitest';

vi.mock('./supabaseClient', () => ({ supabase: { from: vi.fn() } }));

import { unwrapSupabase } from './supabaseUtils';

describe('unwrapSupabase', () => {
	it('returns data when there is no error', () => {
		const result = unwrapSupabase({ data: { id: 1 }, error: null }, 'test context');
		expect(result).toEqual({ id: 1 });
	});

	it('returns null data as null', () => {
		const result = unwrapSupabase<{ id: number }>({ data: null, error: null }, 'test');
		expect(result).toBeNull();
	});

	it('throws with error.message when error has a message', () => {
		expect(() =>
			unwrapSupabase({ data: null, error: { message: 'Something broke' } }, 'ctx')
		).toThrow('Something broke');
	});

	it('throws with context as fallback when error has no message', () => {
		expect(() => unwrapSupabase({ data: null, error: {} }, 'Fallback context')).toThrow(
			'Fallback context'
		);
	});

	it('throws with context when error is null-ish but truthy', () => {
		// Edge: error key exists but message is undefined
		expect(() => unwrapSupabase({ data: null, error: { message: '' } }, 'Ctx')).toThrow('Ctx');
	});
});

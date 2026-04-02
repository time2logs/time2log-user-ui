import { describe, expect, it } from 'vitest';
import { cn } from './utils';

describe('cn', () => {
	it('joins single class name', () => {
		expect(cn('foo')).toBe('foo');
	});

	it('joins multiple class names', () => {
		expect(cn('foo', 'bar', 'baz')).toBe('foo bar baz');
	});

	it('ignores falsy values', () => {
		expect(cn('foo', false, undefined, null, 0 as any)).toBe('foo');
	});

	it('handles conditional (false && ...) expressions', () => {
		const active = false;
		expect(cn('base', active && 'active')).toBe('base');
	});

	it('handles conditional (true && ...) expressions', () => {
		const active = true;
		expect(cn('base', active && 'active')).toBe('base active');
	});

	it('handles object syntax (clsx feature)', () => {
		expect(cn({ foo: true, bar: false, baz: true })).toBe('foo baz');
	});

	it('merges conflicting tailwind classes — last one wins', () => {
		expect(cn('px-2', 'px-4')).toBe('px-4');
		expect(cn('text-sm text-red-500', 'text-lg')).toBe('text-red-500 text-lg');
	});

	it('handles array input', () => {
		expect(cn(['foo', 'bar'])).toBe('foo bar');
	});

	it('handles nested arrays with conditions', () => {
		expect(cn(['foo', false && 'bar', 'baz'])).toBe('foo baz');
	});

	it('returns empty string for all falsy inputs', () => {
		expect(cn(false, undefined, null)).toBe('');
	});
});

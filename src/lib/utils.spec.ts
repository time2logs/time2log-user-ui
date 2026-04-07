import { describe, expect, it } from 'vitest';
import { cn } from './utils';

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
		const a = 'foo', b = 'bar', c = 'baz';

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

	it('handles nested arrays with conditions', () => {
		// Arrange
		const input = ['foo', false && 'bar', 'baz'];

		// Act
		const result = cn(input);

		// Assert
		expect(result).toBe('foo baz');
	});

	it('returns empty string for all falsy inputs', () => {
		// Arrange
		const inputs = [false, undefined, null] as never[];

		// Act
		const result = cn(...inputs);

		// Assert
		expect(result).toBe('');
	});
});

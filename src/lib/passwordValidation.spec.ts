import { describe, expect, it } from 'vitest';
import { validatePassword, PASSWORD_MIN_LENGTH } from './passwordValidation';

describe('PASSWORD_MIN_LENGTH', () => {
	it('is 8', () => {
		expect(PASSWORD_MIN_LENGTH).toBe(8);
	});
});

describe('validatePassword', () => {
	it('returns null for a valid password', () => {
		expect(validatePassword('ValidPass1!')).toBeNull();
	});

	it('returns "length" for empty password', () => {
		expect(validatePassword('')).toBe('length');
	});

	it('returns "length" for short password', () => {
		expect(validatePassword('Ab1!')).toBe('length');
	});

	it('returns "length" for password exactly 1 below minimum', () => {
		expect(validatePassword('Aa1!567')).toBe('length');
	});

	it('accepts password at minimum length with all rules', () => {
		expect(validatePassword('Aa1!5678')).toBeNull();
	});

	it('returns "uppercase" for password without uppercase', () => {
		expect(validatePassword('validpass1!')).toBe('uppercase');
	});

	it('returns "number" for password without digit', () => {
		expect(validatePassword('ValidPass!')).toBe('number');
	});

	it('returns "special" for password without special char', () => {
		expect(validatePassword('ValidPass1')).toBe('special');
	});

	it('checks rules in order: length first', () => {
		expect(validatePassword('a1!')).toBe('length');
	});

	it('checks rules in order: uppercase before number', () => {
		expect(validatePassword('validpass1!')).toBe('uppercase');
	});

	it('checks rules in order: number before special', () => {
		expect(validatePassword('ValidPass!')).toBe('number');
	});

	it('accepts various special characters', () => {
		expect(validatePassword('ValidPass1@')).toBeNull();
		expect(validatePassword('ValidPass1#')).toBeNull();
		expect(validatePassword('ValidPass1(')).toBeNull();
		expect(validatePassword('ValidPass1[')).toBeNull();
	});
});

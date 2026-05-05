import { describe, it, expect } from 'vitest';
import { validatePassword } from './passwordRules';
import * as m from '$lib/paraglide/messages.js';

describe('validatePassword', () => {
	it('returns null for a valid password', () => {
		expect(validatePassword('Abcdef1!')).toBeNull();
	});

	it('rejects passwords shorter than 8 characters', () => {
		expect(validatePassword('Ab1!')).toBe(m.onboarding_error_password_length);
	});

	it('rejects passwords without an uppercase letter', () => {
		expect(validatePassword('abcdef1!')).toBe(m.onboarding_error_password_uppercase);
	});

	it('rejects passwords without a digit', () => {
		expect(validatePassword('Abcdefg!')).toBe(m.onboarding_error_password_number);
	});

	it('rejects passwords without a special character', () => {
		expect(validatePassword('Abcdef12')).toBe(m.onboarding_error_password_special);
	});

	it('rejects empty input as too short', () => {
		expect(validatePassword('')).toBe(m.onboarding_error_password_length);
	});
});

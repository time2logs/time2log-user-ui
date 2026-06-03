import { describe, expect, it, vi } from 'vitest';

vi.mock('$lib/paraglide/messages.js', () => ({
	settings_error_name_required: () => 'name_required',
	settings_error_file_too_large: () => 'file_too_large',
	settings_error_file_type: () => 'file_type',
	onboarding_error_email_missing: () => 'email_missing',
	settings_error_email_unchanged: () => 'email_unchanged',
	settings_error_password_mismatch: () => 'password_mismatch',
	onboarding_error_password_length: () => 'password_length',
	onboarding_error_password_uppercase: () => 'password_uppercase',
	onboarding_error_password_number: () => 'password_number',
	onboarding_error_password_special: () => 'password_special',
	location_already_exists: () => 'location_exists'
}));

vi.mock('$lib/server/avatarValidation', () => ({
	validateImageMagicBytes: vi.fn().mockResolvedValue('jpg')
}));

import { actions } from './+page.server';

type ActionEvent = Parameters<NonNullable<(typeof actions)[keyof typeof actions]>>[0];

function makeLocals(email = 'current@example.com'): App.Locals {
	return {
		safeGetSession: vi.fn().mockResolvedValue({ user: { id: 'user-1', email } })
	} as unknown as App.Locals;
}

function makeRequest(data: Record<string, string>): Request {
	const fd = new FormData();
	for (const [k, v] of Object.entries(data)) fd.append(k, v);
	return { formData: () => Promise.resolve(fd) } as unknown as Request;
}

// ── updatePassword ────────────────────────────────────────────────────────

describe('updatePassword action', () => {
	it('fails 400 when passwords do not match', async () => {
		const result = await actions.updatePassword({
			request: makeRequest({ password: 'Secret1!', confirm_password: 'Different1!' }),
			locals: makeLocals()
		} as ActionEvent);
		expect(result.status).toBe(400);
		expect(result.data.passwordError).toBe('password_mismatch');
	});

	it('fails 400 when password is shorter than 8 characters', async () => {
		const result = await actions.updatePassword({
			request: makeRequest({ password: 'S1!', confirm_password: 'S1!' }),
			locals: makeLocals()
		} as ActionEvent);
		expect(result.status).toBe(400);
		expect(result.data.passwordError).toBe('password_length');
	});

	it('fails 400 when password has no uppercase letter', async () => {
		const result = await actions.updatePassword({
			request: makeRequest({ password: 'secret1!', confirm_password: 'secret1!' }),
			locals: makeLocals()
		} as ActionEvent);
		expect(result.status).toBe(400);
		expect(result.data.passwordError).toBe('password_uppercase');
	});

	it('fails 400 when password has no digit', async () => {
		const result = await actions.updatePassword({
			request: makeRequest({ password: 'SecretA!', confirm_password: 'SecretA!' }),
			locals: makeLocals()
		} as ActionEvent);
		expect(result.status).toBe(400);
		expect(result.data.passwordError).toBe('password_number');
	});

	it('fails 400 when password has no special character', async () => {
		const result = await actions.updatePassword({
			request: makeRequest({ password: 'Secret123', confirm_password: 'Secret123' }),
			locals: makeLocals()
		} as ActionEvent);
		expect(result.status).toBe(400);
		expect(result.data.passwordError).toBe('password_special');
	});
});

// ── updateEmail ───────────────────────────────────────────────────────────

describe('updateEmail action', () => {
	it('fails 400 when email is empty', async () => {
		const result = await actions.updateEmail({
			request: makeRequest({ email: '' }),
			locals: makeLocals()
		} as ActionEvent);
		expect(result.status).toBe(400);
		expect(result.data.emailError).toBe('email_missing');
	});

	it('fails 400 when email is the same as the current one', async () => {
		const result = await actions.updateEmail({
			request: makeRequest({ email: 'current@example.com' }),
			locals: makeLocals('current@example.com')
		} as ActionEvent);
		expect(result.status).toBe(400);
		expect(result.data.emailError).toBe('email_unchanged');
	});
});

// ── updateProfile ─────────────────────────────────────────────────────────

describe('updateProfile action', () => {
	it('fails 400 when first_name is missing', async () => {
		const result = await actions.updateProfile({
			request: makeRequest({ first_name: '', last_name: 'Meier' }),
			locals: makeLocals()
		} as ActionEvent);
		expect(result.status).toBe(400);
		expect(result.data.profileError).toBe('name_required');
	});

	it('fails 400 when last_name is missing', async () => {
		const result = await actions.updateProfile({
			request: makeRequest({ first_name: 'Anna', last_name: '' }),
			locals: makeLocals()
		} as ActionEvent);
		expect(result.status).toBe(400);
		expect(result.data.profileError).toBe('name_required');
	});

	it('fails 400 when avatar file exceeds 512 KB', async () => {
		const largeFile = new File([new Uint8Array(600 * 1024)], 'avatar.jpg', { type: 'image/jpeg' });
		const fd = new FormData();
		fd.append('first_name', 'Anna');
		fd.append('last_name', 'Meier');
		fd.append('avatar', largeFile);
		const result = await actions.updateProfile({
			request: { formData: () => Promise.resolve(fd) } as unknown as Request,
			locals: makeLocals()
		} as ActionEvent);
		expect(result.status).toBe(400);
		expect(result.data.profileError).toBe('file_too_large');
	});
});

// ── addLocation ───────────────────────────────────────────────────────────

describe('addLocation action', () => {
	it('fails 400 when location is empty', async () => {
		const result = await actions.addLocation({
			request: makeRequest({ location: '' }),
			locals: makeLocals()
		} as ActionEvent);
		expect(result.status).toBe(400);
		expect(result.data.locationError).toBe('Standort darf nicht leer sein.');
	});
});

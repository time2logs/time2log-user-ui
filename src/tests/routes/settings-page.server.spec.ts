import { describe, expect, it, vi } from 'vitest';

type FailResult = { status: number; data: Record<string, unknown> };

vi.mock('$lib/paraglide/messages.js', () => ({
	settings_error_name_required: () => 'name_required',
	settings_error_file_too_large: () => 'file_too_large',
	settings_error_file_type: () => 'file_type',
	onboarding_error_email_missing: () => 'email_missing',
	settings_error_current_email_required: () => 'current_email_required',
	settings_error_email_otp_required: () => 'otp_required',
	settings_error_email_unchanged: () => 'email_unchanged',
	settings_error_password_mismatch: () => 'password_mismatch',
	onboarding_error_password_length: () => 'password_length',
	onboarding_error_password_uppercase: () => 'password_uppercase',
	onboarding_error_password_number: () => 'password_number',
	onboarding_error_password_special: () => 'password_special'
}));

vi.mock('$lib/server/avatarValidation', () => ({
	validateImageMagicBytes: vi.fn().mockResolvedValue('jpg')
}));

import { actions } from '../../routes/settings/+page.server';

beforeEach(() => {
	resetRateLimiter();
});

function makeLocals(email = 'current@example.com'): App.Locals {
	return {
		safeGetSession: vi.fn().mockResolvedValue({ user: { id: 'user-1', email } }),
		supabase: { auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { email } } }) } }
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
		const result = (await actions.updatePassword({
			request: makeRequest({ password: 'Secret1!', confirm_password: 'Different1!' }),
			locals: makeLocals()
		} as never)) as FailResult;
		expect(result.status).toBe(400);
		expect(result.data.passwordError).toBe('password_mismatch');
	});

	it('fails 400 when password is shorter than 8 characters', async () => {
		const result = (await actions.updatePassword({
			request: makeRequest({ password: 'S1!', confirm_password: 'S1!' }),
			locals: makeLocals()
		} as never)) as FailResult;
		expect(result.status).toBe(400);
		expect(result.data.passwordError).toBe('password_length');
	});

	it('fails 400 when password has no uppercase letter', async () => {
		const result = (await actions.updatePassword({
			request: makeRequest({ password: 'secret1!', confirm_password: 'secret1!' }),
			locals: makeLocals()
		} as never)) as FailResult;
		expect(result.status).toBe(400);
		expect(result.data.passwordError).toBe('password_uppercase');
	});

	it('fails 400 when password has no digit', async () => {
		const result = (await actions.updatePassword({
			request: makeRequest({ password: 'SecretA!', confirm_password: 'SecretA!' }),
			locals: makeLocals()
		} as never)) as FailResult;
		expect(result.status).toBe(400);
		expect(result.data.passwordError).toBe('password_number');
	});

	it('fails 400 when password has no special character', async () => {
		const result = (await actions.updatePassword({
			request: makeRequest({ password: 'Secret123', confirm_password: 'Secret123' }),
			locals: makeLocals()
		} as never)) as FailResult;
		expect(result.status).toBe(400);
		expect(result.data.passwordError).toBe('password_special');
	});
});

// ── updateEmail ───────────────────────────────────────────────────────────

describe('updateEmail action', () => {
	it('fails 400 when current email is not confirmed', async () => {
		const result = await actions.updateEmail({
			request: makeRequest({
				current_email: 'wrong@example.com',
				email: 'new@example.com',
				otp: '123456'
			}),
			locals: makeLocals()
		} as RequestEvent);
		expect(result.status).toBe(400);
		expect(result.data.emailError).toBe('current_email_required');
	});

	it('fails 400 when otp is empty', async () => {
		const result = await actions.updateEmail({
			request: makeRequest({
				current_email: 'current@example.com',
				email: 'new@example.com',
				otp: ''
			}),
			locals: makeLocals()
		} as RequestEvent);
		expect(result.status).toBe(400);
		expect(result.data.emailError).toBe('otp_required');
	});

	it('fails 400 when email is empty', async () => {
		const result = (await actions.updateEmail({
			request: makeRequest({ email: '' }),
			locals: makeLocals()
		} as never)) as FailResult;
		expect(result.status).toBe(400);
		expect(result.data.emailError).toBe('email_missing');
	});

	it('fails 400 when email is the same as the current one', async () => {
		const result = (await actions.updateEmail({
			request: makeRequest({ email: 'current@example.com' }),
			locals: makeLocals('current@example.com')
		} as never)) as FailResult;
		expect(result.status).toBe(400);
		expect(result.data.emailError).toBe('email_unchanged');
	});
});

// ── updateProfile ─────────────────────────────────────────────────────────

describe('updateProfile action', () => {
	it('fails 400 when first_name is missing', async () => {
		const result = (await actions.updateProfile({
			request: makeRequest({ first_name: '', last_name: 'Meier' }),
			locals: makeLocals()
		} as never)) as FailResult;
		expect(result.status).toBe(400);
		expect(result.data.profileError).toBe('name_required');
	});

	it('fails 400 when last_name is missing', async () => {
		const result = (await actions.updateProfile({
			request: makeRequest({ first_name: 'Anna', last_name: '' }),
			locals: makeLocals()
		} as never)) as FailResult;
		expect(result.status).toBe(400);
		expect(result.data.profileError).toBe('name_required');
	});

	it('fails 400 when avatar file exceeds 512 KB', async () => {
		const largeFile = new File([new Uint8Array(600 * 1024)], 'avatar.jpg', { type: 'image/jpeg' });
		const fd = new FormData();
		fd.append('first_name', 'Anna');
		fd.append('last_name', 'Meier');
		fd.append('avatar', largeFile);
		const result = (await actions.updateProfile({
			request: { formData: () => Promise.resolve(fd) } as unknown as Request,
			locals: makeLocals()
		} as never)) as FailResult;
		expect(result.status).toBe(400);
		expect(result.data.profileError).toBe('file_too_large');
	});
});

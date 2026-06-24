type FailResult = { status: number; data: Record<string, unknown> };
import { describe, expect, it, vi } from 'vitest';

vi.mock('$lib/paraglide/messages.js', () => ({
	onboarding_no_invite_token: () => 'no_invite_token',
	onboarding_invalid_invite: () => 'invalid_invite',
	onboarding_error_token_missing: () => 'token_missing',
	onboarding_error_auth_secret_mismatch: () => 'auth_secret_mismatch',
	onboarding_error_email_missing: () => 'email_missing',
	onboarding_error_name_required: () => 'name_required',
	onboarding_error_password_length: () => 'password_length',
	onboarding_error_password_uppercase: () => 'password_uppercase',
	onboarding_error_password_number: () => 'password_number',
	onboarding_error_password_special: () => 'password_special',
	onboarding_error_signin_failed: () => 'signin_failed',
	onboarding_error_profile_save: () => 'profile_save_error',
	settings_error_file_too_large: () => 'file_too_large',
	settings_error_file_type: () => 'file_type_error',
	error_server: () => 'server_error',
	error_onboarding_completed: () => 'onboarding_completed',
	error_accept_invite: () => 'accept_invite_error',
	error_user_not_found: () => 'user_not_found',
	rate_limited: ({ seconds }: { seconds: string }) => `rate_limited_${seconds}`
}));

vi.mock('$lib/server/avatarValidation', () => ({
	validateImageMagicBytes: vi.fn().mockResolvedValue('jpg')
}));

import { actions } from '../../routes/onboarding/+page.server';
import { isSupabaseAuthSecretError } from '$lib/server/onboarding';

function makeRequest(data: Record<string, string>): Request {
	const fd = new FormData();
	for (const [k, v] of Object.entries(data)) fd.append(k, v);
	return { formData: () => Promise.resolve(fd) } as unknown as Request;
}

// Minimal locals stub for tests that fail before any Supabase call
const emptyLocals = {} as App.Locals;

// ── isSupabaseAuthSecretError ─────────────────────────────────────────────

describe('isSupabaseAuthSecretError', () => {
	it.each([
		'invalid jwt',
		'INVALID JWT',
		'unable to parse or verify signature',
		'signing method hs256 is invalid'
	])('matches "%s"', (message) => {
		expect(isSupabaseAuthSecretError(message)).toBe(true);
	});

	it.each(['connection refused', 'database error', 'rate limit exceeded'])(
		'does not match "%s"',
		(message) => {
			expect(isSupabaseAuthSecretError(message)).toBe(false);
		}
	);
});

// ── complete — early validation ───────────────────────────────────────────

describe('complete action — early validation', () => {
	// A base payload that passes all validation up to the Supabase call
	const validBase = {
		invite_token: 'tok',
		email: 'user@example.com',
		first_name: 'Anna',
		last_name: 'Meier',
		password: 'Secret1!'
	};

	it('fails 400 when avatar file exceeds 512 KB', async () => {
		const largeFile = new File([new Uint8Array(600 * 1024)], 'avatar.jpg', { type: 'image/jpeg' });
		const fd = new FormData();
		for (const [k, v] of Object.entries(validBase)) fd.append(k, v);
		fd.append('avatar', largeFile);
		const result = (await actions.complete({
			request: { formData: () => Promise.resolve(fd) } as unknown as Request,
			locals: emptyLocals
		} as never)) as FailResult;
		expect(result.status).toBe(400);
	});

	it('fails 400 when first_name is missing', async () => {
		const result = (await actions.complete({
			request: makeRequest({ ...validBase, first_name: '' }),
			locals: emptyLocals
		} as never)) as FailResult;
		expect(result.status).toBe(400);
		expect(result.data.error).toBe('name_required');
	});

	it('fails 400 when last_name is missing', async () => {
		const result = (await actions.complete({
			request: makeRequest({ ...validBase, last_name: '' }),
			locals: emptyLocals
		} as never)) as FailResult;
		expect(result.status).toBe(400);
		expect(result.data.error).toBe('name_required');
	});

	it('fails 400 when password is shorter than 8 characters', async () => {
		const result = (await actions.complete({
			request: makeRequest({ ...validBase, password: 'S1!' }),
			locals: emptyLocals
		} as never)) as FailResult;
		expect(result.status).toBe(400);
		expect(result.data.error).toBe('password_length');
	});

	it('fails 400 when password has no uppercase letter', async () => {
		const result = (await actions.complete({
			request: makeRequest({ ...validBase, password: 'secret1!' }),
			locals: emptyLocals
		} as never)) as FailResult;
		expect(result.status).toBe(400);
		expect(result.data.error).toBe('password_uppercase');
	});

	it('fails 400 when password has no digit', async () => {
		const result = (await actions.complete({
			request: makeRequest({ ...validBase, password: 'SecretA!' }),
			locals: emptyLocals
		} as never)) as FailResult;
		expect(result.status).toBe(400);
		expect(result.data.error).toBe('password_number');
	});

	it('fails 400 when password has no special character', async () => {
		const result = (await actions.complete({
			request: makeRequest({ ...validBase, password: 'Secret123' }),
			locals: emptyLocals
		} as never)) as FailResult;
		expect(result.status).toBe(400);
		expect(result.data.error).toBe('password_special');
	});
});

import { describe, expect, it, vi } from 'vitest';

vi.mock('$lib/paraglide/messages.js', () => ({
	onboarding_no_invite_token: () => 'no_invite_token',
	onboarding_invalid_invite: () => 'invalid_invite',
	onboarding_error_token_missing: () => 'token_missing',
	onboarding_phone_invalid: () => 'phone_invalid',
	onboarding_error_auth_secret_mismatch: () => 'auth_secret_mismatch',
	onboarding_phone_profile_missing: () => 'profile_missing',
	onboarding_phone_send_failed: () => 'send_failed',
	onboarding_phone_cooldown: ({ seconds }: { seconds: string }) => `cooldown:${seconds}`,
	onboarding_phone_hour_limit: () => 'hour_limit',
	onboarding_phone_code_invalid: () => 'code_invalid',
	onboarding_error_email_missing: () => 'email_missing',
	onboarding_error_name_required: () => 'name_required',
	onboarding_error_password_length: () => 'password_length',
	onboarding_error_password_uppercase: () => 'password_uppercase',
	onboarding_error_password_number: () => 'password_number',
	onboarding_error_password_special: () => 'password_special',
	onboarding_phone_required: () => 'phone_required',
	onboarding_phone_not_verified: () => 'phone_not_verified',
	onboarding_error_signin_failed: () => 'signin_failed',
	onboarding_phone_code_missing: () => 'code_missing',
	onboarding_phone_code_expired: () => 'code_expired',
	onboarding_phone_verify_failed: () => 'verify_failed'
}));

vi.mock('$lib/server/swisscomSms', () => ({
	sendSwisscomVerificationSms: vi.fn().mockResolvedValue({ messageId: 'msg-123' })
}));

vi.mock('$lib/server/avatarValidation', () => ({
	validateImageMagicBytes: vi.fn().mockResolvedValue('jpg')
}));

import {
	actions,
	_normalizeSwissPhone as normalizeSwissPhone,
	_hashOtp as hashOtp,
	_isSupabaseAuthSecretError as isSupabaseAuthSecretError
} from './+page.server';

type ActionEvent = Parameters<NonNullable<(typeof actions)[keyof typeof actions]>>[0];

function makeRequest(data: Record<string, string>): Request {
	const fd = new FormData();
	for (const [k, v] of Object.entries(data)) fd.append(k, v);
	return { formData: () => Promise.resolve(fd) } as unknown as Request;
}

// Minimal locals stub for tests that fail before any Supabase call
const emptyLocals = {} as App.Locals;

// ── normalizeSwissPhone ────────────────────────────────────────────────────

describe('normalizeSwissPhone', () => {
	it('returns null for an empty string', () => {
		expect(normalizeSwissPhone('')).toBeNull();
	});

	it('accepts an already-normalized +41 number', () => {
		expect(normalizeSwissPhone('+41791234567')).toBe('+41791234567');
	});

	it('converts 0041 prefix to +41', () => {
		expect(normalizeSwissPhone('0041791234567')).toBe('+41791234567');
	});

	it('converts a leading-zero local number to +41', () => {
		expect(normalizeSwissPhone('0791234567')).toBe('+41791234567');
	});

	it('strips spaces before normalizing', () => {
		expect(normalizeSwissPhone('+41 79 123 45 67')).toBe('+41791234567');
	});

	it('strips parentheses and dashes', () => {
		expect(normalizeSwissPhone('(079) 123-45-67')).toBe('+41791234567');
	});

	it('returns null for a non-Swiss country code', () => {
		expect(normalizeSwissPhone('+49791234567')).toBeNull();
	});

	it('returns null for a number that is too short', () => {
		expect(normalizeSwissPhone('07912345')).toBeNull();
	});
});

// ── hashOtp ───────────────────────────────────────────────────────────────

describe('hashOtp', () => {
	it('returns a 64-character lowercase hex string', () => {
		const result = hashOtp('123456');
		expect(result).toHaveLength(64);
		expect(result).toMatch(/^[0-9a-f]+$/);
	});

	it('is deterministic — same input gives the same output', () => {
		expect(hashOtp('999999')).toBe(hashOtp('999999'));
	});

	it('produces different hashes for different inputs', () => {
		expect(hashOtp('111111')).not.toBe(hashOtp('222222'));
	});
});

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

// ── sendPhoneCode — early validation ─────────────────────────────────────

describe('sendPhoneCode action — early validation', () => {
	it('fails 400 when invite_token is missing', async () => {
		const result = await actions.sendPhoneCode({
			request: makeRequest({ email: 'user@example.com', phone_number: '0791234567' }),
			locals: emptyLocals
		} as ActionEvent);
		expect(result.status).toBe(400);
	});

	it('fails 400 when email is missing', async () => {
		const result = await actions.sendPhoneCode({
			request: makeRequest({ invite_token: 'tok', phone_number: '0791234567' }),
			locals: emptyLocals
		} as ActionEvent);
		expect(result.status).toBe(400);
	});

	it('fails 400 for an invalid phone number', async () => {
		const result = await actions.sendPhoneCode({
			request: makeRequest({
				invite_token: 'tok',
				email: 'user@example.com',
				phone_number: '1234'
			}),
			locals: emptyLocals
		} as ActionEvent);
		expect(result.status).toBe(400);
		expect(result.data.error).toBe('phone_invalid');
	});
});

// ── verifyPhoneCode — early validation ────────────────────────────────────

describe('verifyPhoneCode action — early validation', () => {
	it('fails 400 when invite_token is missing', async () => {
		const result = await actions.verifyPhoneCode({
			request: makeRequest({ email: 'user@example.com', phone_code: '123456' }),
			locals: emptyLocals
		} as ActionEvent);
		expect(result.status).toBe(400);
	});

	it('fails 400 when email is missing', async () => {
		const result = await actions.verifyPhoneCode({
			request: makeRequest({ invite_token: 'tok', phone_code: '123456' }),
			locals: emptyLocals
		} as ActionEvent);
		expect(result.status).toBe(400);
	});

	it('fails 400 when code is fewer than 6 digits', async () => {
		const result = await actions.verifyPhoneCode({
			request: makeRequest({ invite_token: 'tok', email: 'user@example.com', phone_code: '12345' }),
			locals: emptyLocals
		} as ActionEvent);
		expect(result.status).toBe(400);
		expect(result.data.error).toBe('code_invalid');
	});

	it('fails 400 when code contains non-digit characters', async () => {
		const result = await actions.verifyPhoneCode({
			request: makeRequest({
				invite_token: 'tok',
				email: 'user@example.com',
				phone_code: '12345a'
			}),
			locals: emptyLocals
		} as ActionEvent);
		expect(result.status).toBe(400);
		expect(result.data.error).toBe('code_invalid');
	});
});

// ── complete — early validation ───────────────────────────────────────────

describe('complete action — early validation', () => {
	// A base payload that passes all validation up to the Supabase call
	const validBase = {
		invite_token: 'tok',
		email: 'user@example.com',
		phone_number: '0791234567',
		first_name: 'Anna',
		last_name: 'Meier',
		password: 'Secret1!'
	};

	it('fails 400 when avatar file exceeds 512 KB', async () => {
		const largeFile = new File([new Uint8Array(600 * 1024)], 'avatar.jpg', { type: 'image/jpeg' });
		const fd = new FormData();
		for (const [k, v] of Object.entries(validBase)) fd.append(k, v);
		fd.append('avatar', largeFile);
		const result = await actions.complete({
			request: { formData: () => Promise.resolve(fd) } as unknown as Request,
			locals: emptyLocals
		} as ActionEvent);
		expect(result.status).toBe(400);
	});

	it('fails 400 when first_name is missing', async () => {
		const result = await actions.complete({
			request: makeRequest({ ...validBase, first_name: '' }),
			locals: emptyLocals
		} as ActionEvent);
		expect(result.status).toBe(400);
		expect(result.data.error).toBe('name_required');
	});

	it('fails 400 when last_name is missing', async () => {
		const result = await actions.complete({
			request: makeRequest({ ...validBase, last_name: '' }),
			locals: emptyLocals
		} as ActionEvent);
		expect(result.status).toBe(400);
		expect(result.data.error).toBe('name_required');
	});

	it('fails 400 when password is shorter than 8 characters', async () => {
		const result = await actions.complete({
			request: makeRequest({ ...validBase, password: 'S1!' }),
			locals: emptyLocals
		} as ActionEvent);
		expect(result.status).toBe(400);
		expect(result.data.error).toBe('password_length');
	});

	it('fails 400 when password has no uppercase letter', async () => {
		const result = await actions.complete({
			request: makeRequest({ ...validBase, password: 'secret1!' }),
			locals: emptyLocals
		} as ActionEvent);
		expect(result.status).toBe(400);
		expect(result.data.error).toBe('password_uppercase');
	});

	it('fails 400 when password has no digit', async () => {
		const result = await actions.complete({
			request: makeRequest({ ...validBase, password: 'SecretA!' }),
			locals: emptyLocals
		} as ActionEvent);
		expect(result.status).toBe(400);
		expect(result.data.error).toBe('password_number');
	});

	it('fails 400 when password has no special character', async () => {
		const result = await actions.complete({
			request: makeRequest({ ...validBase, password: 'Secret123' }),
			locals: emptyLocals
		} as ActionEvent);
		expect(result.status).toBe(400);
		expect(result.data.error).toBe('password_special');
	});

	it('fails 400 when phone_number is empty', async () => {
		const result = await actions.complete({
			request: makeRequest({ ...validBase, phone_number: '' }),
			locals: emptyLocals
		} as ActionEvent);
		expect(result.status).toBe(400);
		expect(result.data.error).toBe('phone_required');
	});
});

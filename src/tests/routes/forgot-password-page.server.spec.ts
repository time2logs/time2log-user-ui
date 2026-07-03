type FailResult = { status: number; data: Record<string, unknown> };
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { resetRateLimiter } from '$lib/server/rateLimiter';

const { mockResetPasswordForEmail } = vi.hoisted(() => ({
	mockResetPasswordForEmail: vi.fn()
}));

vi.mock('$env/static/public', () => ({
	PUBLIC_SUPABASE_URL: 'http://localhost:54321',
	PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'test-key'
}));

vi.mock('@supabase/supabase-js', () => ({
	createClient: vi.fn(() => ({
		auth: {
			resetPasswordForEmail: mockResetPasswordForEmail
		}
	}))
}));

vi.mock('$lib/paraglide/messages.js', () => ({
	forgot_password_error_email_missing: () => 'email_missing',
	rate_limited: ({ seconds }: { seconds: string }) => `rate_limited_${seconds}`,
	error_server: () => 'server_error'
}));

import { actions } from '../../routes/forgot-password/+page.server';

beforeEach(() => {
	resetRateLimiter();
	mockResetPasswordForEmail.mockReset();
	mockResetPasswordForEmail.mockResolvedValue({ data: {}, error: null });
});

function makeRequest(email: string): Request {
	const fd = new FormData();
	fd.append('email', email);
	return { formData: () => Promise.resolve(fd) } as unknown as Request;
}

function makeEvent(overrides: Record<string, unknown> = {}) {
	return {
		request: makeRequest('user@example.com'),
		locals: {} as App.Locals,
		url: new URL('http://localhost/forgot-password'),
		getClientAddress: () => '127.0.0.1',
		...overrides
	} as never;
}

// ── Validation ────────────────────────────────────────────────────────────

describe('sendResetLink — validation', () => {
	it('fails 400 when email is empty', async () => {
		const result = (await actions.sendResetLink(
			makeEvent({ request: makeRequest('') })
		)) as FailResult;
		expect(result.status).toBe(400);
		expect(result.data.error).toBe('email_missing');
	});

	it('fails 400 when email is only whitespace', async () => {
		const result = (await actions.sendResetLink(
			makeEvent({ request: makeRequest('   ') })
		)) as FailResult;
		expect(result.status).toBe(400);
		expect(result.data.error).toBe('email_missing');
	});
});

// ── Rate limiting ──────────────────────────────────────────────────────────

describe('sendResetLink — rate limiting', () => {
	it('returns 429 on the 2nd request within 1 minute for the same email', async () => {
		const event = makeEvent();
		await actions.sendResetLink(event); // 1st — allowed
		const result = (await actions.sendResetLink(event)) as FailResult; // 2nd — cooldown
		expect(result.status).toBe(429);
		expect(result.data.error).toMatch(/^rate_limited_/);
	});

	it('returns success on first request', async () => {
		const result = await actions.sendResetLink(makeEvent());
		expect(result).toEqual({ success: true });
	});
});

// ── Supabase errors ────────────────────────────────────────────────────────

describe('sendResetLink — supabase errors', () => {
	it('returns 429 when supabase returns a rate limit error', async () => {
		mockResetPasswordForEmail.mockResolvedValueOnce({
			data: {},
			error: {
				status: 429,
				message: 'For security purposes, you can only request this after 60 seconds.'
			}
		});
		const result = (await actions.sendResetLink(makeEvent())) as FailResult;
		expect(result.status).toBe(429);
		expect(result.data.error).toBe('rate_limited_60');
	});

	it('returns 500 on a generic supabase error', async () => {
		mockResetPasswordForEmail.mockResolvedValueOnce({
			data: {},
			error: { message: 'Internal error' }
		});
		const result = (await actions.sendResetLink(makeEvent())) as FailResult;
		expect(result.status).toBe(500);
		expect(result.data.error).toBe('server_error');
	});
});

// ── Success ────────────────────────────────────────────────────────────────

describe('sendResetLink — success', () => {
	it('calls resetPasswordForEmail with the email and redirect URL', async () => {
		await actions.sendResetLink(makeEvent());
		expect(mockResetPasswordForEmail).toHaveBeenCalledWith('user@example.com', {
			redirectTo: 'http://localhost/reset-password'
		});
	});

	it('returns { success: true } on success', async () => {
		const result = await actions.sendResetLink(makeEvent());
		expect(result).toEqual({ success: true });
	});
});

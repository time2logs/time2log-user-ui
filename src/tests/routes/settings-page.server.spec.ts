type FailResult = { status: number; data: Record<string, unknown> };
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { resetRateLimiter } from '$lib/server/rateLimiter';

vi.mock('$lib/paraglide/messages.js', () => ({
	settings_error_name_required: () => 'name_required',
	settings_error_file_too_large: () => 'file_too_large',
	settings_error_file_type: () => 'file_type',
	rate_limited: ({ seconds }: { seconds: string }) => `rate_limited_${seconds}`,
	error_server: () => 'server_error'
}));

vi.mock('$lib/server/avatarValidation', () => ({
	validateImageMagicBytes: vi.fn().mockResolvedValue('jpg')
}));

import { actions } from '../../routes/settings/+page.server';

beforeEach(() => {
	resetRateLimiter();
});

function makeLocals(): App.Locals {
	return {
		safeGetSession: vi.fn().mockResolvedValue({ user: { id: 'user-1' } })
	} as unknown as App.Locals;
}

function makeRequest(data: Record<string, string>): Request {
	const fd = new FormData();
	for (const [k, v] of Object.entries(data)) fd.append(k, v);
	return { formData: () => Promise.resolve(fd) } as unknown as Request;
}

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

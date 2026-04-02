import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock supabase before importing api (supabaseClient uses $env which is not available here)
vi.mock('./supabaseClient', () => ({
	supabase: {
		auth: { signOut: vi.fn().mockResolvedValue({}) }
	}
}));

// Provide import.meta.env values
vi.stubGlobal('import', {
	meta: { env: { VITE_API_BASE_URL: 'http://localhost:8080', DEV: false } }
});

import { apiRequest, login, saveActivity, verifyToken } from './api';

// ---- helpers ----------------------------------------------------------------

function mockFetch(status: number, body: unknown): void {
	const response = {
		ok: status >= 200 && status < 300,
		status,
		json: vi.fn().mockResolvedValue(body)
	} as unknown as Response;
	vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response));
}

// ---- setup / teardown -------------------------------------------------------

beforeEach(() => {
	// Provide a real localStorage via happy-dom
	localStorage.clear();
	// Reset document.cookie
	document.cookie = 'supabase-auth-token=; path=/; max-age=0';
	vi.clearAllMocks();
});

afterEach(() => {
	vi.restoreAllMocks();
});

// ---- apiRequest -------------------------------------------------------------

describe('apiRequest', () => {
	it('sends JSON content-type header', async () => {
		mockFetch(200, { data: 'ok' });
		await apiRequest('/test');
		const calledWith = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
		expect(calledWith[1].headers['Content-Type']).toBe('application/json');
	});

	it('attaches Authorization header when token is stored', async () => {
		localStorage.setItem('access_token', 'my-token');
		localStorage.setItem('token_type', 'Bearer');
		mockFetch(200, {});
		await apiRequest('/test');
		const calledWith = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
		expect(calledWith[1].headers['Authorization']).toBe('Bearer my-token');
	});

	it('sends no Authorization header when no token is stored', async () => {
		mockFetch(200, {});
		await apiRequest('/test');
		const calledWith = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
		expect(calledWith[1].headers['Authorization']).toBeUndefined();
	});

	it('throws on non-ok response', async () => {
		mockFetch(500, { message: 'Internal Server Error' });
		await expect(apiRequest('/test')).rejects.toThrow('Internal Server Error');
	});

	it('throws generic message when error body has no message', async () => {
		const response = {
			ok: false,
			status: 500,
			json: vi.fn().mockRejectedValue(new Error('not json'))
		} as unknown as Response;
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response));
		await expect(apiRequest('/test')).rejects.toThrow('Request failed');
	});

	it('clears token and redirects on 401', async () => {
		localStorage.setItem('access_token', 'expired-token');
		const response = {
			ok: false,
			status: 401,
			json: vi.fn().mockResolvedValue({})
		} as unknown as Response;
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response));

		await expect(apiRequest('/test')).rejects.toThrow('Unauthorized');
		expect(localStorage.getItem('access_token')).toBeNull();
	});

	it('returns parsed JSON on success', async () => {
		mockFetch(200, { id: 42 });
		const result = await apiRequest<{ id: number }>('/test');
		expect(result).toEqual({ id: 42 });
	});
});

// ---- login ------------------------------------------------------------------

describe('login', () => {
	it('stores access_token in localStorage on success', async () => {
		mockFetch(200, {
			access_token: 'tok123',
			token_type: 'Bearer',
			user_id: 'u1',
			email: 'user@test.de',
			role: 'user'
		});

		const result = await login('user@test.de', 'secret');
		expect(localStorage.getItem('access_token')).toBe('tok123');
		expect(result.access_token).toBe('tok123');
	});

	it('throws when response is not ok', async () => {
		mockFetch(401, { message: 'Ungültige Anmeldedaten' });
		await expect(login('bad@test.de', 'wrong')).rejects.toThrow('Ungültige Anmeldedaten');
	});

	it('throws when access_token is missing from response', async () => {
		mockFetch(200, { user_id: 'u1', email: 'user@test.de', role: 'user' });
		await expect(login('user@test.de', 'secret')).rejects.toThrow('No access token received');
	});
});

// ---- verifyToken ------------------------------------------------------------

describe('verifyToken', () => {
	it('returns valid:true on success', async () => {
		mockFetch(200, { valid: true, user_id: 'u1', email: 'user@test.de', role: 'user' });
		const result = await verifyToken();
		expect(result.valid).toBe(true);
	});

	it('throws when response is not ok', async () => {
		mockFetch(403, {});
		await expect(verifyToken()).rejects.toThrow('Token verification failed');
	});
});

// ---- saveActivity -----------------------------------------------------------

describe('saveActivity', () => {
	const validActivity = {
		organization_id: 'org-1',
		profession_id: 'prof-1',
		user_id: 'user-1',
		team_id: null,
		curriculum_activity_id: 'act-1',
		entry_date: '2024-01-15',
		hours: 4,
		notes: null,
		rating: null,
		location: 'Berlin'
	};

	it('returns success result when server responds ok', async () => {
		localStorage.setItem('access_token', 'tok');
		mockFetch(200, { success: true, message: 'saved', activity: { id: 'new-id' } });
		const result = await saveActivity(validActivity);
		expect(result.success).toBe(true);
	});

	it('throws when server returns success:false', async () => {
		localStorage.setItem('access_token', 'tok');
		mockFetch(200, { success: false, message: 'Validation error' });
		await expect(saveActivity(validActivity)).rejects.toThrow('Validation error');
	});

	it('sends a POST request to /api/activities', async () => {
		localStorage.setItem('access_token', 'tok');
		mockFetch(200, { success: true, message: 'ok' });
		await saveActivity(validActivity);
		const [url, opts] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
		expect(url).toContain('/api/activities');
		expect(opts.method).toBe('POST');
	});
});

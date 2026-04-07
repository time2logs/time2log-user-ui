import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./supabaseClient', () => ({
	supabase: {
		auth: { signOut: vi.fn().mockResolvedValue({}) }
	}
}));

vi.stubGlobal('import', {
	meta: { env: { VITE_API_BASE_URL: 'http://localhost:8080', DEV: false } }
});

import { apiRequest, login, saveActivity, verifyToken } from './api';


function mockFetch(status: number, body: unknown): void {
	const response = {
		ok: status >= 200 && status < 300,
		status,
		json: vi.fn().mockResolvedValue(body)
	} as unknown as Response;
	vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response));
}

// setup

beforeEach(() => {
	localStorage.clear();
	document.cookie = 'supabase-auth-token=; path=/; max-age=0';
	vi.clearAllMocks();
});

afterEach(() => {
	vi.restoreAllMocks();
});

//apiRequest

describe('apiRequest', () => {
	it('sends JSON content-type header', async () => {
		// Arrange
		mockFetch(200, { data: 'ok' });

		// Act
		await apiRequest('/test');

		// Assert
		const calledWith = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
		expect(calledWith[1].headers['Content-Type']).toBe('application/json');
	});

	it('attaches Authorization header when a token is stored', async () => {
		// Arrange
		localStorage.setItem('access_token', 'my-token');
		localStorage.setItem('token_type', 'Bearer');
		mockFetch(200, {});

		// Act
		await apiRequest('/test');

		// Assert
		const calledWith = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
		expect(calledWith[1].headers['Authorization']).toBe('Bearer my-token');
	});

	it('sends no Authorization header when no token is stored', async () => {
		// Arrange
		mockFetch(200, {});

		// Act
		await apiRequest('/test');

		// Assert
		const calledWith = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
		expect(calledWith[1].headers['Authorization']).toBeUndefined();
	});

	it('throws the server error message on a non-ok response', async () => {
		// Arrange
		mockFetch(500, { message: 'Internal Server Error' });

		// Act und  Assert
		await expect(apiRequest('/test')).rejects.toThrow('Internal Server Error');
	});

	it('throws a generic message when the error body is not JSON', async () => {
		// Arrange
		const response = {
			ok: false,
			status: 500,
			json: vi.fn().mockRejectedValue(new Error('not json'))
		} as unknown as Response;
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response));

		// Act und Assert
		await expect(apiRequest('/test')).rejects.toThrow('Request failed');
	});

	it('clears the stored token on a 401 response', async () => {
		// Arrange
		localStorage.setItem('access_token', 'expired-token');
		const response = {
			ok: false,
			status: 401,
			json: vi.fn().mockResolvedValue({})
		} as unknown as Response;
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response));

		// Act und Assert
		await expect(apiRequest('/test')).rejects.toThrow('Unauthorized');
		expect(localStorage.getItem('access_token')).toBeNull();
	});

	it('returns the parsed JSON body on a successful response', async () => {
		// Arrange
		mockFetch(200, { id: 42 });

		// Act
		const result = await apiRequest<{ id: number }>('/test');

		// Assert
		expect(result).toEqual({ id: 42 });
	});
});

//  login

describe('login', () => {
	it('stores the access_token in localStorage on success', async () => {
		// Arrange
		mockFetch(200, {
			access_token: 'tok123',
			token_type: 'Bearer',
			user_id: 'u1',
			email: 'user@test.de',
			role: 'user'
		});

		// Act
		const result = await login('user@test.de', 'secret');

		// Assert
		expect(localStorage.getItem('access_token')).toBe('tok123');
		expect(result.access_token).toBe('tok123');
	});

	it('throws the server message when the response is not ok', async () => {
		// Arrange
		mockFetch(401, { message: 'Ungültige Anmeldedaten' });

		// Act und Assert
		await expect(login('bad@test.de', 'wrong')).rejects.toThrow('Ungültige Anmeldedaten');
	});

	it('throws when the server response contains no access_token', async () => {
		// Arrange
		mockFetch(200, { user_id: 'u1', email: 'user@test.de', role: 'user' });

		// Act  und Assert
		await expect(login('user@test.de', 'secret')).rejects.toThrow('No access token received');
	});
});

//  verifyToken

describe('verifyToken', () => {
	it('returns valid:true when the server confirms the token', async () => {
		// Arrange
		mockFetch(200, { valid: true, user_id: 'u1', email: 'user@test.de', role: 'user' });

		// Act
		const result = await verifyToken();

		// Assert
		expect(result.valid).toBe(true);
	});

	it('throws when the server responds with a non-ok status', async () => {
		// Arrange
		mockFetch(403, {});

		// Act und  Assert
		await expect(verifyToken()).rejects.toThrow('Token verification failed');
	});
});


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

	it('returns a success result when the server responds ok', async () => {
		// Arrange
		localStorage.setItem('access_token', 'tok');
		mockFetch(200, { success: true, message: 'saved', activity: { id: 'new-id' } });

		// Act
		const result = await saveActivity(validActivity);

		// Assert
		expect(result.success).toBe(true);
	});

	it('throws when the server returns success:false', async () => {
		// Arrange
		localStorage.setItem('access_token', 'tok');
		mockFetch(200, { success: false, message: 'Validation error' });

		// Act und Assert
		await expect(saveActivity(validActivity)).rejects.toThrow('Validation error');
	});

	it('sends a POST request to /api/activities with the activity payload', async () => {
		// Arrange
		localStorage.setItem('access_token', 'tok');
		mockFetch(200, { success: true, message: 'ok' });

		// Act
		await saveActivity(validActivity);

		// Assert
		const [url, opts] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
		expect(url).toContain('/api/activities');
		expect(opts.method).toBe('POST');
	});
});

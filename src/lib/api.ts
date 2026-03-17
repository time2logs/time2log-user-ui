/**
 * API client for making authenticated requests to the backend
 * Uses Bearer token authentication
 */

import { supabase } from './supabaseClient';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

const TOKEN_KEY = 'access_token';
const TOKEN_TYPE_KEY = 'token_type';

/**
 * Get the stored access token
 */
function getAccessToken(): string | null {
	if (typeof window === 'undefined') return null;
	return localStorage.getItem(TOKEN_KEY);
}

/**
 * Get the stored token type
 */
function getTokenType(): string {
	if (typeof window === 'undefined') return 'Bearer';
	return localStorage.getItem(TOKEN_TYPE_KEY) || 'Bearer';
}

/**
 * Store the access token and token type
 * Stores in both localStorage (for client) and cookie (for server)
 */
function setToken(token: string, tokenType: string = 'Bearer'): void {
	if (typeof window === 'undefined') return;
	localStorage.setItem(TOKEN_KEY, token);
	localStorage.setItem(TOKEN_TYPE_KEY, tokenType);

	// Set cookie with proper attributes for SvelteKit server-side reading
	// SameSite=Lax allows cookies on same-site navigations
	const maxAge = 60 * 60 * 24 * 7; // 7 days in seconds
	document.cookie = `supabase-auth-token=${encodeURIComponent(token)}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

/**
 * Clear the stored tokens (both localStorage and cookies)
 */
function clearToken(): void {
	if (typeof window === 'undefined') return;
	localStorage.removeItem(TOKEN_KEY);
	localStorage.removeItem(TOKEN_TYPE_KEY);

	// Clear the cookie - must match the same attributes used when setting
	document.cookie = 'supabase-auth-token=; path=/; max-age=0; SameSite=Lax';
}

/**
 * Make an authenticated API request
 * Includes Bearer token from localStorage
 */
export async function apiRequest<T = unknown>(
	endpoint: string,
	options: RequestInit = {}
): Promise<T> {
	const token = getAccessToken();
	const tokenType = getTokenType();

	const headers: HeadersInit = {
		'Content-Type': 'application/json',
		...options.headers
	};

	// Add Authorization header if token exists
	if (token) {
		headers['Authorization'] = `${tokenType} ${token}`;
	}

	const response = await fetch(`${API_BASE}${endpoint}`, {
		...options,
		headers
	});

	// Handle 401 Unauthorized - token expired or invalid
	if (response.status === 401) {
		clearToken();
		window.location.href = '/login';
		throw new Error('Unauthorized');
	}

	if (!response.ok) {
		const error = await response.json().catch(() => ({ message: 'Request failed' }));
		throw new Error(error.message || 'Request failed');
	}

	return response.json();
}

/**
 * Login API call
 * Stores access_token from backend response
 */
export async function login(
	email: string,
	password: string
): Promise<{
	access_token: string;
	token_type?: string;
	user_id: string;
	email: string;
	role: string;
	person_name?: string | null;
}> {
	console.log('Attempting login to:', `${API_BASE}/api/login`);

	const response = await fetch(`${API_BASE}/api/login`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		credentials: 'include', // Include any cookies set by backend
		body: JSON.stringify({ email, password })
	});

	console.log('Response status:', response.status);

	const data = await response.json();
	console.log('Response data:', data);

	if (!response.ok) {
		throw new Error(data.message || 'Login failed');
	}

	// Extract access_token from response
	const { access_token } = data;

	if (!access_token) {
		throw new Error('No access token received from server');
	}

	// Store the token for subsequent requests (defaults to 'Bearer' token type)
	setToken(access_token, 'Bearer');

	return data;
}

/**
 * Verify token - check if user is authenticated
 */
export async function verifyToken(): Promise<{
	valid: boolean;
	user_id?: string;
	email?: string;
	role?: string;
	person_id?: string;
	person_name?: string;
}> {
	const token = getAccessToken();
	const tokenType = getTokenType();

	const headers: HeadersInit = {
		'Content-Type': 'application/json'
	};

	// Add Authorization header if token exists
	if (token) {
		headers['Authorization'] = `${tokenType} ${token}`;
	}

	const response = await fetch(`${API_BASE}/api/verify-token`, {
		method: 'GET',
		headers
	});

	if (!response.ok) {
		throw new Error('Token verification failed');
	}

	return response.json();
}

/**
 * Logout - clear stored token and redirect to login
 */
export async function logout(): Promise<void> {
	const token = getAccessToken();
	const tokenType = getTokenType();

	const headers: HeadersInit = {};

	// Add Authorization header if token exists
	if (token) {
		headers['Authorization'] = `${tokenType} ${token}`;
	}

	try {
		// Include credentials so backend can clear its HTTP-only cookie
		await fetch(`${API_BASE}/api/logout`, {
			method: 'POST',
			headers,
			credentials: 'include'
		});
	} catch (error) {
		console.error('Logout error:', error);
	}

	// Clear local tokens first
	clearToken();

	// Manually clear all Supabase cookies to ensure complete logout
	const cookiesToClear = ['sb-access-token', 'sb-refresh-token', 'supabase-auth-token'];
	cookiesToClear.forEach((name) => {
		document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax`;
	});

	// Sign out from Supabase
	await supabase.auth.signOut();

	// Force a full page reload to /login
	window.location.href = '/login';
}

/**
 * Save activity to server
 * Validates and stores activity data
 */
export async function saveActivity(activity: {
	organization_id: string;
	profession_id: string;
	user_id: string;
	team_id: string | null;
	curriculum_activity_id: string;
	entry_date: string;
	hours: number;
	notes: string | null;
	rating: number | null;
	location: string;
}): Promise<{ success: boolean; message: string; activity?: any }> {
	try {
		const result = await apiRequest<{ success: boolean; message: string; activity?: any }>(
			'/api/activities',
			{
				method: 'POST',
				body: JSON.stringify(activity)
			}
		);

		// Validate server response
		if (!result.success) {
			throw new Error(result.message || 'Failed to save activity');
		}

		return result;
	} catch (error) {
		console.error('Error saving activity to server:', error);
		throw error;
	}
}

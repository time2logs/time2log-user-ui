import { redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

// Get the backend API URL from environment variable
// For server-side requests, use API_BASE_URL (or PRIVATE_API_BASE_URL)
// For local development, this defaults to the backend server address
const API_BASE = env.API_BASE_URL || env.PRIVATE_API_BASE_URL || 'http://localhost:8000';

// TODO: Update this to your backend's validation endpoint path
// Examples: '/api/verify-token', '/auth/validate', '/api/me'
const VALIDATE_ENDPOINT = `${API_BASE}/api/verify-token`;

export async function load({ fetch, cookies }) {
	try {
		// Call backend validation endpoint
		// HTTP-only cookies are sent automatically with the request
		const response = await fetch(VALIDATE_ENDPOINT, {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json'
			}
		});

		// If validation fails (401 or other error), redirect to login
		if (!response.ok || response.status === 401) {
			redirect(302, '/login');
		}

		// Token is valid - get user data from response
		const user = await response.json();

		return {
			isAuthenticated: true,
			user
		};
	} catch (error) {
		// Backend unreachable or error - redirect to login
		console.error('Auth validation error:', error);
		redirect(302, '/login');
	}
}

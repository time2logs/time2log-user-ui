import { redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

// Get the backend API URL from environment variable
const API_BASE = env.API_BASE_URL || env.PRIVATE_API_BASE_URL || 'http://localhost:8080';
const VALIDATE_ENDPOINT = `${API_BASE}/api/verify-token`;

export async function load({ fetch, cookies }) {
	try {
		// Get the auth token from the request cookies
		const authToken = cookies.get('supabase-auth-token');

		console.log('Server-side auth check, token present:', !!authToken);

		if (!authToken) {
			console.log('No auth token found, redirecting to login');
			redirect(302, '/login');
		}

		// Call backend validation endpoint with the cookie
		const headers: Record<string, string> = {
			'Content-Type': 'application/json'
		};
		headers['Cookie'] = `supabase-auth-token=${authToken}`;

		const response = await fetch(VALIDATE_ENDPOINT, {
			method: 'GET',
			headers
		});

		// If validation fails (401 or other error), redirect to login
		if (!response.ok || response.status === 401) {
			console.log('Token validation failed, redirecting to login');
			redirect(302, '/login');
		}

		// Token is valid - get user data from response
		const user = await response.json();
		console.log('Token validated successfully for user:', user.personName);

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

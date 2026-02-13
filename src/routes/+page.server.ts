import { redirect } from '@sveltejs/kit';
// immer env von dynamic/public importieren
import { env } from '$env/dynamic/public'; 

// Get the backend API URL from environment variable
const API_BASE = env.API_BASE_URL || env.PRIVATE_API_BASE_URL || 'http://localhost:8080';
const VALIDATE_ENDPOINT = `${API_BASE}/api/verify-token`;
const COOKIE_NAME = 'supabase-auth-token';

export async function load({ fetch, cookies }) {
	try {
		// Get the auth token from the request cookies
		const authToken = cookies.get(COOKIE_NAME);

		console.log('Server-side auth check, token present:', !!authToken);

		if (!authToken) {
			console.log('No auth token found, redirecting to login');
			redirect(302, '/login');
		}

		// Call backend validation endpoint with Authorization header
		const response = await fetch(VALIDATE_ENDPOINT, {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': `Bearer ${authToken}`
			}
		});

		// If validation fails (401 or other error), redirect to login
		if (!response.ok || response.status === 401) {
			console.log('Token validation failed, redirecting to login');
			redirect(302, '/login');
		}

		// Token is valid - get user data from response
		const user = await response.json();
		console.log('Token validated successfully for user:', user.person_name);

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

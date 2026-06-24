import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
	try {
		await locals.supabase.auth.signOut();
	} catch (err) {
		console.error('Logout error:', err);
	}
	throw redirect(303, '/login');
};

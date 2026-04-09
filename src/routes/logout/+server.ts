import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';

export const GET: RequestHandler = async ({ locals }) => {
	await locals.supabase.auth.signOut();
	const basePath = env.COOLIFY_PULL_REQUEST_ID ? `/${env.COOLIFY_PULL_REQUEST_ID}` : '';
	throw redirect(303, basePath + '/login');
};

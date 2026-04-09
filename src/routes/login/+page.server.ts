import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { base } from '$app/paths';

export const load: PageServerLoad = async ({ locals }) => {
	const session = await locals.safeGetSession();

	if (session) {
		throw redirect(302, base + '/dashboard');
	}

	return {};
};

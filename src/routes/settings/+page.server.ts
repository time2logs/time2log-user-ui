import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const session = await locals.safeGetSession();

	if (!session) {
		throw redirect(302, '/login');
	}

	const userId = session.user.id;
	const email = session.user.email;

	const [profileResult] = await Promise.all([
		locals.supabase.from('profiles').select('*').eq('id', userId).single()
	]);

	const profile = profileResult.error ? null : profileResult.data;

	return { profile, email };
};

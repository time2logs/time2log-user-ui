import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const session = await locals.safeGetSession();

	if (!session) {
		throw redirect(302, '/login');
	}

	const userId = session.user.id;
	const email = session.user.email;

	const [profileResult, locationsResult] = await Promise.all([
		locals.supabase.from('profiles').select('*').eq('id', userId).single(),
		locals.supabase
			.from('user_locations')
			.select('*')
			.eq('user_id', userId)
			.order('created_at', { ascending: false })
	]);

	const profile = profileResult.error ? null : profileResult.data;
	const locations = locationsResult.data ?? [];
	const defaultLocation = locations.find((l: any) => l.is_default)?.location ?? null;

	return { profile, email, defaultLocation, pastLocations: locations };
};

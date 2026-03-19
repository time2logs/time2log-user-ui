import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const session = await locals.safeGetSession();

	if (!session) {
		throw redirect(302, '/login');
	}

	const userId = session.user.id;
	const email = session.user.email;

	const profileResult = await locals.supabase
		.from('profiles')
		.select('*')
		.eq('id', userId)
		.single();

	const profile = profileResult.error ? null : profileResult.data;

	let locations = [];
	let defaultLocation = null;

	try {
		const locationsResult = await locals.supabase
			.from('user_locations')
			.select('*')
			.eq('user_id', userId)
			.order('created_at', { ascending: false });

		if (!locationsResult.error && locationsResult.data) {
			locations = locationsResult.data;
			defaultLocation = locations.find((l: any) => l.is_default)?.location ?? null;
		}
	} catch (e) {
		console.warn('user_locations table not available:', e);
	}

	return { profile, email, defaultLocation, pastLocations: locations };
};

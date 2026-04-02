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

	type UserLocation = {
		user_id: string;
		location: string;
		is_default: boolean;
		created_at: string;
	};

	let locations: UserLocation[] = [];
	let defaultLocation: string | null = null;

	try {
		const locationsResult = await locals.supabase
			.from('user_locations')
			.select('*')
			.eq('user_id', userId)
			.order('created_at', { ascending: false });

		if (!locationsResult.error && locationsResult.data) {
			locations = locationsResult.data as UserLocation[];
			defaultLocation = locations.find((l) => l.is_default)?.location ?? null;
		}
	} catch (e) {
		console.warn('user_locations table not available:', e);
	}

	return { profile, email, defaultLocation, pastLocations: locations };
};

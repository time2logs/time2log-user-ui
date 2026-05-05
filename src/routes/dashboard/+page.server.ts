import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const session = await locals.safeGetSession();
	if (!session) throw redirect(303, '/login');

	let userLocations: string[] = [];
	try {
		const { data, error } = await locals.supabase
			.from('user_locations')
			.select('location')
			.eq('user_id', session.user.id)
			.order('created_at', { ascending: false });
		if (!error && data) {
			userLocations = data.map((l: { location: string }) => l.location);
		}
	} catch {}

	return { userLocations };
};

import type { PageServerLoad } from './$types';
import { requireSession } from '$lib/server/authGuard';

export const load: PageServerLoad = async ({ locals }) => {
	const session = await locals.safeGetSession();
	requireSession(session);

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

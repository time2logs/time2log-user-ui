import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const session = await locals.safeGetSession();

	if (!session) {
		throw redirect(302, '/login');
	}

	const userId = session.user.id;

	const { data: locations } = await locals.supabase
		.from('user_locations')
		.select('location, is_default')
		.eq('user_id', userId)
		.order('created_at', { ascending: false });

	const defaultLocation = locations?.find((l: any) => l.is_default)?.location ?? null;

	return { defaultLocation };
};

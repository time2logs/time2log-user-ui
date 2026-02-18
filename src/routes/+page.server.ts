import type { PageServerLoad } from './$types';

type Profile = {
	id: number;
	first_name: string;
	last_name: string;
};

export const load: PageServerLoad = async ({ locals }) => {
	const session = await locals.safeGetSession();

	if (!session) {
		return { profile: null };
	}

	const { data, error } = await locals.supabase
		.from('profiles')
		.select<'profiles', Profile>()
		.eq('id', session.user.id)
		.single();

	if (error) {
		console.error('Error loading profile:', error.message);
		return { profile: null };
	}

	return { profile: data };
};

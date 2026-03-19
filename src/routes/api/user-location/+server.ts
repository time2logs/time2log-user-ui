import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
	const session = await locals.safeGetSession();
	if (!session) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const userId = session.user.id;
	const { location, isDefault } = await request.json();

	if (!location?.trim()) {
		return json({ error: 'Location is required' }, { status: 400 });
	}

	try {
		const existingLocation = await locals.supabase
			.from('user_locations')
			.select('*')
			.eq('user_id', userId)
			.eq('location', location.trim())
			.single();

		if (existingLocation.data) {
			if (isDefault) {
				await locals.supabase
					.from('user_locations')
					.update({ is_default: false })
					.eq('user_id', userId);
				await locals.supabase
					.from('user_locations')
					.update({ is_default: true })
					.eq('id', existingLocation.data.id);
			}
			return json({ success: true, location: existingLocation.data });
		}

		const { data, error } = await locals.supabase
			.from('user_locations')
			.insert({ user_id: userId, location: location.trim(), is_default: isDefault ?? false })
			.select()
			.single();

		if (error) {
			return json({ error: error.message }, { status: 500 });
		}

		if (isDefault) {
			await locals.supabase
				.from('user_locations')
				.update({ is_default: false })
				.eq('user_id', userId)
				.neq('id', data.id);
		}

		return json({ success: true, location: data });
	} catch (error) {
		console.error('Error saving location:', error);
		return json({ error: 'Failed to save location' }, { status: 500 });
	}
};

export const GET: RequestHandler = async ({ locals }) => {
	const session = await locals.safeGetSession();
	if (!session) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const userId = session.user.id;

	const { data, error } = await locals.supabase
		.from('user_locations')
		.select('*')
		.eq('user_id', userId)
		.order('created_at', { ascending: false });

	if (error) {
		return json({ error: error.message }, { status: 500 });
	}

	const defaultLocation = data?.find((l) => l.is_default)?.location ?? null;

	return json({ locations: data, defaultLocation });
};

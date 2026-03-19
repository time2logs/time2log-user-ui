import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const DELETE: RequestHandler = async ({ params, locals }) => {
	const session = await locals.safeGetSession();
	if (!session) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const userId = session.user.id;
	const locationId = params.id;

	try {
		const { error } = await locals.supabase
			.from('user_locations')
			.delete()
			.eq('id', locationId)
			.eq('user_id', userId);

		if (error) {
			return json({ error: error.message }, { status: 500 });
		}

		return json({ success: true });
	} catch (error) {
		console.error('Error deleting location:', error);
		return json({ error: 'Failed to delete location' }, { status: 500 });
	}
};

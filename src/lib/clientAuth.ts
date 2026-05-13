import { supabase } from './supabaseClient';

export async function getCurrentUser() {
	const {
		data: { user },
		error
	} = await supabase.auth.getUser();
	if (!user || error) throw new Error('Not authenticated');
	return user;
}

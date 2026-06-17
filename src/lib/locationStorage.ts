import { supabase } from './supabaseClient';
import { unwrapSupabase } from './supabaseUtils';

/**
 * Adds a new workplace for the current user to the `user_locations` table.
 * Throws a normalised `Error` on failure (incl. duplicate entries detected
 * via a pre-check, since RLS scoping may hide server-side unique constraints).
 *
 * @param location   Workplace label, e.g. "Office" or "Home office"
 * @param userId     auth.users id of the current user
 * @param organizationId  Optional org id for multi-tenant scoping
 */
export async function addUserLocation(
	location: string,
	userId: string,
	organizationId?: string | null
): Promise<string> {
	const trimmed = location.trim();
	if (!trimmed) throw new Error('Location must not be empty.');

	// Duplicate pre-check (case-insensitive) against the user's existing rows.
	const existing = unwrapSupabase(
		await supabase.from('user_locations').select('location').eq('user_id', userId),
		'Failed to check existing locations'
	);

	const isDuplicate = (existing ?? []).some(
		(row: { location: string }) => row.location.toLowerCase() === trimmed.toLowerCase()
	);
	if (isDuplicate) {
		throw new Error('DUPLICATE_LOCATION');
	}

	unwrapSupabase(
		await supabase.from('user_locations').insert({
			location: trimmed,
			user_id: userId,
			organization_id: organizationId ?? null
		}),
		'Failed to save location'
	);

	return trimmed;
}

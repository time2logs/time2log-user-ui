import { supabase } from './supabaseClient';
import { unwrapSupabase } from './supabaseUtils';
import { STORAGE_KEYS } from './storageKeys';

async function fetchLocations(userId: string): Promise<string[]> {
	const rows = unwrapSupabase(
		await supabase.from('user_locations').select('location').eq('user_id', userId),
		'Failed to check existing locations'
	);
	return (rows ?? []).map((row: { location: string }) => row.location);
}

/**
 * Adds a new workplace for the current user to the `user_locations` table.
 * Throws a normalised `Error` on failure (incl. duplicate entries detected
 * via a pre-check, since RLS scoping may hide server-side unique constraints).
 *
 * @param location   Workplace label, e.g. "Office" or "Home office"
 * @param userId     auth.users id of the current user
 */
export async function addUserLocation(location: string, userId: string): Promise<string> {
	const trimmed = location.trim();
	if (!trimmed) throw new Error('Location must not be empty.');

	const existing = await fetchLocations(userId);
	if (existing.some((l) => l.toLowerCase() === trimmed.toLowerCase())) {
		throw new Error('DUPLICATE_LOCATION');
	}

	unwrapSupabase(
		await supabase
			.from('user_locations')
			.insert({
				location: trimmed,
				user_id: userId
			})
			.select()
			.single(),
		'Failed to save location'
	);

	return trimmed;
}

export async function renameUserLocation(
	oldLabel: string,
	newLabel: string,
	userId: string
): Promise<string> {
	const trimmed = newLabel.trim();
	if (!trimmed) throw new Error('Location must not be empty.');
	if (trimmed === oldLabel) return trimmed;

	const existing = await fetchLocations(userId);
	const isDuplicate = existing.some(
		(l) => l.toLowerCase() === trimmed.toLowerCase() && l !== oldLabel
	);
	if (isDuplicate) throw new Error('DUPLICATE_LOCATION');

	unwrapSupabase(
		await supabase
			.from('activity_records')
			.update({ location: trimmed })
			.eq('user_id', userId)
			.eq('location', oldLabel),
		'Failed to update activities for location'
	);

	unwrapSupabase(
		await supabase
			.from('user_locations')
			.update({ location: trimmed })
			.eq('user_id', userId)
			.eq('location', oldLabel),
		'Failed to rename location'
	);

	if (localStorage.getItem(STORAGE_KEYS.lastLocation) === oldLabel) {
		localStorage.setItem(STORAGE_KEYS.lastLocation, trimmed);
	}

	return trimmed;
}

export async function deleteUserLocation(label: string, userId: string): Promise<void> {
	unwrapSupabase(
		await supabase.from('user_locations').delete().eq('user_id', userId).eq('location', label),
		'Failed to delete location'
	);

	if (localStorage.getItem(STORAGE_KEYS.lastLocation) === label) {
		localStorage.removeItem(STORAGE_KEYS.lastLocation);
	}
}

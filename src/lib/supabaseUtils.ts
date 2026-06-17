/**
 * A minimal shape for a Supabase query result, avoiding the need to import
 * the full PostgrestError type in every consumer.
 */
type SupabaseResult<T> = {
	data: T | null;
	error: { message?: string } | null;
};

/**
 * Unwraps a Supabase query result, throwing a normalised `Error` if the query
 * failed. On success, returns `data` (cast to the generic type).
 *
 * @param context - human-readable label used in the console log + fallback message
 */
export function unwrapSupabase<T>(result: SupabaseResult<T>, context: string): T {
	if (result.error) {
		console.error(`[Supabase] ${context}:`, result.error);
		throw new Error(result.error.message || context);
	}
	return result.data as T;
}

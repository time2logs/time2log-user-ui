// Auth Admin errors that mean SUPABASE_SECRET_KEY is missing, malformed or belongs to
// another project. The first group covers the current secret keys (sb_secret_…), the
// second legacy JWT-shaped keys that may still linger in an environment.
export function isSupabaseAuthSecretError(message: string): boolean {
	return /invalid api key|invalid_api_key|no api key found|invalid jwt|unable to parse or verify signature|signing method hs256 is invalid/i.test(
		message
	);
}

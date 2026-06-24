export function isSupabaseAuthSecretError(message: string): boolean {
	return /invalid jwt|unable to parse or verify signature|signing method hs256 is invalid/i.test(
		message
	);
}

import * as m from '$lib/paraglide/messages.js';

/** Returns null if valid, or a localized error message string if invalid. */
export function validatePassword(password: string): string | null {
	if (!password || password.length < 8) return m.onboarding_error_password_length();
	if (!/[A-Z]/.test(password)) return m.onboarding_error_password_uppercase();
	if (!/[0-9]/.test(password)) return m.onboarding_error_password_number();
	if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(password)) {
		return m.onboarding_error_password_special();
	}
	return null;
}

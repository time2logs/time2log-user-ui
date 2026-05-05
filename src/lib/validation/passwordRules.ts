import * as m from '$lib/paraglide/messages.js';

type MessageFn = () => string;

export function validatePassword(password: string): MessageFn | null {
	if (!password || password.length < 8) return m.onboarding_error_password_length;
	if (!/[A-Z]/.test(password)) return m.onboarding_error_password_uppercase;
	if (!/[0-9]/.test(password)) return m.onboarding_error_password_number;
	if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(password)) {
		return m.onboarding_error_password_special;
	}
	return null;
}

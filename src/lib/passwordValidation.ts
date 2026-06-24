export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_SPECIAL_CHAR_REGEX = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/;

export type PasswordRule = 'length' | 'uppercase' | 'number' | 'special';

export function validatePassword(password: string): PasswordRule | null {
	if (!password || password.length < PASSWORD_MIN_LENGTH) return 'length';
	if (!/[A-Z]/.test(password)) return 'uppercase';
	if (!/[0-9]/.test(password)) return 'number';
	if (!PASSWORD_SPECIAL_CHAR_REGEX.test(password)) return 'special';
	return null;
}

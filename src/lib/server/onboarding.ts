import { env } from '$env/dynamic/private';
import { createHash } from 'node:crypto';

export function isSupabaseAuthSecretError(message: string): boolean {
	return /invalid jwt|unable to parse or verify signature|signing method hs256 is invalid/i.test(
		message
	);
}

export function hashOtp(value: string): string {
	return createHash('sha256').update(value).digest('hex');
}

export function isSmsEnabled(): boolean {
	const value = env.USE_SMS?.trim().toLowerCase();
	return value === '1' || value === 'true';
}

export function normalizeSwissPhone(phoneNumberRaw: string): string | null {
	const compact = phoneNumberRaw.replace(/\s+/g, '').replace(/[()-]/g, '');
	if (!compact) return null;
	if (/^\+41\d{9}$/.test(compact)) return compact;
	if (/^0041\d{9}$/.test(compact)) return `+${compact.slice(2)}`;
	if (/^0\d{9}$/.test(compact)) return `+41${compact.slice(1)}`;
	return null;
}

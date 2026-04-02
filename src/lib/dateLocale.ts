import { getLocale } from '$lib/paraglide/runtime.js';

const localeMap: Record<string, string> = {
	en: 'en-GB',
	'de-ch': 'de-CH',
	it: 'it-IT',
	fr: 'fr-FR'
};

export function getDateLocale(): string {
	return localeMap[getLocale()] ?? 'en-GB';
}

/**
 * Central registry of all localStorage keys used across the app.
 * Prevents key drift and collisions between modules.
 */
export const STORAGE_KEYS = {
	theme: 'theme',
	palette: 'palette',
	lastActivityId: 'last_activity_id',
	lastLocation: 'last_location',
	paraglideLocale: 'PARAGLIDE_LOCALE'
} as const;

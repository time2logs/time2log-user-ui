import { beforeEach, describe, expect, it, vi } from 'vitest';

const getLocaleMock = vi.fn(() => 'de-ch');

vi.mock('$lib/paraglide/runtime.js', () => ({
	getLocale: getLocaleMock
}));

describe('getDateLocale', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('maps "de-ch" to "de-CH"', async () => {
		getLocaleMock.mockReturnValue('de-ch');
		const { getDateLocale } = await import('./dateLocale');
		expect(getDateLocale()).toBe('de-CH');
	});

	it('maps "en" to "en-GB"', async () => {
		getLocaleMock.mockReturnValue('en');
		const { getDateLocale } = await import('./dateLocale');
		expect(getDateLocale()).toBe('en-GB');
	});

	it('maps "it" to "it-IT"', async () => {
		getLocaleMock.mockReturnValue('it');
		const { getDateLocale } = await import('./dateLocale');
		expect(getDateLocale()).toBe('it-IT');
	});

	it('maps "fr" to "fr-FR"', async () => {
		getLocaleMock.mockReturnValue('fr');
		const { getDateLocale } = await import('./dateLocale');
		expect(getDateLocale()).toBe('fr-FR');
	});

	it('falls back to "en-GB" for an unknown locale', async () => {
		getLocaleMock.mockReturnValue('xx');
		const { getDateLocale } = await import('./dateLocale');
		expect(getDateLocale()).toBe('en-GB');
	});

	it('falls back to "en-GB" for an empty string', async () => {
		getLocaleMock.mockReturnValue('');
		const { getDateLocale } = await import('./dateLocale');
		expect(getDateLocale()).toBe('en-GB');
	});
});

import { describe, expect, it } from 'vitest';
import { getInitials } from './userUtils';

describe('getInitials', () => {
	it('returns first letter of first and last name uppercased', () => {
		expect(getInitials('Anna', 'Meier')).toBe('AM');
	});

	it('returns single letter when only first name is provided', () => {
		expect(getInitials('John', null)).toBe('J');
	});

	it('returns single letter when only last name is provided', () => {
		expect(getInitials(null, 'Doe')).toBe('D');
	});

	it('returns "?" when both names are null/empty', () => {
		expect(getInitials(null, null)).toBe('?');
		expect(getInitials(undefined, undefined)).toBe('?');
		expect(getInitials('', '')).toBe('?');
	});
});

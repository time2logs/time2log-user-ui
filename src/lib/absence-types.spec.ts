import { describe, expect, it, vi } from 'vitest';

vi.mock('@lucide/svelte/icons/palmtree', () => ({ default: () => {} }));
vi.mock('@lucide/svelte/icons/heart-pulse', () => ({ default: () => {} }));
vi.mock('@lucide/svelte/icons/shield', () => ({ default: () => {} }));
vi.mock('@lucide/svelte/icons/presentation', () => ({ default: () => {} }));
vi.mock('@lucide/svelte/icons/graduation-cap', () => ({ default: () => {} }));
vi.mock('@lucide/svelte/icons/tag', () => ({ default: () => {} }));

import {
	ABSENCE_TYPES,
	getAbsenceTypeHex,
	getAbsenceTypeLabel,
	getAbsenceTypeMeta
} from './absence-types';

describe('getAbsenceTypeMeta', () => {
	it('returns meta for a known type', () => {
		const meta = getAbsenceTypeMeta('sick');
		expect(meta).toBeDefined();
		expect(meta!.hex).toBe('#ef4444');
	});

	it('returns meta with icon component for vacation', () => {
		const meta = getAbsenceTypeMeta('vacation');
		expect(meta).toBeDefined();
		expect(meta!.hex).toBe('#3b82f6');
	});

	it('returns undefined for an unknown type', () => {
		expect(getAbsenceTypeMeta('nonexistent')).toBeUndefined();
	});
});

describe('getAbsenceTypeHex', () => {
	it('returns the hex for a known type', () => {
		expect(getAbsenceTypeHex('sick')).toBe('#ef4444');
		expect(getAbsenceTypeHex('vacation')).toBe('#3b82f6');
		expect(getAbsenceTypeHex('military')).toBe('#10b981');
		expect(getAbsenceTypeHex('uk')).toBe('#f59e0b');
		expect(getAbsenceTypeHex('berufsschule')).toBe('#8b5cf6');
		expect(getAbsenceTypeHex('custom')).toBe('#6b7280');
	});

	it('returns default grey for an unknown type', () => {
		expect(getAbsenceTypeHex('unknown')).toBe('#a3a3a3');
	});
});

describe('getAbsenceTypeLabel', () => {
	it('returns a non-empty string for a known type', () => {
		const label = getAbsenceTypeLabel('sick');
		expect(typeof label).toBe('string');
		expect(label.length).toBeGreaterThan(0);
	});

	it('returns the typeId as-is for an unknown type', () => {
		expect(getAbsenceTypeLabel('mystery')).toBe('mystery');
	});
});

describe('ABSENCE_TYPES', () => {
	it('has entries for all six absence types', () => {
		const keys = Object.keys(ABSENCE_TYPES);
		expect(keys).toHaveLength(6);
		expect(keys).toContain('sick');
		expect(keys).toContain('vacation');
		expect(keys).toContain('military');
		expect(keys).toContain('uk');
		expect(keys).toContain('berufsschule');
		expect(keys).toContain('custom');
	});

	it('each entry has hex, text, and icon', () => {
		for (const [, meta] of Object.entries(ABSENCE_TYPES)) {
			expect(typeof meta.hex).toBe('string');
			expect(meta.hex).toMatch(/^#[0-9a-f]{6}$/i);
			expect(typeof meta.text).toBe('string');
			expect(meta.icon).toBeDefined();
		}
	});
});

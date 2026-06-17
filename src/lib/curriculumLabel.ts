import { getLocale } from '$lib/paraglide/runtime.js';
import type { CurriculumNode } from './types';

const LOCALE_SHORT: Record<string, string> = {
	'de-ch': 'de',
	en: 'en',
	it: 'it',
	fr: 'fr'
};

export function getCurriculumLabel(node: Pick<CurriculumNode, 'label' | 'meta'>): string {
	const locale = LOCALE_SHORT[getLocale()] ?? getLocale();
	const labels = node.meta?.labels as Record<string, string> | undefined;
	return labels?.[locale] ?? node.label;
}

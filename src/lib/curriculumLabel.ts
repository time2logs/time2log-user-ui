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

export function buildLabelResolver(nodes: CurriculumNode[]): (id: string, fallback: string) => string {
    const map = new Map(nodes.map((n) => [n.id, n]));
    return (id, fallback) => {
        const node = map.get(id);
        return node ? getCurriculumLabel(node) : fallback;
    };
}
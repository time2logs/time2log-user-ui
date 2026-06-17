import type { IconComponent } from '$lib/utils';
import PalmtreeIcon from '@lucide/svelte/icons/palmtree';
import HeartPulseIcon from '@lucide/svelte/icons/heart-pulse';
import ShieldIcon from '@lucide/svelte/icons/shield';
import PresentationIcon from '@lucide/svelte/icons/presentation';
import GraduationCapIcon from '@lucide/svelte/icons/graduation-cap';
import TagIcon from '@lucide/svelte/icons/tag';
import type { AbsenceType } from '$lib/types';
import * as m from '$lib/paraglide/messages.js';

export type AbsenceTypeMeta = {
	hex: string;
	text: string;
	icon: IconComponent;
};

export const ABSENCE_TYPES: Record<AbsenceType, AbsenceTypeMeta> = {
	sick: { hex: '#ef4444', text: 'text-red-500 dark:text-red-400', icon: HeartPulseIcon },
	vacation: { hex: '#3b82f6', text: 'text-blue-500 dark:text-blue-400', icon: PalmtreeIcon },
	military: { hex: '#10b981', text: 'text-emerald-500 dark:text-emerald-400', icon: ShieldIcon },
	uk: { hex: '#f59e0b', text: 'text-amber-500 dark:text-amber-400', icon: PresentationIcon },
	berufsschule: {
		hex: '#8b5cf6',
		text: 'text-violet-500 dark:text-violet-400',
		icon: GraduationCapIcon
	},
	custom: { hex: '#6b7280', text: 'text-muted-foreground', icon: TagIcon }
};

const ABSENCE_TYPE_LABELS: Record<AbsenceType, () => string> = {
	sick: () => m.absence_type_sick(),
	vacation: () => m.absence_type_vacation(),
	military: () => m.absence_type_military(),
	uk: () => m.absence_type_uk(),
	berufsschule: () => m.absence_type_berufsschule(),
	custom: () => m.absence_type_custom()
};

export function getAbsenceTypeMeta(typeId: string): AbsenceTypeMeta | undefined {
	return ABSENCE_TYPES[typeId as AbsenceType];
}

export function getAbsenceTypeLabel(typeId: string): string {
	return ABSENCE_TYPE_LABELS[typeId as AbsenceType]?.() ?? typeId;
}

export function getAbsenceTypeHex(typeId: string): string {
	return ABSENCE_TYPES[typeId as AbsenceType]?.hex ?? '#a3a3a3';
}

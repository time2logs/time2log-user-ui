import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
export type {
	WithElementRef,
	WithoutChild,
	WithoutChildren,
	WithoutChildrenOrChild
} from 'bits-ui';

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export function formatHoursValue(value: number): string {
	const rounded = Math.round(value * 10) / 10;
	return Number.isInteger(rounded) ? `${rounded}` : rounded.toFixed(1);
}

export const EDIT_WINDOW_DAYS = 14;

export function isWithinEditWindow(entryDate: string, now: Date = new Date()): boolean {
	const entry = new Date(entryDate + 'T00:00:00');
	if (Number.isNaN(entry.getTime())) return false;
	const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
	const diffDays = Math.floor((today.getTime() - entry.getTime()) / (1000 * 60 * 60 * 24));
	return diffDays <= EDIT_WINDOW_DAYS;
}

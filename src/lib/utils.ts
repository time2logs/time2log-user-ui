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

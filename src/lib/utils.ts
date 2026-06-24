import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { Component } from 'svelte';
export type {
	WithElementRef,
	WithoutChild,
	WithoutChildren,
	WithoutChildrenOrChild
} from 'bits-ui';

/** Accepts any icon component (e.g. lucide-svelte icons). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type IconComponent = Component<any>;

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export const EDIT_WINDOW_DAYS = 14;

export function isWithinEditWindow(entryDate: string, now: Date = new Date()): boolean {
	const entry = new Date(entryDate + 'T00:00:00');
	if (Number.isNaN(entry.getTime())) return false;
	const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
	const diffDays = Math.floor((today.getTime() - entry.getTime()) / (1000 * 60 * 60 * 24));
	return diffDays <= EDIT_WINDOW_DAYS;
}

/**
 * Returns the date that should be used to evaluate the edit window for an
 * absence spanning a date range. Today is clamped into `[start_date, end_date]`:
 *  - today inside range  -> today (closest day to now)
 *  - today after range   -> end_date (closest past day to now)
 *  - today before range  -> start_date (future absence, stays editable)
 *
 * For multi-day absences this is the "day that matters" — the closest day to
 * today, which matches how single-entry activities are gated.
 */
export function getAbsenceReferenceDate(
	absence: { start_date: string; end_date: string },
	now: Date = new Date()
): string {
	const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
	const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(
		today.getDate()
	).padStart(2, '0')}`;
	if (todayStr <= absence.start_date) return absence.start_date;
	if (todayStr >= absence.end_date) return absence.end_date;
	return todayStr;
}

/**
 * Whether an absence is still within the edit window, evaluated against the
 * reference date returned by {@link getAbsenceReferenceDate}.
 */
export function isAbsenceWithinEditWindow(
	absence: { start_date: string; end_date: string },
	now: Date = new Date()
): boolean {
	return isWithinEditWindow(getAbsenceReferenceDate(absence, now), now);
}

export function formatHoursMinutes(hours: number): string {
	const wholeHours = Math.floor(hours);
	const minutes = Math.round((hours - wholeHours) * 60);
	if (minutes === 0) return `${wholeHours}h`;
	if (wholeHours === 0) return `${minutes}min`;
	return `${wholeHours}h ${minutes}min`;
}

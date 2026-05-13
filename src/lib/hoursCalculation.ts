import type { ActivityRecord } from './types';

export function getAvailableHours(maxHoursPerDay: number, absenceFraction: number): number {
	return Math.max(0, maxHoursPerDay * (1 - absenceFraction));
}

export function getDayHours(
	activities: ActivityRecord[],
	date: string,
	excludeId?: string
): number {
	return activities
		.filter((a) => a.entry_date === date && (!excludeId || a.id !== excludeId))
		.reduce((sum, a) => sum + a.hours, 0);
}

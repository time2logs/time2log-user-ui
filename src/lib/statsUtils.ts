import type { ActivityRecord } from './types';

export function getMondayOfWeek(date: Date): Date {
	const day = date.getDay(); // 0 = Sun
	const diff = day === 0 ? -6 : 1 - day;
	const monday = new Date(date);
	monday.setDate(date.getDate() + diff);
	monday.setHours(0, 0, 0, 0);
	return monday;
}

export function isoFromDate(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

export function computeHoursThisWeek(activities: ActivityRecord[], today: Date): number {
	const weekStart = isoFromDate(getMondayOfWeek(today));
	const todayIso = isoFromDate(today);
	return activities
		.filter((a) => a.entry_date >= weekStart && a.entry_date <= todayIso)
		.reduce((sum, a) => sum + a.hours, 0);
}

export function computeTotalHours(activities: ActivityRecord[]): number {
	return activities.reduce((sum, a) => sum + a.hours, 0);
}

export function computeActiveDaysThisMonth(activities: ActivityRecord[], today: Date): number {
	const monthPrefix = isoFromDate(today).slice(0, 7); // "YYYY-MM"
	return new Set(
		activities.filter((a) => a.entry_date.startsWith(monthPrefix)).map((a) => a.entry_date)
	).size;
}

/**
 * Returns up to `topN` activities sorted by total hours descending.
 * Remaining activities beyond topN are grouped into a single "other" entry.
 */
export function computeActivityBreakdown(
	activities: ActivityRecord[],
	topN: number = 5,
	otherLabel: string = 'Other'
): { name: string; hours: number }[] {
	const map = new Map<string, number>();
	for (const a of activities) {
		map.set(a.activity_name, (map.get(a.activity_name) ?? 0) + a.hours);
	}
	const sorted = [...map.entries()].sort((a, b) => b[1] - a[1]);
	const top = sorted.slice(0, topN);
	const rest = sorted.slice(topN).reduce((sum, [, h]) => sum + h, 0);
	const slices = top.map(([name, hours]) => ({ name, hours }));
	if (rest > 0) slices.push({ name: otherLabel, hours: rest });
	return slices;
}

/**
 * Returns weekly totals for the last `weeksBack + 1` weeks ending with the week
 * that contains `today`. Ordered oldest to newest.
 */
export function computeWeeklyData(
	activities: ActivityRecord[],
	today: Date,
	weeksBack: number = 7
): { weekStart: string; label: string; hours: number }[] {
	const weeks: { weekStart: string; label: string; hours: number }[] = [];
	for (let i = weeksBack; i >= 0; i--) {
		const monday = getMondayOfWeek(new Date(today.getTime() - i * 7 * 86_400_000));
		const sunday = new Date(monday.getTime() + 6 * 86_400_000);
		const from = isoFromDate(monday);
		const to = isoFromDate(sunday);
		const hours = activities
			.filter((a) => a.entry_date >= from && a.entry_date <= to)
			.reduce((sum, a) => sum + a.hours, 0);
		const label = monday.toLocaleDateString('en', { month: 'short', day: 'numeric' });
		weeks.push({ weekStart: from, label, hours });
	}
	return weeks;
}

export function computeAbsencesBySemester(
	absences: import('./types').AbsenceRecord[]
): { semester: string; type: string; days: number }[] {
	const map = new Map<string, Map<string, number>>();

	for (const a of absences) {
		const start = new Date(`${a.start_date}T12:00:00`);
		const year = start.getFullYear();
		const month = start.getMonth() + 1; // 1–12

		const semesterNum = month >= 8 ? 1 : 2;
		const semesterYear = month >= 8 ? year : year - 1;
		const semesterKey = `${semesterYear}/S${semesterNum}`;

		if (!map.has(semesterKey)) map.set(semesterKey, new Map());
		const typeMap = map.get(semesterKey)!;
		const current = typeMap.get(a.absence_type_id) ?? 0;
		typeMap.set(a.absence_type_id, current + Number(a.day_fraction));
	}

	const result: { semester: string; type: string; days: number }[] = [];
	for (const [semester, typeMap] of [...map.entries()].sort()) {
		for (const [type, days] of typeMap.entries()) {
			result.push({ semester, type, days: Math.round(days * 10) / 10 });
		}
	}
	return result;
}

export function toIsoDate(date: Date): string {
	return date.toISOString().split('T')[0];
}

export function getTodayIso(): string {
	return toIsoDate(new Date());
}

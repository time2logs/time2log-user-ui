<script lang="ts">
	import { AlertTriangle, CheckCircle } from 'lucide-svelte';
	import type { ActivityRecord, AbsenceRecord } from '$lib/types';
	import { isDateInAbsence } from '$lib/absenceStorage';
	import * as m from '$lib/paraglide/messages.js';
	import { getLocalTimeZone, startOfMonth, today } from '@internationalized/date';

	type Props = {
		activities: ActivityRecord[];
		absences: AbsenceRecord[];
	};

	let { activities, absences }: Props = $props();

	const timeZone = getLocalTimeZone();

	const unreportedCount = $derived.by(() => {
		const todayDate = today(timeZone);

		const workdays: string[] = [];
		// Only count days within the current calendar month (matches the banner copy),
		// up to yesterday — today isn't overdue yet. Weekends are skipped below.
		let cursor = startOfMonth(todayDate);
		const yesterday = todayDate.subtract({ days: 1 });

		while (cursor.compare(yesterday) <= 0) {
			const dayOfWeek = cursor.toDate(timeZone).getDay();
			if (dayOfWeek !== 0 && dayOfWeek !== 6) {
				workdays.push(cursor.toString());
			}
			cursor = cursor.add({ days: 1 });
		}

		const reportedDates = new Set(activities.map((a) => a.entry_date));

		return workdays.filter(
			(date) => !reportedDates.has(date) && !absences.some((a) => isDateInAbsence(date, a))
		).length;
	});
</script>

{#if unreportedCount === 0}
	<div
		class="mb-4 flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-700 dark:text-green-400"
	>
		<CheckCircle class="h-4 w-4 shrink-0" />
		{m.unreported_days_banner_zero()}
	</div>
{:else}
	<div
		class="mb-4 flex items-center gap-2 rounded-lg border border-orange-500/30 bg-orange-500/10 px-4 py-3 text-sm text-orange-700 dark:text-orange-400"
	>
		<AlertTriangle class="h-4 w-4 shrink-0" />
		{unreportedCount === 1
			? m.unreported_days_banner_one({ count: unreportedCount })
			: m.unreported_days_banner_many({ count: unreportedCount })}
	</div>
{/if}

<script lang="ts">
	import * as m from '$lib/paraglide/messages.js';

	let {
		loggedHours,
		targetHours,
		loggedAbsenceTimeInDays
	}: {
		loggedHours: number;
		targetHours: number;
		loggedAbsenceTimeInDays: number;
	} = $props();

	const totalHours = $derived(loggedHours + loggedAbsenceTimeInDays * targetHours);

	const pct = $derived(targetHours > 0 ? Math.min((totalHours / targetHours) * 100, 100) : 0);
	const isComplete = $derived(totalHours >= targetHours);

	const barColor = $derived(
		isComplete ? 'bg-green-500' : pct >= 50 ? 'bg-yellow-500' : 'bg-red-500'
	);

	const textColor = $derived(
		isComplete
			? 'text-green-600 dark:text-green-400'
			: pct >= 50
				? 'text-yellow-600 dark:text-yellow-400'
				: 'text-red-600 dark:text-red-400'
	);
</script>

<div class="m-2 px-3 py-2 sm:px-4">
	<div class="mb-1.5 flex items-center justify-between gap-2">
		<span class="text-xs font-medium text-muted-foreground">{m.daily_hours_goal_label()}</span>
		<span class="text-xs font-semibold tabular-nums {textColor}">
			{m.daily_hours_logged({ logged: totalHours, target: targetHours })}
		</span>
	</div>
	<div class="h-2 w-full overflow-hidden rounded-full bg-muted">
		<div
			class="h-full rounded-full transition-all duration-500 {barColor}"
			style="width: {pct}%"
		></div>
	</div>
</div>

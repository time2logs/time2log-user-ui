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
		isComplete ? 'bg-success' : pct >= 50 ? 'bg-warning' : 'bg-destructive'
	);

	const textColor = $derived(
		isComplete ? 'text-success' : pct >= 50 ? 'text-warning' : 'text-destructive'
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

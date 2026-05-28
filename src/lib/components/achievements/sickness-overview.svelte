<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import * as m from '$lib/paraglide/messages.js';
	import { Thermometer } from 'lucide-svelte';

	let {
		sickThisYear,
		sickLast12Months,
		sickAllTime,
		byMonth,
		year,
		workdaysAllTime
	}: {
		sickThisYear: number;
		sickLast12Months: number;
		sickAllTime: number;
		byMonth: { month: string; monthIndex: number; days: number }[];
		year: number;
		workdaysAllTime: number;
	} = $props();

	const maxMonth = $derived(byMonth.length > 0 ? Math.max(1, ...byMonth.map((b) => b.days)) : 1);

	function fmt(n: number): string {
		return (Math.round(n * 10) / 10).toString();
	}
</script>

<Card.Root>
	<Card.Header class="pt-5 pb-2">
		<Card.Title class="flex items-center gap-2 text-base font-semibold">
			<Thermometer class="h-4 w-4 text-rose-500" />
			{m.ach_section_sickness()}
		</Card.Title>
		<Card.Description>{m.ach_section_sickness_desc()}</Card.Description>
	</Card.Header>
	<Card.Content class="pb-5">
		<div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
			<div class="rounded-lg bg-muted/40 p-4 text-center">
				<p class="text-3xl font-bold text-rose-500 tabular-nums">{fmt(sickThisYear)}</p>
				<p class="mt-1 text-xs text-muted-foreground">{m.ach_sick_this_year()}</p>
			</div>
			<div class="rounded-lg bg-muted/40 p-4 text-center">
				<p class="text-3xl font-bold text-rose-500 tabular-nums">{fmt(sickLast12Months)}</p>
				<p class="mt-1 text-xs text-muted-foreground">{m.ach_sick_last_12mo()}</p>
			</div>
			<div class="rounded-lg bg-muted/40 p-4 text-center">
				<p class="text-3xl font-bold text-rose-500 tabular-nums">{fmt(sickAllTime)}</p>
				<p class="mt-1 text-xs text-muted-foreground">{m.ach_sick_all_time()}</p>
			</div>
		</div>

		{#if workdaysAllTime > 0}
			<p class="mt-3 text-center text-xs text-muted-foreground">
				{m.ach_sick_rate({ sick: fmt(sickAllTime), work: workdaysAllTime })}
			</p>
		{/if}

		<div class="mt-5">
			<p class="mb-2 text-xs font-medium text-muted-foreground">
				{m.ach_sick_by_month({ year })}
			</p>
			<div class="flex h-32 items-end gap-1 sm:gap-2">
				{#each byMonth as bucket (bucket.monthIndex)}
					{@const heightPct =
						maxMonth > 0 ? Math.max(bucket.days > 0 ? 8 : 0, (bucket.days / maxMonth) * 100) : 0}
					<div
						class="flex-1 rounded-t bg-rose-400/70 transition-all"
						style="height: {heightPct}%; min-height: {bucket.days > 0 ? '6px' : '0'}"
						title="{bucket.month}: {fmt(bucket.days)}"
					></div>
				{/each}
			</div>
			<div class="mt-1 flex gap-1 sm:gap-2">
				{#each byMonth as bucket (bucket.monthIndex)}
					<span class="flex-1 text-center text-[10px] text-muted-foreground">{bucket.month}</span>
				{/each}
			</div>
		</div>
	</Card.Content>
</Card.Root>

<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import * as m from '$lib/paraglide/messages.js';
	import { Thermometer } from 'lucide-svelte';
	import { getDateLocale } from '$lib/dateLocale';
	import type { SickMonthBucket } from '$lib/achievementsUtils';
	import StatTile from './stat-tile.svelte';

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
		byMonth: SickMonthBucket[];
		year: number;
		workdaysAllTime: number;
	} = $props();

	const monthLabels = $derived.by(() => {
		const formatter = new Intl.DateTimeFormat(getDateLocale(), { month: 'short' });
		return byMonth.map((bucket) => formatter.format(new Date(year, bucket.monthIndex, 1)));
	});

	const maxMonth = $derived(
		byMonth.length > 0 ? Math.max(1, ...byMonth.map((bucket) => bucket.days)) : 1
	);

	function formatDays(value: number): string {
		return (Math.round(value * 10) / 10).toString();
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
		<div class="grid grid-cols-3 gap-2 sm:gap-3">
			<StatTile
				value={formatDays(sickThisYear)}
				label={m.ach_sick_this_year()}
				valueClass="text-rose-500"
			/>
			<StatTile
				value={formatDays(sickLast12Months)}
				label={m.ach_sick_last_12mo()}
				valueClass="text-rose-500"
			/>
			<StatTile
				value={formatDays(sickAllTime)}
				label={m.ach_sick_all_time()}
				valueClass="text-rose-500"
			/>
		</div>

		{#if workdaysAllTime > 0}
			<p class="mt-3 text-center text-xs text-muted-foreground">
				{m.ach_sick_rate({ sick: formatDays(sickAllTime), work: workdaysAllTime })}
			</p>
		{/if}

		<div class="mt-5">
			<p class="mb-2 text-xs font-medium text-muted-foreground">
				{m.ach_sick_by_month({ year })}
			</p>
			<div class="flex h-32 items-end gap-1 sm:gap-2">
				{#each byMonth as bucket, index (bucket.monthIndex)}
					{@const heightPct =
						maxMonth > 0 ? Math.max(bucket.days > 0 ? 8 : 0, (bucket.days / maxMonth) * 100) : 0}
					<div
						class="flex-1 rounded-t bg-rose-400/70 transition-all"
						style="height: {heightPct}%; min-height: {bucket.days > 0 ? '6px' : '0'}"
						title="{monthLabels[index]}: {formatDays(bucket.days)}"
					></div>
				{/each}
			</div>
			<div class="mt-1 flex gap-1 sm:gap-2">
				{#each monthLabels as label, index (index)}
					<span class="flex-1 text-center text-[10px] text-muted-foreground">{label}</span>
				{/each}
			</div>
		</div>
	</Card.Content>
</Card.Root>

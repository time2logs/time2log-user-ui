<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import * as m from '$lib/paraglide/messages.js';
	import { MapPin } from 'lucide-svelte';
	import type { LocationStat } from '$lib/achievementsUtils';

	let { locations }: { locations: LocationStat[] } = $props();

	const maxHours = $derived(locations.length > 0 ? Math.max(...locations.map((l) => l.hours)) : 0);

	const palette = [
		'var(--chart-1)',
		'var(--chart-2)',
		'var(--chart-3)',
		'var(--chart-4)',
		'var(--chart-5)',
		'var(--muted-foreground)'
	];
</script>

<Card.Root>
	<Card.Header class="pt-5 pb-2">
		<Card.Title class="flex items-center gap-2 text-base font-semibold">
			<MapPin class="h-4 w-4 text-primary" />
			{m.ach_section_locations()}
		</Card.Title>
		<Card.Description>{m.ach_section_locations_desc()}</Card.Description>
	</Card.Header>
	<Card.Content class="pb-5">
		{#if locations.length === 0}
			<p class="py-6 text-center text-sm text-muted-foreground">{m.ach_no_locations()}</p>
		{:else}
			<ul class="flex flex-col gap-3">
				{#each locations as loc, i (loc.location)}
					{@const width = maxHours > 0 ? Math.max(4, (loc.hours / maxHours) * 100) : 0}
					<li class="flex flex-col gap-1">
						<div class="flex items-center justify-between gap-2 text-sm">
							<span class="flex min-w-0 items-center gap-2">
								<span
									class="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold tabular-nums"
								>
									{i + 1}
								</span>
								<span class="truncate font-medium" title={loc.location}>{loc.location}</span>
							</span>
							<span class="shrink-0 text-muted-foreground tabular-nums">
								{m.ach_hours_unit({ hours: Math.round(loc.hours * 10) / 10 })}
							</span>
						</div>
						<div class="h-2 w-full overflow-hidden rounded-full bg-muted">
							<div
								class="h-full rounded-full transition-all"
								style="width: {width}%; background: {palette[i % palette.length]}"
							></div>
						</div>
					</li>
				{/each}
			</ul>
		{/if}
	</Card.Content>
</Card.Root>

<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import * as m from '$lib/paraglide/messages.js';
	import MapPin from '@lucide/svelte/icons/map-pin';
	import type { LocationStat } from '$lib/achievementsUtils';

	let { locations: locationStats }: { locations: LocationStat[] } = $props();
</script>

<Card.Root>
	<Card.Header class="pt-5 pb-2">
		<Card.Title class="flex items-center gap-2 text-base font-semibold">
			<MapPin class="h-4 w-4 text-primary" />
			{m.achievement_section_locations()}
		</Card.Title>
	</Card.Header>
	<Card.Content class="pb-5">
		{#if locationStats.length === 0}
			<p class="py-6 text-center text-sm text-muted-foreground">
				{m.achievement_no_locations()}
			</p>
		{:else}
			<ul class="flex flex-col gap-2">
				{#each locationStats as locationStat, locationIndex (locationStat.location)}
					<li class="flex items-center justify-between gap-2 text-sm">
						<span class="flex min-w-0 items-center gap-2">
							<span
								class="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold tabular-nums"
								>{locationIndex + 1}</span
							>
							<span class="truncate font-medium" title={locationStat.location}
								>{locationStat.location}</span
							>
						</span>
						<span class="shrink-0 text-muted-foreground tabular-nums"
							>{m.achievement_hours_unit({ hours: locationStat.hours })}</span
						>
					</li>
				{/each}
			</ul>
		{/if}
	</Card.Content>
</Card.Root>

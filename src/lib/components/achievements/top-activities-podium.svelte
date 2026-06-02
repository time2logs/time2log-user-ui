<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import * as m from '$lib/paraglide/messages.js';
	import { Layers } from 'lucide-svelte';

	let { items }: { items: { name: string; hours: number }[] } = $props();

	const podium = $derived([items[0] ?? null, items[1] ?? null, items[2] ?? null]);
	const medals = ['🥇', '🥈', '🥉'];
	const heights = ['h-36 sm:h-44', 'h-28 sm:h-32', 'h-24 sm:h-28'];
	const order = [1, 0, 2];
</script>

<Card.Root>
	<Card.Header class="pt-5 pb-2">
		<Card.Title class="flex items-center gap-2 text-base font-semibold">
			<Layers class="h-4 w-4 text-primary" />
			{m.ach_section_activities()}
		</Card.Title>
		<Card.Description>{m.ach_section_activities_desc()}</Card.Description>
	</Card.Header>
	<Card.Content class="pb-5">
		{#if items.length === 0}
			<p class="py-6 text-center text-sm text-muted-foreground">{m.ach_no_activities()}</p>
		{:else}
			<div class="grid grid-cols-3 items-end gap-2 sm:gap-3">
				{#each order as rank (rank)}
					{@const item = podium[rank]}
					<div class="flex flex-col items-center gap-2">
						<div class="text-2xl sm:text-3xl">{medals[rank]}</div>
						<div
							class="flex w-full flex-col items-center justify-end rounded-t-lg border border-b-0 px-2 pt-3 pb-2 text-center {heights[
								rank
							]}"
							style={item
								? `background: linear-gradient(180deg, var(--chart-${rank + 1}) 0%, transparent 100%); opacity: 0.95`
								: 'background: var(--muted)'}
						>
							{#if item}
								<p
									class="line-clamp-2 text-xs font-semibold text-foreground sm:text-sm"
									title={item.name}
								>
									{item.name}
								</p>
								<p class="mt-1 text-sm font-bold tabular-nums">
									{m.ach_hours_unit({ hours: Math.round(item.hours * 10) / 10 })}
								</p>
							{:else}
								<p class="text-xs text-muted-foreground">{m.ach_podium_empty_slot()}</p>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</Card.Content>
</Card.Root>

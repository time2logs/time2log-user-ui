<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import * as m from '$lib/paraglide/messages.js';
	import { Layers } from 'lucide-svelte';

	let { items }: { items: { name: string; hours: number }[] } = $props();

	let expanded = $state(false);

	const podium = $derived([items[0] ?? null, items[1] ?? null, items[2] ?? null]);
	const rest = $derived(items.slice(3));
	const maxRestHours = $derived(rest.length > 0 ? Math.max(...rest.map((r) => r.hours)) : 0);

	const podiumOrder = $derived([
		{ rank: 2, item: podium[1], heightClass: 'h-28 sm:h-32', medal: '🥈' },
		{ rank: 1, item: podium[0], heightClass: 'h-36 sm:h-44', medal: '🥇' },
		{ rank: 3, item: podium[2], heightClass: 'h-24 sm:h-28', medal: '🥉' }
	]);
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
				{#each podiumOrder as slot (slot.rank)}
					<div class="flex flex-col items-center gap-2">
						<div class="text-2xl sm:text-3xl">{slot.medal}</div>
						<div
							class="flex w-full flex-col items-center justify-end rounded-t-lg border border-b-0 px-2 pt-3 pb-2 text-center {slot.heightClass}"
							style={slot.item
								? `background: linear-gradient(180deg, var(--chart-${slot.rank}) 0%, transparent 100%); opacity: 0.95`
								: 'background: var(--muted)'}
						>
							{#if slot.item}
								<p
									class="line-clamp-2 text-xs font-semibold text-foreground sm:text-sm"
									title={slot.item.name}
								>
									{slot.item.name}
								</p>
								<p class="mt-1 text-sm font-bold tabular-nums">
									{m.ach_hours_unit({ hours: Math.round(slot.item.hours * 10) / 10 })}
								</p>
							{:else}
								<p class="text-xs text-muted-foreground">{m.ach_podium_empty_slot()}</p>
							{/if}
						</div>
					</div>
				{/each}
			</div>

			{#if rest.length > 0}
				<div class="mt-4 flex justify-center">
					<Button variant="ghost" size="sm" onclick={() => (expanded = !expanded)}>
						{expanded ? m.ach_show_less() : m.ach_show_more({ count: rest.length })}
					</Button>
				</div>

				{#if expanded}
					<ul class="mt-3 flex flex-col gap-2">
						{#each rest as item, i (item.name)}
							{@const width = maxRestHours > 0 ? Math.max(4, (item.hours / maxRestHours) * 100) : 0}
							<li class="flex flex-col gap-1">
								<div class="flex items-center justify-between gap-2 text-sm">
									<span class="flex min-w-0 items-center gap-2">
										<span
											class="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold tabular-nums"
										>
											{i + 4}
										</span>
										<span class="truncate" title={item.name}>{item.name}</span>
									</span>
									<span class="shrink-0 text-muted-foreground tabular-nums">
										{m.ach_hours_unit({ hours: Math.round(item.hours * 10) / 10 })}
									</span>
								</div>
								<div class="h-1.5 w-full overflow-hidden rounded-full bg-muted">
									<div
										class="h-full rounded-full bg-primary/70 transition-all"
										style="width: {width}%"
									></div>
								</div>
							</li>
						{/each}
					</ul>
				{/if}
			{/if}
		{/if}
	</Card.Content>
</Card.Root>

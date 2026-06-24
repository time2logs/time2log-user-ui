<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import * as m from '$lib/paraglide/messages.js';
	import Layers from '@lucide/svelte/icons/layers';

	let { items: activityItems }: { items: { name: string; hours: number }[] } = $props();

	const podiumActivities = $derived([
		activityItems[0] ?? null,
		activityItems[1] ?? null,
		activityItems[2] ?? null
	]);
	const podiumMedals = ['🥇', '🥈', '🥉'];
	const podiumHeightClasses = ['h-36 sm:h-44', 'h-28 sm:h-32', 'h-24 sm:h-28'];
	const podiumDisplayOrder = [1, 0, 2];
</script>

<Card.Root>
	<Card.Header class="pt-5 pb-2">
		<Card.Title class="flex items-center gap-2 text-base font-semibold">
			<Layers class="h-4 w-4 text-primary" />
			{m.achievement_section_activities()}
		</Card.Title>
		<Card.Description>{m.achievement_section_activities_desc()}</Card.Description>
	</Card.Header>
	<Card.Content class="pb-5">
		{#if activityItems.length === 0}
			<p class="py-6 text-center text-sm text-muted-foreground">
				{m.achievement_no_activities()}
			</p>
		{:else}
			<div class="grid grid-cols-3 items-end gap-2 sm:gap-3">
				{#each podiumDisplayOrder as podiumRank (podiumRank)}
					{@const podiumActivity = podiumActivities[podiumRank]}
					<div class="flex flex-col items-center gap-2">
						<div class="text-2xl sm:text-3xl">{podiumMedals[podiumRank]}</div>
						<div
							class="flex w-full flex-col items-center justify-end rounded-t-lg border border-b-0 px-2 pt-3 pb-2 text-center {podiumHeightClasses[
								podiumRank
							]}"
							style={podiumActivity
								? `background: linear-gradient(180deg, var(--chart-${podiumRank + 1}) 0%, transparent 100%); opacity: 0.95`
								: 'background: var(--muted)'}
						>
							{#if podiumActivity}
								<p
									class="line-clamp-2 text-xs font-semibold text-foreground sm:text-sm"
									title={podiumActivity.name}
								>
									{podiumActivity.name}
								</p>
								<p class="mt-1 text-sm font-bold tabular-nums">
									{m.achievement_hours_unit({ hours: Math.round(podiumActivity.hours * 10) / 10 })}
								</p>
							{:else}
								<p class="text-xs text-muted-foreground">{m.achievement_podium_empty_slot()}</p>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</Card.Content>
</Card.Root>

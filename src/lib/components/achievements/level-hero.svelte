<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import * as m from '$lib/paraglide/messages.js';
	import { Trophy, Flame, Star } from 'lucide-svelte';
	import type { LevelInfo } from '$lib/achievementsUtils';
	import StatTile from './stat-tile.svelte';

	let {
		totalHours,
		currentStreak,
		level
	}: { totalHours: number; currentStreak: number; level: LevelInfo } = $props();

	const totalHoursRounded = $derived(Math.round(totalHours * 10) / 10);
	const progressPercent = $derived(Math.round(level.progress * 100));
</script>

<Card.Root class="overflow-hidden">
	<Card.Header class="pt-4 pb-1 sm:pt-5 sm:pb-2">
		<Card.Title class="flex items-center gap-2 text-sm font-semibold sm:text-base">
			<Star class="h-4 w-4 text-primary" />
			{m.ach_section_hero()}
		</Card.Title>
	</Card.Header>
	<Card.Content class="pb-4 sm:pb-5">
		<div class="grid grid-cols-3 gap-2 sm:gap-4">
			<StatTile value={totalHoursRounded} label={m.ach_total_hours()}>
				{#snippet icon()}
					<Trophy class="h-4 w-4 text-amber-500 sm:h-6 sm:w-6" />
				{/snippet}
			</StatTile>
			<StatTile value={currentStreak} label={m.ach_current_streak()}>
				{#snippet icon()}
					<Flame class="h-4 w-4 text-orange-500 sm:h-6 sm:w-6" />
				{/snippet}
			</StatTile>
			<StatTile value={level.level} label={m.ach_level({ level: level.level })}>
				{#snippet icon()}
					<Star class="h-4 w-4 text-primary sm:h-6 sm:w-6" />
				{/snippet}
			</StatTile>
		</div>

		<div class="mt-3 sm:mt-5">
			<div
				class="mb-1 flex items-center justify-between text-[11px] text-muted-foreground sm:mb-1.5 sm:text-xs"
			>
				<span class="truncate">
					{m.ach_xp_to_next({
						current: Math.round(level.xpInLevel),
						next: Math.round(level.xpForNext),
						nextLevel: level.level + 1
					})}
				</span>
				<span class="ml-2 shrink-0 tabular-nums">{progressPercent}%</span>
			</div>
			<div class="h-1.5 w-full overflow-hidden rounded-full bg-muted sm:h-2">
				<div
					class="h-full rounded-full bg-gradient-to-r from-primary to-amber-400 transition-all"
					style="width: {progressPercent}%"
				></div>
			</div>
		</div>
	</Card.Content>
</Card.Root>

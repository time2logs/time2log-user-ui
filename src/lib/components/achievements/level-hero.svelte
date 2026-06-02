<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import * as m from '$lib/paraglide/messages.js';
	import { Trophy, Flame, Star } from 'lucide-svelte';
	import type { LevelInfo } from '$lib/achievementsUtils';

	let {
		totalHours,
		currentStreak,
		level
	}: { totalHours: number; currentStreak: number; level: LevelInfo } = $props();
	const hours = $derived(Math.round(totalHours * 10) / 10);
	const pct = $derived(Math.round(level.progress * 100));
</script>

<Card.Root class="overflow-hidden">
	<Card.Header class="pt-4 pb-1">
		<Card.Title class="flex items-center gap-2 text-sm font-semibold sm:text-base">
			<Star class="h-4 w-4 text-primary" />
			{m.ach_section_hero()}
		</Card.Title>
	</Card.Header>
	<Card.Content class="pb-4 sm:pb-5">
		<div class="grid grid-cols-3 gap-2 sm:gap-4">
			{#each [{ icon: Trophy, cls: 'text-amber-500', value: hours, label: m.ach_total_hours() }, { icon: Flame, cls: 'text-orange-500', value: currentStreak, label: m.ach_current_streak() }, { icon: Star, cls: 'text-primary', value: level.level, label: m.ach_level( { level: level.level } ) }] as tile (tile.label)}
				<div class="flex flex-col items-center rounded-lg bg-muted/40 p-2 text-center sm:p-4">
					<div class="mb-1 sm:mb-2"><tile.icon class="h-4 w-4 sm:h-6 sm:w-6 {tile.cls}" /></div>
					<p class="text-xl font-bold tabular-nums sm:text-3xl">{tile.value}</p>
					<p class="mt-0.5 text-[10px] leading-tight text-muted-foreground sm:text-xs">
						{tile.label}
					</p>
				</div>
			{/each}
		</div>
		<div class="mt-3 sm:mt-5">
			<div
				class="mb-1 flex items-center justify-between text-[11px] text-muted-foreground sm:text-xs"
			>
				<span class="truncate"
					>{m.ach_xp_to_next({
						current: Math.round(level.xpInLevel),
						next: Math.round(level.xpForNext),
						nextLevel: level.level + 1
					})}</span
				>
				<span class="ml-2 shrink-0 tabular-nums">{pct}%</span>
			</div>
			<div class="h-1.5 w-full overflow-hidden rounded-full bg-muted sm:h-2">
				<div
					class="h-full rounded-full bg-gradient-to-r from-primary to-amber-400 transition-all"
					style="width: {pct}%"
				></div>
			</div>
		</div>
	</Card.Content>
</Card.Root>

<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import * as m from '$lib/paraglide/messages.js';
	import {
		Award,
		Sparkles,
		Clock,
		Hourglass,
		Trophy,
		Crown,
		Flame,
		Layers,
		MapPin,
		Zap,
		Shield,
		Lock
	} from 'lucide-svelte';
	import type { AchievementStatus } from '$lib/achievementsUtils';

	let { achievements }: { achievements: AchievementStatus[] } = $props();

	const iconMap = {
		Sparkles,
		Clock,
		Hourglass,
		Trophy,
		Crown,
		Flame,
		Layers,
		MapPin,
		Zap,
		Shield
	} as const;

	type IconName = keyof typeof iconMap;

	const labelMap: Record<string, () => string> = {
		ach_first_log: m.ach_first_log,
		ach_ten_hours: m.ach_ten_hours,
		ach_hundred_hours: m.ach_hundred_hours,
		ach_five_hundred_hours: m.ach_five_hundred_hours,
		ach_thousand_hours: m.ach_thousand_hours,
		ach_streak_5: m.ach_streak_5,
		ach_streak_20: m.ach_streak_20,
		ach_varied_5: m.ach_varied_5,
		ach_globetrotter_3: m.ach_globetrotter_3,
		ach_marathon_day: m.ach_marathon_day,
		ach_iron_health: m.ach_iron_health
	};

	const descMap: Record<string, () => string> = {
		ach_first_log_desc: m.ach_first_log_desc,
		ach_ten_hours_desc: m.ach_ten_hours_desc,
		ach_hundred_hours_desc: m.ach_hundred_hours_desc,
		ach_five_hundred_hours_desc: m.ach_five_hundred_hours_desc,
		ach_thousand_hours_desc: m.ach_thousand_hours_desc,
		ach_streak_5_desc: m.ach_streak_5_desc,
		ach_streak_20_desc: m.ach_streak_20_desc,
		ach_varied_5_desc: m.ach_varied_5_desc,
		ach_globetrotter_3_desc: m.ach_globetrotter_3_desc,
		ach_marathon_day_desc: m.ach_marathon_day_desc,
		ach_iron_health_desc: m.ach_iron_health_desc
	};

	const unlockedCount = $derived(achievements.filter((a) => a.unlocked).length);

	function renderProgress(a: AchievementStatus): string {
		const current = Math.min(a.current, a.threshold);
		const cur = Math.round(current * 10) / 10;
		return `${cur} / ${a.threshold}`;
	}

	function label(key: string): string {
		const fn = labelMap[key];
		return fn ? fn() : key;
	}

	function desc(key: string): string {
		const fn = descMap[key];
		return fn ? fn() : key;
	}
</script>

<Card.Root>
	<Card.Header class="pt-5 pb-2">
		<Card.Title class="flex items-center gap-2 text-base font-semibold">
			<Award class="h-4 w-4 text-primary" />
			{m.ach_section_badges()}
		</Card.Title>
		<Card.Description>
			{m.ach_section_badges_desc()} ·
			{m.ach_unlocked_count({ unlocked: unlockedCount, total: achievements.length })}
		</Card.Description>
	</Card.Header>
	<Card.Content class="pb-5">
		<div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
			{#each achievements as a (a.id)}
				{@const Icon = iconMap[a.icon as IconName] ?? Award}
				{@const pct = Math.round(a.progress * 100)}
				<div
					class="relative flex flex-col items-center rounded-lg border p-3 text-center transition-all {a.unlocked
						? 'border-primary/40 bg-card shadow-sm ring-1 ring-primary/20'
						: 'border-border bg-muted/30 opacity-60 grayscale'}"
				>
					{#if !a.unlocked}
						<Lock class="absolute top-2 right-2 h-3 w-3 text-muted-foreground" />
					{/if}
					<div
						class="mb-2 flex h-12 w-12 items-center justify-center rounded-full {a.unlocked
							? 'bg-primary/15 text-primary'
							: 'bg-muted text-muted-foreground'}"
					>
						<Icon class="h-6 w-6" />
					</div>
					<p class="text-sm font-semibold text-foreground">{label(a.labelKey)}</p>
					<p class="mt-0.5 text-[11px] leading-tight text-muted-foreground">
						{desc(a.descriptionKey)}
					</p>
					<div class="mt-2 w-full">
						<div class="h-1.5 w-full overflow-hidden rounded-full bg-muted">
							<div
								class="h-full rounded-full transition-all {a.unlocked
									? 'bg-primary'
									: 'bg-muted-foreground/40'}"
								style="width: {pct}%"
							></div>
						</div>
						<p class="mt-1 text-[10px] text-muted-foreground tabular-nums">{renderProgress(a)}</p>
					</div>
				</div>
			{/each}
		</div>
	</Card.Content>
</Card.Root>

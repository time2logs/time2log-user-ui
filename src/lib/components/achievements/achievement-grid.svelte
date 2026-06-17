<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import * as m from '$lib/paraglide/messages.js';
	import Award from '@lucide/svelte/icons/award';
	import Sparkles from '@lucide/svelte/icons/sparkles';
	import Clock from '@lucide/svelte/icons/clock';
	import Flame from '@lucide/svelte/icons/flame';
	import Crown from '@lucide/svelte/icons/crown';
	import Lock from '@lucide/svelte/icons/lock';
	import type { AchievementStatus } from '$lib/achievementsUtils';

	let { achievements }: { achievements: AchievementStatus[] } = $props();

	const achievementIconComponents: Record<string, typeof Award> = { Sparkles, Clock, Flame, Crown };
	const achievementLabelMessageFunctions: Record<string, () => string> = {
		achievement_first_log: m.achievement_first_log,
		achievement_250_hours: m.achievement_250_hours,
		achievement_streak_15: m.achievement_streak_15,
		achievement_thousand_hours: m.achievement_thousand_hours
	};
	const achievementDescriptionMessageFunctions: Record<string, () => string> = {
		achievement_first_log_desc: m.achievement_first_log_desc,
		achievement_250_hours_desc: m.achievement_250_hours_desc,
		achievement_streak_15_desc: m.achievement_streak_15_desc,
		achievement_thousand_hours_desc: m.achievement_thousand_hours_desc
	};

	const unlockedAchievementCount = $derived(
		achievements.filter((achievement) => achievement.unlocked).length
	);
</script>

<Card.Root>
	<Card.Header class="pt-5 pb-2">
		<Card.Title class="flex items-center gap-2 text-base font-semibold">
			<Award class="h-4 w-4 text-primary" />
			{m.achievement_section_badges()} · {m.achievement_unlocked_count({
				unlocked: unlockedAchievementCount,
				total: achievements.length
			})}
		</Card.Title>
	</Card.Header>
	<Card.Content class="pb-5">
		<div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
			{#each achievements as achievement (achievement.id)}
				{@const AchievementIcon = achievementIconComponents[achievement.icon] ?? Award}
				{@const progressPercent = Math.round(achievement.progress * 100)}
				{@const displayedCurrentValue =
					Math.round(Math.min(achievement.current, achievement.threshold) * 10) / 10}
				<div
					class="relative flex flex-col items-center rounded-lg border p-3 text-center transition-all {achievement.unlocked
						? 'border-primary/40 bg-card shadow-sm ring-1 ring-primary/20'
						: 'border-border bg-muted/30 opacity-60 grayscale'}"
				>
					{#if !achievement.unlocked}<Lock
							class="absolute top-2 right-2 h-3 w-3 text-muted-foreground"
						/>{/if}
					<div
						class="mb-2 flex h-12 w-12 items-center justify-center rounded-full {achievement.unlocked
							? 'bg-primary/15 text-primary'
							: 'bg-muted text-muted-foreground'}"
					>
						<AchievementIcon class="h-6 w-6" />
					</div>
					<p class="text-sm font-semibold text-foreground">
						{achievementLabelMessageFunctions[achievement.labelMessageKey]?.() ??
							achievement.labelMessageKey}
					</p>
					<p class="mt-0.5 text-[11px] leading-tight text-muted-foreground">
						{achievementDescriptionMessageFunctions[achievement.descriptionMessageKey]?.() ??
							achievement.descriptionMessageKey}
					</p>
					<div class="mt-2 w-full">
						<div class="h-1.5 w-full overflow-hidden rounded-full bg-muted">
							<div
								class="h-full rounded-full transition-all {achievement.unlocked
									? 'bg-primary'
									: 'bg-muted-foreground/40'}"
								style="width: {progressPercent}%"
							></div>
						</div>
						<p class="mt-1 text-[10px] text-muted-foreground tabular-nums">
							{displayedCurrentValue} / {achievement.threshold}
						</p>
					</div>
				</div>
			{/each}
		</div>
	</Card.Content>
</Card.Root>

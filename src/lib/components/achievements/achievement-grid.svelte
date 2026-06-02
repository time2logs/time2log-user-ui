<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import * as m from '$lib/paraglide/messages.js';
	import { Award, Sparkles, Clock, Flame, Crown, Lock } from 'lucide-svelte';
	import type { AchievementStatus } from '$lib/achievementsUtils';

	let { achievements }: { achievements: AchievementStatus[] } = $props();

	const icons: Record<string, typeof Award> = { Sparkles, Clock, Flame, Crown };
	const labels: Record<string, () => string> = {
		ach_first_log: m.ach_first_log,
		ach_250_hours: m.ach_250_hours,
		ach_streak_15: m.ach_streak_15,
		ach_thousand_hours: m.ach_thousand_hours
	};
	const descs: Record<string, () => string> = {
		ach_first_log_desc: m.ach_first_log_desc,
		ach_250_hours_desc: m.ach_250_hours_desc,
		ach_streak_15_desc: m.ach_streak_15_desc,
		ach_thousand_hours_desc: m.ach_thousand_hours_desc
	};

	const unlockedCount = $derived(achievements.filter((a) => a.unlocked).length);
</script>

<Card.Root>
	<Card.Header class="pt-5 pb-2">
		<Card.Title class="flex items-center gap-2 text-base font-semibold">
			<Award class="h-4 w-4 text-primary" />
			{m.ach_section_badges()} · {m.ach_unlocked_count({
				unlocked: unlockedCount,
				total: achievements.length
			})}
		</Card.Title>
	</Card.Header>
	<Card.Content class="pb-5">
		<div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
			{#each achievements as a (a.id)}
				{@const Icon = icons[a.icon] ?? Award}
				{@const pct = Math.round(a.progress * 100)}
				{@const cur = Math.round(Math.min(a.current, a.threshold) * 10) / 10}
				<div
					class="relative flex flex-col items-center rounded-lg border p-3 text-center transition-all {a.unlocked
						? 'border-primary/40 bg-card shadow-sm ring-1 ring-primary/20'
						: 'border-border bg-muted/30 opacity-60 grayscale'}"
				>
					{#if !a.unlocked}<Lock
							class="absolute top-2 right-2 h-3 w-3 text-muted-foreground"
						/>{/if}
					<div
						class="mb-2 flex h-12 w-12 items-center justify-center rounded-full {a.unlocked
							? 'bg-primary/15 text-primary'
							: 'bg-muted text-muted-foreground'}"
					>
						<Icon class="h-6 w-6" />
					</div>
					<p class="text-sm font-semibold text-foreground">
						{labels[a.labelKey]?.() ?? a.labelKey}
					</p>
					<p class="mt-0.5 text-[11px] leading-tight text-muted-foreground">
						{descs[a.descriptionKey]?.() ?? a.descriptionKey}
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
						<p class="mt-1 text-[10px] text-muted-foreground tabular-nums">{cur} / {a.threshold}</p>
					</div>
				</div>
			{/each}
		</div>
	</Card.Content>
</Card.Root>

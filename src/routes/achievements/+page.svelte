<script lang="ts">
	import * as m from '$lib/paraglide/messages.js';
	import { Button } from '$lib/components/ui/button';
	import { ArrowLeft } from 'lucide-svelte';
	import AmbientGlow from '$lib/components/ambient-glow.svelte';
	import LevelHero from '$lib/components/achievements/level-hero.svelte';
	import TopLocations from '$lib/components/achievements/top-locations.svelte';
	import TopActivitiesPodium from '$lib/components/achievements/top-activities-podium.svelte';
	import SicknessOverview from '$lib/components/achievements/sickness-overview.svelte';
	import AchievementGrid from '$lib/components/achievements/achievement-grid.svelte';

	import { activityStore } from '$lib/activityStorage';
	import { absenceStore } from '$lib/absenceStorage';
	import { computeActivityBreakdown, computeTotalHours } from '$lib/statsUtils';
	import {
		computeAchievements,
		computeCurrentStreak,
		computeLevel,
		computeTopLocations,
		computeSickDays
	} from '$lib/achievementsUtils';
	import { today as getLocalToday, getLocalTimeZone } from '@internationalized/date';
	import type { CurriculumNodeSummary } from '$lib/types';

	type PageData = { curriculumNodeSummaries: CurriculumNodeSummary[] };
	let { data }: { data: PageData } = $props();

	const activities = $derived($activityStore);
	const absences = $derived($absenceStore);

	$effect(() => {
		activityStore.setCurriculumNodeSummaries(data.curriculumNodeSummaries);
		void activityStore.load();
	});
	$effect(() => {
		void absenceStore.load();
	});

	const todayIso = getLocalToday(getLocalTimeZone()).toString();
	const yearStart = `${todayIso.slice(0, 4)}-01-01`;

	const totalHours = $derived(computeTotalHours(activities));
	const level = $derived(computeLevel(totalHours));
	const currentStreak = $derived(computeCurrentStreak(activities, absences, todayIso));
	const topLocations = $derived(computeTopLocations(activities, 5));
	const topActivities = $derived(
		computeActivityBreakdown(activities, 10, m.ach_other()).filter((s) => s.name !== m.ach_other())
	);
	const sickThisYear = $derived(computeSickDays(absences, yearStart, todayIso));
	const sickAllTime = $derived(computeSickDays(absences, '2000-01-01', todayIso));
	const workdays = $derived(
		activities.length > 0 ? new Set(activities.map((a) => a.entry_date)).size : 0
	);
	const achievements = $derived(computeAchievements(activities, absences, todayIso));
</script>

<div class="relative flex min-h-screen flex-col bg-background text-foreground">
	<AmbientGlow />
	<main
		class="relative z-10 flex flex-1 flex-col items-center p-3 pb-16 sm:p-4 sm:pb-12 lg:p-8 lg:pb-16"
	>
		<div class="w-full max-w-4xl">
			<Button
				variant="ghost"
				href="/dashboard"
				class="mb-4 gap-2 self-start text-muted-foreground sm:mb-6"
			>
				<ArrowLeft class="h-4 w-4" />
				{m.ach_back_to_dashboard()}
			</Button>
			<h1 class="mb-4 text-2xl font-bold text-foreground sm:mb-8 sm:text-3xl">
				{m.achievements_title()}
			</h1>

			<div class="flex flex-col gap-4">
				<LevelHero {totalHours} {currentStreak} {level} />
				<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
					<TopLocations locations={topLocations} />
					<TopActivitiesPodium items={topActivities} />
				</div>
				<SicknessOverview {sickThisYear} {sickAllTime} {workdays} />
				<AchievementGrid {achievements} />
			</div>
		</div>
	</main>
</div>

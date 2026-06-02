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
	import { today as getTodayInTimeZone } from '@internationalized/date';
	import type { CurriculumNodeSummary } from '$lib/types';

	const SWISS_TIME_ZONE = 'Europe/Zurich';

	type PageData = { curriculumNodeSummaries: CurriculumNodeSummary[] };
	let { data }: { data: PageData } = $props();

	const activityRecords = $derived($activityStore);
	const absenceRecords = $derived($absenceStore);

	$effect(() => {
		activityStore.setCurriculumNodeSummaries(data.curriculumNodeSummaries);
		void activityStore.load();
	});
	$effect(() => {
		void absenceStore.load();
	});

	const todayIsoDate = getTodayInTimeZone(SWISS_TIME_ZONE).toString();
	const currentYearStartIsoDate = `${todayIsoDate.slice(0, 4)}-01-01`;

	const totalLoggedHours = $derived(computeTotalHours(activityRecords));
	const levelInfo = $derived(computeLevel(totalLoggedHours));
	const currentStreakDays = $derived(
		computeCurrentStreak(activityRecords, absenceRecords, todayIsoDate)
	);
	const topLocationStats = $derived(computeTopLocations(activityRecords, 5));
	const topActivityStats = $derived(
		computeActivityBreakdown(activityRecords, 10, m.achievement_other()).filter(
			(activityStat) => activityStat.name !== m.achievement_other()
		)
	);
	const sickDaysThisYear = $derived(
		computeSickDays(absenceRecords, currentYearStartIsoDate, todayIsoDate)
	);
	const sickDaysAllTime = $derived(computeSickDays(absenceRecords, '2000-01-01', todayIsoDate));
	const loggedWorkdayCount = $derived(
		activityRecords.length > 0
			? new Set(activityRecords.map((activity) => activity.entry_date)).size
			: 0
	);
	const achievementStatuses = $derived(
		computeAchievements(activityRecords, absenceRecords, todayIsoDate)
	);
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
				{m.achievement_back_to_dashboard()}
			</Button>
			<h1 class="mb-4 text-2xl font-bold text-foreground sm:mb-8 sm:text-3xl">
				{m.achievements_title()}
			</h1>

			<div class="flex flex-col gap-4">
				<LevelHero
					totalHours={totalLoggedHours}
					currentStreak={currentStreakDays}
					level={levelInfo}
				/>
				<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
					<TopLocations locations={topLocationStats} />
					<TopActivitiesPodium items={topActivityStats} />
				</div>
				<SicknessOverview
					sickThisYear={sickDaysThisYear}
					sickAllTime={sickDaysAllTime}
					workdays={loggedWorkdayCount}
				/>
				<AchievementGrid achievements={achievementStatuses} />
			</div>
		</div>
	</main>
</div>

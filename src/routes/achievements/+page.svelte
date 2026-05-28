<script lang="ts">
	import * as m from '$lib/paraglide/messages.js';
	import { Button } from '$lib/components/ui/button';
	import { ArrowLeft, Trophy } from 'lucide-svelte';
	import AmbientGlow from '$lib/components/ambient-glow.svelte';
	import LanguageSwitcher from '$lib/components/language-switcher.svelte';
	import LevelHero from '$lib/components/achievements/level-hero.svelte';
	import TopLocations from '$lib/components/achievements/top-locations.svelte';
	import TopActivitiesPodium from '$lib/components/achievements/top-activities-podium.svelte';
	import SicknessOverview from '$lib/components/achievements/sickness-overview.svelte';
	import AchievementGrid from '$lib/components/achievements/achievement-grid.svelte';

	import { activityStore } from '$lib/activityStorage';
	import { absenceStore } from '$lib/absenceStorage';
	import { computeActivityBreakdown, computeTotalHours, isoFromDate } from '$lib/statsUtils';
	import {
		computeAchievements,
		computeCurrentStreak,
		computeLevel,
		computeSickDays,
		computeSickDaysByMonth,
		computeTopLocations,
		computeWorkdaysSince
	} from '$lib/achievementsUtils';
	import type { CurriculumNodeSummary } from '$lib/types';

	type PageData = {
		curriculumNodeSummaries: CurriculumNodeSummary[];
	};

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

	const today = $derived(new Date());
	const currentYear = $derived(today.getFullYear());

	const totalHours = $derived(computeTotalHours(activities));
	const level = $derived(computeLevel(totalHours));
	const currentStreak = $derived(computeCurrentStreak(activities, absences, today));

	const topLocations = $derived(computeTopLocations(activities, 5, m.ach_other()));
	const topActivities = $derived(
		computeActivityBreakdown(activities, 10, m.ach_other()).filter((s) => s.name !== m.ach_other())
	);

	const sickThisYear = $derived(
		computeSickDays(absences, {
			from: `${currentYear}-01-01`,
			to: `${currentYear}-12-31`
		})
	);
	const sickLast12Months = $derived(
		(() => {
			// eslint-disable-next-line svelte/prefer-svelte-reactivity
			const from = new Date(today);
			from.setFullYear(from.getFullYear() - 1);
			return computeSickDays(absences, { from: isoFromDate(from), to: isoFromDate(today) });
		})()
	);
	const sickAllTime = $derived(computeSickDays(absences));
	const sickByMonth = $derived(computeSickDaysByMonth(absences, currentYear));

	const earliestActivityDate = $derived(
		activities.length > 0
			? activities.reduce(
					(min, a) => (a.entry_date < min ? a.entry_date : min),
					activities[0].entry_date
				)
			: null
	);
	const workdaysAllTime = $derived(
		earliestActivityDate ? computeWorkdaysSince(earliestActivityDate, today) : 0
	);

	const achievements = $derived(computeAchievements(activities, absences, today));
</script>

<div class="relative flex min-h-screen flex-col bg-background text-foreground">
	<AmbientGlow />

	<main class="relative z-10 flex-1 p-3 pb-16 sm:p-4 sm:pb-12 lg:p-8 lg:pb-16">
		<div class="mx-auto max-w-4xl">
			<div class="mb-4 flex items-center justify-between gap-2 sm:mb-6 sm:gap-4 lg:mb-8">
				<div class="flex min-w-0 items-center gap-2 sm:gap-3 lg:gap-4">
					<div
						class="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-amber-500 shadow-sm ring-1 ring-amber-500/20 sm:h-16 sm:w-16"
					>
						<Trophy class="h-5 w-5 sm:h-7 sm:w-7" />
					</div>
					<div class="min-w-0">
						<h1 class="truncate text-base font-bold text-foreground sm:text-xl lg:text-2xl">
							{m.achievements_title()}
						</h1>
						<p class="text-xs text-muted-foreground sm:text-sm lg:text-base">
							{m.achievements_subtitle()}
						</p>
					</div>
				</div>
				<div class="flex items-center gap-2">
					<div class="hidden sm:block">
						<LanguageSwitcher />
					</div>
					<Button variant="outline" size="sm" href="/dashboard">
						<ArrowLeft class="mr-2 h-4 w-4" />
						<span class="hidden sm:inline">{m.ach_back_to_dashboard()}</span>
					</Button>
				</div>
			</div>

			<div class="flex flex-col gap-4">
				<LevelHero {totalHours} {currentStreak} {level} />
				<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
					<TopLocations locations={topLocations} />
					<TopActivitiesPodium items={topActivities} />
				</div>
				<SicknessOverview
					{sickThisYear}
					{sickLast12Months}
					{sickAllTime}
					byMonth={sickByMonth}
					year={currentYear}
					{workdaysAllTime}
				/>
				<AchievementGrid {achievements} />
			</div>
		</div>
	</main>
</div>

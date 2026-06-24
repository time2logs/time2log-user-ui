<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { ConfirmDialog } from '$lib/components/ui/confirm-dialog';
	import { IconButton } from '$lib/components/ui/icon-button';
	import * as Sheet from '$lib/components/ui/sheet';
	import { Button } from '$lib/components/ui/button';
	import ActivityList from '$lib/components/activity-list.svelte';
	import ActivityFormDialog from '$lib/components/activity-form-dialog.svelte';
	import AbsenceFormDialog from '$lib/components/absence-form-dialog.svelte';
	import WorkdayCalendar from '$lib/components/workday-calendar.svelte';
	import * as m from '$lib/paraglide/messages.js';
	import LanguageSwitcher from '$lib/components/language-switcher.svelte';
	import { activityStore } from '$lib/activityStorage';
	import { absenceStore, isDateInAbsence } from '$lib/absenceStorage';
	import type {
		ActivityRecord,
		AbsenceRecord,
		CurriculumNode,
		CurriculumNodeSummary,
		TeamMember,
		Organization
	} from '$lib/types';
	import { resolve } from '$app/paths';
	import { invalidateAll } from '$app/navigation';
	import LogOut from '@lucide/svelte/icons/log-out';
	import Plus from '@lucide/svelte/icons/plus';
	import Menu from '@lucide/svelte/icons/menu';
	import Settings from '@lucide/svelte/icons/settings';
	import Calendar from '@lucide/svelte/icons/calendar';
	import Trophy from '@lucide/svelte/icons/trophy';
	import { DateFormatter, getLocalTimeZone, today, type DateValue } from '@internationalized/date';
	import { getDateLocale } from '$lib/dateLocale';
	import AmbientGlow from '$lib/components/ambient-glow.svelte';
	import StatsOverview from '$lib/components/stats-overview.svelte';
	import UnreportedDaysBanner from '$lib/components/unreported-days-banner.svelte';
	import DailyHoursProgress from '$lib/components/daily-hours-progress.svelte';

	const dateLocale = $derived(getDateLocale());
	type DashboardPageData = {
		profile: {
			first_name: string;
			last_name: string;
			avatar_url: string | null;
		} | null;
		teamMember: TeamMember | null;
		curriculumNodes: CurriculumNode[];
		curriculumNodeSummaries: CurriculumNodeSummary[];
		professionLabel: string | null;
		userLocations: string[];
		organization: Organization | null;
	};

	let { data }: { data: DashboardPageData } = $props();

	let isLoggingOut = $state(false);
	let logoutDialogOpen = $state(false);
	let activityDialogOpen = $state(false);
	let absenceDialogOpen = $state(false);
	let mobileMenuOpen = $state(false);
	let refreshKey = $state(0);
	let editingActivity = $state<ActivityRecord | null>(null);
	let editingAbsence = $state<AbsenceRecord | null>(null);
	const timeZone = getLocalTimeZone();

	function getDefaultSelectedDate(): DateValue {
		let date = today(timeZone);

		while ([0, 6].includes(date.toDate(timeZone).getDay())) {
			date = date.subtract({ days: 1 });
		}

		return date;
	}

	let selectedDate = $state<DateValue>(getDefaultSelectedDate());

	const activities = $derived($activityStore);

	let absences = $state<AbsenceRecord[]>([]);
	absenceStore.subscribe((data) => {
		absences = data;
	});

	$effect(() => {
		activityStore.setCurriculumNodeSummaries(data.curriculumNodeSummaries);
		void activityStore.load();
	});

	$effect(() => {
		absenceStore.load();
	});

	function isDateDisabled(date: DateValue) {
		const dayOfWeek = date.toDate(timeZone).getDay();
		const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
		const todayDate = today(timeZone);
		const isFuture = date.compare(todayDate) > 0;
		return isWeekend || isFuture;
	}

	const selectedDateIso = $derived(selectedDate.toString());
	const activityDates = $derived(new Set(activities.map((a) => a.entry_date)));

	const selectedDateLoggedHours = $derived(
		activities.filter((a) => a.entry_date === selectedDateIso).reduce((sum, a) => sum + a.hours, 0)
	);
	const loggedAbsenceTimeInDays = $derived(
		absences
			.filter(
				(absence) => selectedDateIso >= absence.start_date && selectedDateIso <= absence.end_date
			)
			.reduce((sum, absence) => sum + absence.day_fraction, 0)
	);

	const targetHours = $derived(data.organization?.target_hours ?? 8);
	const selectedDateLabel = $derived(
		new DateFormatter(dateLocale, {
			weekday: 'long',
			month: 'long',
			day: 'numeric',
			year: 'numeric'
		}).format(selectedDate.toDate(timeZone))
	);

	function handleLogout() {
		isLoggingOut = true;
		window.location.href = '/logout';
	}

	async function handleActivityAdded() {
		await invalidateAll();
		refreshKey++;
		editingActivity = null;
	}

	function handleAbsenceAdded() {
		refreshKey++;
		editingAbsence = null;
	}

	function handleEditActivity(activity: ActivityRecord) {
		editingActivity = activity;
		activityDialogOpen = true;
	}

	function handleEditAbsence(absence: AbsenceRecord) {
		editingAbsence = absence;
		absenceDialogOpen = true;
	}

	const initials = $derived(
		data.profile
			? `${data.profile.first_name?.[0] ?? ''}${data.profile.last_name?.[0] ?? ''}`.toUpperCase() ||
					'?'
			: '?'
	);

	const firstName = $derived(data.profile?.first_name ?? 'Guest');

	const fullName = $derived(
		data.profile ? `${data.profile.first_name} ${data.profile.last_name}` : 'Guest'
	);
</script>

<div class="relative flex min-h-screen flex-col overflow-hidden bg-background text-foreground">
	<!-- Subtle background glow -->
	<AmbientGlow />

	<main class="relative z-10 flex-1 p-3 sm:p-4 lg:p-8">
		<div class="mx-auto max-w-4xl">
			<div class="mb-4 flex items-center justify-between gap-2 sm:mb-6 sm:gap-4 lg:mb-8">
				<div class="flex min-w-0 items-center gap-2 sm:gap-3 lg:gap-4">
					{#if data.profile?.avatar_url}
						<div
							class="h-12 w-12 flex-shrink-0 overflow-hidden rounded-full border-2 border-border shadow-sm sm:h-16 sm:w-16"
						>
							<img
								src={data.profile.avatar_url}
								alt={fullName}
								class="h-full w-full object-cover"
							/>
						</div>
					{:else}
						<div
							class="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-lg font-semibold text-primary shadow-sm ring-1 ring-primary/20 sm:h-16 sm:w-16 sm:text-xl"
						>
							{initials}
						</div>
					{/if}
					<div class="min-w-0">
						<h1 class="truncate text-base font-bold text-foreground sm:text-xl lg:text-2xl">
							{m.welcome({ name: firstName })}
						</h1>
						<p class="text-xs text-muted-foreground sm:text-sm lg:text-base">
							{m.dashboard_subtitle()}
						</p>
						{#if data.professionLabel || data.organization?.name}
							<p class="mt-0.5 truncate text-xs text-muted-foreground/70 sm:text-sm">
								{[data.professionLabel, data.organization?.name].filter(Boolean).join(' · ')}
							</p>
						{/if}
					</div>
				</div>
				<div class="hidden items-center gap-2 sm:flex">
					<LanguageSwitcher />

					<IconButton
						icon={Calendar}
						href="/absences"
						label={m.absences_title()}
						iconClass="h-4 w-4"
						title={m.absences_title()}
					/>
					<IconButton
						icon={Trophy}
						href="/achievements"
						label={m.achievements_title()}
						iconClass="h-4 w-4"
						title={m.achievements_title()}
					/>
					<IconButton
						icon={Settings}
						href="/settings"
						label={m.settings_title()}
						iconClass="h-4 w-4"
						data-sveltekit-reload
					/>
					<Button
						variant="ghost"
						onclick={() => (logoutDialogOpen = true)}
						size="icon"
						aria-label={m.logout()}
						class="text-muted-foreground hover:text-destructive"
					>
						<LogOut class="h-4 w-4" />
					</Button>
				</div>
				<div class="flex items-center gap-1 sm:hidden">
					<IconButton
						icon={Calendar}
						size="icon-sm"
						href="/absences"
						label={m.absences_title()}
						iconClass="h-4 w-4"
					/>
					<IconButton
						icon={Trophy}
						size="icon-sm"
						href="/achievements"
						label={m.achievements_title()}
						iconClass="h-4 w-4"
					/>
					<IconButton
						icon={Settings}
						size="icon-sm"
						href="/settings"
						label={m.settings_title()}
						iconClass="h-4 w-4"
						data-sveltekit-reload
					/>
					<Button
						variant="outline"
						onclick={() => (mobileMenuOpen = true)}
						aria-label={m.open_menu()}
						class="h-9 w-9 shrink-0 rounded-full p-0"
					>
						<Menu class="h-4 w-4" />
					</Button>
				</div>
			</div>

			<UnreportedDaysBanner {activities} {absences} />

			<div class="mt-4 grid gap-4 lg:grid-cols-2 lg:items-stretch xl:gap-6">
				<div class="order-2 flex h-full w-full lg:order-1">
					<WorkdayCalendar
						bind:value={selectedDate}
						{isDateDisabled}
						locale={dateLocale}
						{activityDates}
						isAbsenceDate={(dateStr) => {
							const matching = absences.find((a) => isDateInAbsence(dateStr, a));
							return matching?.absence_type_id ?? null;
						}}
					/>
				</div>

				<Card.Root class="order-1 h-full flex-1 gap-0 lg:order-2">
					<Card.Header
						class="flex flex-col gap-1 pt-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:pt-6"
					>
						<div>
							<Card.Title class="text-base font-bold text-foreground sm:text-lg"
								>{m.activity_log_title()}</Card.Title
							>
							<Card.Description class="text-xs text-muted-foreground sm:text-sm">
								{m.activity_log_showing_for({ date: selectedDateLabel })}
							</Card.Description>
						</div>
						<div class="flex flex-col gap-1 sm:gap-2">
							<Button
								onclick={() => (activityDialogOpen = true)}
								class="hidden sm:inline-flex"
								size="lg"
							>
								<Plus class="mr-2 h-5 w-5" />
								{m.log_activity_button()}
							</Button>
						</div>
					</Card.Header>
					<DailyHoursProgress
						loggedHours={selectedDateLoggedHours}
						{targetHours}
						{loggedAbsenceTimeInDays}
					/>
					<Card.Content class="flex flex-1 flex-col p-0">
						<ActivityList
							onRefresh={handleActivityAdded}
							onAbsenceRefresh={handleAbsenceAdded}
							selectedDate={selectedDateIso}
							existingAbsences={absences}
							onEdit={handleEditActivity}
							onEditAbsence={handleEditAbsence}
						/>
					</Card.Content>
				</Card.Root>
			</div>

			<div class="mt-6 flex items-center justify-end">
				<Button variant="outline" size="sm" href="/achievements">
					<Trophy class="mr-2 h-4 w-4" />
					{m.achievements_view_full()}
				</Button>
			</div>

			<StatsOverview {activities} />

			{#if refreshKey >= 0}
				<ActivityFormDialog
					userLocations={data.userLocations}
					bind:open={activityDialogOpen}
					curriculumNodes={data.curriculumNodes}
					teamMember={data.teamMember}
					onActivityAdded={handleActivityAdded}
					selectedDate={selectedDateIso}
					activityToEdit={editingActivity}
					existingActivities={activities}
					existingAbsences={absences}
				/>
				<AbsenceFormDialog
					bind:open={absenceDialogOpen}
					teamMember={data.teamMember}
					onAbsenceAdded={handleAbsenceAdded}
					selectedDate={selectedDateIso}
					absenceToEdit={editingAbsence}
					existingActivities={activities}
					existingAbsences={absences}
				/>
			{/if}
		</div>
	</main>

	<!-- Mobile FAB -->
	<div class="fixed right-6 bottom-6 z-50 flex gap-3 sm:hidden">
		<Button
			onclick={() => (activityDialogOpen = true)}
			class="h-14 w-14 rounded-full p-0 shadow-lg"
		>
			<Plus class="h-6 w-6" />
		</Button>
	</div>
</div>

<ConfirmDialog
	bind:open={logoutDialogOpen}
	title={m.logout_confirm_title()}
	description={m.logout_confirm_description()}
	confirmLabel={m.logout()}
	cancelLabel={m.cancel()}
	variant="destructive"
	loading={isLoggingOut}
	onConfirm={handleLogout}
/>

<Sheet.Root bind:open={mobileMenuOpen}>
	<Sheet.Content
		side="right"
		class="flex h-full w-full flex-col bg-background sm:w-3/4 sm:max-w-sm"
	>
		<!-- User Info Header -->
		<div class="flex items-center gap-3 border-b border-border p-5">
			{#if data.profile?.avatar_url}
				<div
					class="h-12 w-12 flex-shrink-0 overflow-hidden rounded-full border-2 border-border shadow-sm"
				>
					<img src={data.profile.avatar_url} alt={fullName} class="h-full w-full object-cover" />
				</div>
			{:else}
				<div
					class="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-lg font-semibold text-primary ring-1 ring-primary/20"
				>
					{initials}
				</div>
			{/if}
			<div class="min-w-0">
				<p class="truncate text-base font-semibold text-foreground">{fullName}</p>
				<p class="text-xs text-muted-foreground">{m.welcome_back()}</p>
			</div>
		</div>

		<!-- Navigation Links -->
		<div class="flex flex-col gap-1 p-3">
			<a
				href="/absences"
				onclick={() => (mobileMenuOpen = false)}
				class="flex items-center gap-3 rounded-lg px-3 py-3 text-foreground transition-colors hover:bg-muted"
			>
				<div class="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
					<Calendar class="h-4 w-4" />
				</div>
				<span class="text-sm font-medium">{m.absences_title()}</span>
			</a>
			<a
				href="/achievements"
				onclick={() => (mobileMenuOpen = false)}
				class="flex items-center gap-3 rounded-lg px-3 py-3 text-foreground transition-colors hover:bg-muted"
			>
				<div class="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
					<Trophy class="h-4 w-4" />
				</div>
				<span class="text-sm font-medium">{m.achievements_title()}</span>
			</a>
			<a
				href={resolve('/settings')}
				data-sveltekit-reload
				onclick={() => (mobileMenuOpen = false)}
				class="flex items-center gap-3 rounded-lg px-3 py-3 text-foreground transition-colors hover:bg-muted"
			>
				<div class="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
					<Settings class="h-4 w-4" />
				</div>
				<span class="text-sm font-medium">{m.settings_title()}</span>
			</a>
		</div>

		<!-- Language Switcher -->
		<div class="border-t border-border px-4 py-3">
			<p class="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">Sprache</p>
			<LanguageSwitcher />
		</div>

		<!-- Logout -->
		<div class="mt-auto border-t border-border p-4">
			<Button
				variant="outline"
				onclick={() => {
					mobileMenuOpen = false;
					logoutDialogOpen = true;
				}}
				class="w-full justify-start gap-3 border-destructive/30 text-destructive hover:bg-destructive/10"
			>
				<LogOut class="h-4 w-4" />
				{m.logout()}
			</Button>
		</div>
	</Sheet.Content>
</Sheet.Root>

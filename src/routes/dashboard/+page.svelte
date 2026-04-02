<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import * as AlertDialog from '$lib/components/ui/alert-dialog';
	import * as Sheet from '$lib/components/ui/sheet';
	import { Button } from '$lib/components/ui/button';
	import { Separator } from '$lib/components/ui/separator';
	import ActivityList from '$lib/components/activity-list.svelte';
	import ActivityFormDialog from '$lib/components/activity-form-dialog.svelte';
	import AbsenceFormDialog from '$lib/components/absence-form-dialog.svelte';
	import WorkdayCalendar from '$lib/components/workday-calendar.svelte';
	import * as m from '$lib/paraglide/messages.js';
	import LanguageSwitcher from '$lib/components/language-switcher.svelte';
	import { activityStore } from '$lib/activityStorage';
	import { absenceStore } from '$lib/absenceStorage';
	import type { ActivityRecord, AbsenceRecord } from '$lib/types';
	import { resolve } from '$app/paths';
	import { LogOut, Loader2, Plus, Menu, Settings, AlertCircle } from 'lucide-svelte';
	import { DateFormatter, getLocalTimeZone, today, type DateValue } from '@internationalized/date';
	import { getDateLocale } from '$lib/dateLocale';
	import AmbientGlow from '$lib/components/ambient-glow.svelte';

	const dateLocale = $derived(getDateLocale());

	let { data } = $props();

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
		activityStore.load();
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
	const selectedDateHasAbsence = $derived(absences.some((a) => a.entry_date === selectedDateIso));
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

	function handleActivityAdded() {
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

	<main class="relative z-10 flex-1 p-4 sm:p-8">
		<div class="mx-auto max-w-4xl">
			<div class="mb-8 flex items-center justify-between gap-4">
				<div class="flex items-center gap-3 sm:gap-4">
					{#if data.profile?.avatar_url}
						<div class="h-16 w-16 overflow-hidden rounded-full border-2 border-border shadow-sm">
							<img
								src={data.profile.avatar_url}
								alt={fullName}
								class="h-full w-full object-cover"
							/>
						</div>
					{:else}
						<div
							class="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-xl font-semibold text-primary shadow-sm ring-1 ring-primary/20"
						>
							{initials}
						</div>
					{/if}
					<div class="min-w-0">
						<h1 class="truncate text-xl font-bold text-foreground sm:text-2xl">
							{m.welcome({ name: firstName })}
						</h1>
						<p class="text-sm text-muted-foreground sm:text-base">
							{m.dashboard_subtitle()}
						</p>
					</div>
				</div>
				<div class="hidden items-center gap-2 sm:flex">
					<LanguageSwitcher />
					<a
						href={resolve('/settings')}
						data-sveltekit-reload
						aria-label={m.settings_title()}
						class="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
					>
						<Settings class="h-5 w-5" />
					</a>
					<Button
						variant="ghost"
						onclick={() => (logoutDialogOpen = true)}
						size="icon"
						aria-label={m.logout()}
						class="text-muted-foreground hover:text-destructive"
					>
						<LogOut class="h-5 w-5" />
					</Button>
				</div>
				<Button
					variant="outline"
					onclick={() => (mobileMenuOpen = true)}
					aria-label={m.open_menu()}
					class="h-10 w-10 shrink-0 rounded-full p-0 sm:hidden"
				>
					<Menu class="h-5 w-5" />
				</Button>
			</div>

			<div class="mt-4 grid gap-6 xl:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] xl:items-start">
				<WorkdayCalendar
					bind:value={selectedDate}
					{isDateDisabled}
					locale={dateLocale}
					{activityDates}
				/>
				<Card.Root>
					<Card.Header class="flex flex-row items-center justify-between gap-4">
						<div>
							<Card.Title class="mt-4 text-lg font-bold text-foreground"
								>{m.activity_log_title()}</Card.Title
							>
							<Card.Description class="mb-2 text-sm text-muted-foreground">
								{m.activity_log_showing_for({ date: selectedDateLabel })}
							</Card.Description>
						</div>
						<div class="flex gap-2">
							<Button
								onclick={() => (absenceDialogOpen = true)}
								disabled={selectedDateHasAbsence}
								variant="outline"
								class="hidden border-orange-300 bg-orange-50 text-orange-700 hover:bg-orange-100 disabled:cursor-not-allowed disabled:opacity-50 sm:inline-flex"
								size="lg"
							>
								<AlertCircle class="mr-2 h-5 w-5" />
								{m.log_absence_button()}
							</Button>
							<Button
								onclick={() => (activityDialogOpen = true)}
								disabled={selectedDateHasAbsence}
								class="hidden bg-gradient-to-r from-orange-400 to-rose-400 text-white hover:from-orange-500 hover:to-rose-500 disabled:cursor-not-allowed disabled:opacity-50 sm:inline-flex"
								size="lg"
							>
								<Plus class="mr-2 h-5 w-5" />
								{m.log_activity_button()}
							</Button>
						</div>
					</Card.Header>
					<Card.Content class="p-0">
						<ActivityList
							onRefresh={handleActivityAdded}
							onAbsenceRefresh={handleAbsenceAdded}
							selectedDate={selectedDateIso}
							onEdit={handleEditActivity}
							onEditAbsence={handleEditAbsence}
						/>
					</Card.Content>
				</Card.Root>
			</div>

			{#if refreshKey >= 0}
				<ActivityFormDialog
					bind:open={activityDialogOpen}
					curriculumNodes={data.curriculumNodes}
					teamMember={data.teamMember}
					onActivityAdded={handleActivityAdded}
					selectedDate={selectedDateIso}
					activityToEdit={editingActivity}
					existingActivities={activities}
				/>
				<AbsenceFormDialog
					bind:open={absenceDialogOpen}
					teamMember={data.teamMember}
					onAbsenceAdded={handleAbsenceAdded}
					selectedDate={selectedDateIso}
					absenceToEdit={editingAbsence}
				/>
			{/if}
		</div>
	</main>

	<!-- Mobile FAB -->
	<div class="fixed right-6 bottom-6 z-50 flex gap-3 sm:hidden">
		<Button
			onclick={() => (absenceDialogOpen = true)}
			disabled={selectedDateHasAbsence}
			variant="outline"
			class="h-14 w-14 rounded-full border-orange-300 bg-orange-50 p-0 text-orange-700 shadow-lg hover:bg-orange-100 disabled:cursor-not-allowed disabled:opacity-50"
		>
			<AlertCircle class="h-6 w-6" />
		</Button>
		<Button
			onclick={() => (activityDialogOpen = true)}
			disabled={selectedDateHasAbsence}
			class="h-14 w-14 rounded-full bg-gradient-to-r from-orange-400 to-rose-400 p-0 text-white shadow-lg hover:from-orange-500 hover:to-rose-500 disabled:cursor-not-allowed disabled:opacity-50"
		>
			<Plus class="h-6 w-6" />
		</Button>
	</div>
</div>

<AlertDialog.Root bind:open={logoutDialogOpen}>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>{m.logout_confirm_title()}</AlertDialog.Title>
			<AlertDialog.Description>{m.logout_confirm_description()}</AlertDialog.Description>
		</AlertDialog.Header>
		<AlertDialog.Footer>
			<AlertDialog.Cancel>{m.cancel()}</AlertDialog.Cancel>
			<AlertDialog.Action
				onclick={handleLogout}
				disabled={isLoggingOut}
				class="bg-red-500 hover:bg-red-600"
			>
				{#if isLoggingOut}
					<Loader2 class="mr-2 h-4 w-4 animate-spin" /> {m.logging_out()}
				{:else}
					{m.logout()}
				{/if}
			</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>

<Sheet.Root bind:open={mobileMenuOpen}>
	<Sheet.Content
		side="right"
		class="flex h-full w-full flex-col bg-background sm:w-3/4 sm:max-w-sm"
	>
		<Sheet.Header>
			<Sheet.Title>{m.welcome_back()}</Sheet.Title>
			<Sheet.Description class="text-lg font-semibold text-foreground">{fullName}</Sheet.Description
			>
		</Sheet.Header>
		<Separator />
		<div class="flex flex-col gap-3 p-4">
			<LanguageSwitcher />
			<a
				href={resolve('/settings')}
				class="flex items-center gap-2 rounded-md px-3 py-2 text-foreground transition-colors hover:bg-muted"
			>
				<Settings class="h-4 w-4" />
				{m.settings_title()}
			</a>
		</div>
		<div class="mt-auto p-4">
			<Separator class="mb-4" />
			<Button
				variant="destructive"
				onclick={() => {
					mobileMenuOpen = false;
					logoutDialogOpen = true;
				}}
				class="w-full justify-start gap-2"
			>
				<LogOut class="h-4 w-4" />
				{m.logout()}
			</Button>
		</div>
	</Sheet.Content>
</Sheet.Root>

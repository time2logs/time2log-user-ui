<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import * as AlertDialog from '$lib/components/ui/alert-dialog';
	import * as Sheet from '$lib/components/ui/sheet';
	import { Button } from '$lib/components/ui/button';
	import { Separator } from '$lib/components/ui/separator';
	import ActivityList from '$lib/components/activity-list.svelte';
	import ActivityFormDialog from '$lib/components/activity-form-dialog.svelte';
	import WorkdayCalendar from '$lib/components/workday-calendar.svelte';
	import * as m from '$lib/paraglide/messages.js';
	import GradientBackground from '$lib/components/gradient-background.svelte';
	import GlassCard from '$lib/components/glass-card.svelte';
	import LanguageSwitcher from '$lib/components/language-switcher.svelte';
	import { activityStore } from '$lib/activityStorage';
	import type { ActivityRecord } from '$lib/types';
	import { resolve } from '$app/paths';
	import { LogOut, Loader2, Plus, Menu, Settings } from 'lucide-svelte';
	import { DateFormatter, getLocalTimeZone, today, type DateValue } from '@internationalized/date';
	import { getDateLocale } from '$lib/dateLocale';

	const dateLocale = $derived(getDateLocale());

	let { data } = $props();

	let isLoggingOut = $state(false);
	let logoutDialogOpen = $state(false);
	let activityDialogOpen = $state(false);
	let mobileMenuOpen = $state(false);
	let refreshKey = $state(0);
	let editingActivity = $state<ActivityRecord | null>(null);
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

	$effect(() => {
		activityStore.load();
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

	function handleEditActivity(activity: ActivityRecord) {
		editingActivity = activity;
		activityDialogOpen = true;
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

<GradientBackground>
	<main class="flex-1 p-4 sm:p-8">
		<div class="mx-auto max-w-4xl">
			<div class="mb-8 flex items-center justify-between gap-4">
				<div class="flex items-center gap-3 sm:gap-4">
					{#if data.profile?.avatar_url}
						<div
							class="h-16 w-16 overflow-hidden rounded-full border-2 border-white shadow-lg dark:border-slate-600"
						>
							<img
								src={data.profile.avatar_url}
								alt={fullName}
								class="h-full w-full object-cover"
							/>
						</div>
					{:else}
						<div
							class="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-rose-400 text-xl font-semibold text-white shadow-lg dark:shadow-orange-900/30"
						>
							{initials}
						</div>
					{/if}
					<div class="min-w-0">
						<h1 class="truncate text-xl font-bold text-stone-800 sm:text-2xl dark:text-slate-100">
							{m.welcome({ name: firstName })}
						</h1>
						<p class="text-sm text-stone-600 sm:text-base dark:text-slate-400">
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
						class="inline-flex h-9 w-9 items-center justify-center rounded-md text-stone-600 transition-colors hover:bg-accent hover:text-stone-800 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-white"
					>
						<Settings class="h-5 w-5" />
					</a>
					<Button
						variant="ghost"
						onclick={() => (logoutDialogOpen = true)}
						size="icon"
						aria-label={m.logout()}
						class="text-stone-600 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400"
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
				<GlassCard>
					<Card.Header class="flex flex-row items-center justify-between gap-4">
						<div>
							<Card.Title class="mt-4 text-lg font-bold text-stone-800 dark:text-slate-100"
								>{m.activity_log_title()}</Card.Title
							>
							<Card.Description class="mb-2 text-sm text-stone-600 dark:text-slate-400">
								{m.activity_log_showing_for({ date: selectedDateLabel })}
							</Card.Description>
						</div>
						<Button
							onclick={() => (activityDialogOpen = true)}
							class="hidden bg-gradient-to-r from-orange-400 to-rose-400 text-white hover:from-orange-500 hover:to-rose-500 sm:inline-flex"
							size="lg"
						>
							<Plus class="mr-2 h-5 w-5" />
							{m.log_activity_button()}
						</Button>
					</Card.Header>
					<Card.Content class="p-0">
						<ActivityList
							onRefresh={handleActivityAdded}
							selectedDate={selectedDateIso}
							onEdit={handleEditActivity}
						/>
					</Card.Content>
				</GlassCard>
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
			{/if}
		</div>
	</main>

	<!-- Mobile FAB -->
	<Button
		onclick={() => (activityDialogOpen = true)}
		class="fixed right-6 bottom-6 z-50 h-14 w-14 rounded-full bg-gradient-to-r from-orange-400 to-rose-400 p-0 text-white shadow-lg hover:from-orange-500 hover:to-rose-500 sm:hidden"
	>
		<Plus class="h-6 w-6" />
	</Button>
</GradientBackground>

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
		class="flex h-full w-full flex-col bg-gradient-to-br from-orange-50 via-rose-50 to-white sm:w-3/4 sm:max-w-sm dark:from-slate-900 dark:via-slate-800 dark:to-slate-900"
	>
		<Sheet.Header>
			<Sheet.Title>{m.welcome_back()}</Sheet.Title>
			<Sheet.Description class="text-lg font-semibold text-stone-800 dark:text-slate-100"
				>{fullName}</Sheet.Description
			>
		</Sheet.Header>
		<Separator />
		<div class="flex flex-col gap-3 p-4">
			<LanguageSwitcher />
			<a
				href={resolve('/settings')}
				class="flex items-center gap-2 rounded-md px-3 py-2 text-stone-700 transition-colors hover:bg-stone-100 dark:text-slate-200 dark:hover:bg-slate-700"
			>
				<Settings class="h-4 w-4" />
				{m.settings_title()}
			</a>
		</div>
		<div class="mt-auto p-4">
			<Separator class="mb-4" />
			<Button
				variant="outline"
				onclick={() => {
					mobileMenuOpen = false;
					logoutDialogOpen = true;
				}}
				class="w-full justify-start gap-2 border-red-200 bg-red-100 text-red-700 hover:bg-red-200 dark:border-red-900 dark:bg-red-950 dark:text-red-400 dark:hover:bg-red-900"
			>
				<LogOut class="h-4 w-4" />
				{m.logout()}
			</Button>
		</div>
	</Sheet.Content>
</Sheet.Root>

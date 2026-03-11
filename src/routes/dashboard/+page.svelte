<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import * as AlertDialog from '$lib/components/ui/alert-dialog';
	import { Button } from '$lib/components/ui/button';
	import ActivityList from '$lib/components/activity-list.svelte';
	import ActivityFormDialog from '$lib/components/activity-form-dialog.svelte';
	import WorkdayCalendar from '$lib/components/workday-calendar.svelte';
	import * as m from '$lib/paraglide/messages.js';
	import GradientBackground from '$lib/components/gradient-background.svelte';
	import GlassCard from '$lib/components/glass-card.svelte';
	import LanguageSwitcher from '$lib/components/language-switcher.svelte';
	import { logout } from '$lib/api';
	import { LogOut, Loader2, Plus } from 'lucide-svelte';
	import { DateFormatter, getLocalTimeZone, today, type DateValue } from '@internationalized/date';

	let { data } = $props();

	let isLoggingOut = $state(false);
	let logoutDialogOpen = $state(false);
	let activityDialogOpen = $state(false);
	let refreshKey = $state(0);
	const timeZone = getLocalTimeZone();

	function getDefaultSelectedDate(): DateValue {
		let date = today(timeZone);

		while ([0, 6].includes(date.toDate(timeZone).getDay())) {
			date = date.subtract({ days: 1 });
		}

		return date;
	}

	let selectedDate = $state<DateValue>(getDefaultSelectedDate());

	function isDateDisabled(date: DateValue) {
		const dayOfWeek = date.toDate(timeZone).getDay();
		const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
		const todayDate = today(timeZone);
		const isFuture = date.compare(todayDate) > 0;
		return isWeekend || isFuture;
	}

	const selectedDateIso = $derived(selectedDate.toString());
	const selectedDateLabel = $derived(
		new DateFormatter('en-US', {
			weekday: 'long',
			month: 'long',
			day: 'numeric',
			year: 'numeric'
		}).format(selectedDate.toDate(timeZone))
	);

	async function handleLogout() {
		isLoggingOut = true;
		try {
			await logout();
		} catch (error) {
			console.error('Logout failed:', error);
			isLoggingOut = false;
		}
	}

	function handleActivityAdded() {
		refreshKey++;
	}

	const initials = $derived(
		data.profile ? `${data.profile.first_name[0]}${data.profile.last_name[0]}`.toUpperCase() : '?'
	);

	const fullName = $derived(
		data.profile ? `${data.profile.first_name} ${data.profile.last_name}` : 'Guest'
	);
</script>

<GradientBackground>
	<main class="flex-1 p-8">
		<div class="mx-auto max-w-4xl">
			<div class="mb-8 flex items-start justify-between gap-4">
				<div class="flex items-center gap-4">
					{#if data.profile?.avatar_url}
						<div class="h-16 w-16 overflow-hidden rounded-full border-2 border-white shadow-lg">
							<img
								src={data.profile.avatar_url}
								alt={fullName}
								class="h-full w-full object-cover"
							/>
						</div>
					{:else}
						<div
							class="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-rose-400 text-xl font-semibold text-white shadow-lg"
						>
							{initials}
						</div>
					{/if}
					<div>
						<h1 class="text-2xl font-bold text-stone-800">{m.welcome({ name: fullName })}</h1>
						<p class="text-stone-600">{m.dashboard_subtitle()}</p>
					</div>
				</div>
				<div class="flex items-center gap-2">
					<LanguageSwitcher />
					<Button
						variant="outline"
						onclick={() => (logoutDialogOpen = true)}
						class="h-10 w-10 rounded-full p-0"
					>
						<LogOut class="h-4 w-4" />
					</Button>
				</div>
			</div>

			<div class="mt-4 grid gap-6 xl:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] xl:items-start">
				<GlassCard>
					<Card.Header class="flex items-center justify-center">
						<Card.Title class="mt-4 text-lg font-bold text-stone-800">Calendar</Card.Title>
					</Card.Header>
					<Card.Content class="mb-2 flex items-center justify-center">
						<WorkdayCalendar bind:value={selectedDate} {isDateDisabled} locale="en-GB" />
					</Card.Content>
				</GlassCard>

				<GlassCard>
					<Card.Header class="flex flex-row items-center justify-between gap-4">
						<div>
							<Card.Title class="mt-4 text-lg font-bold text-stone-800"
								>{m.activity_log_title()}</Card.Title
							>
							<Card.Description class="mb-2 text-sm text-stone-600">
								Showing activities for {selectedDateLabel}
							</Card.Description>
						</div>
						<Button
							onclick={() => (activityDialogOpen = true)}
							class="bg-gradient-to-r from-orange-400 to-rose-400 text-white hover:from-orange-500 hover:to-rose-500"
							size="lg"
						>
							<Plus class="mr-2 h-5 w-5" />
							{m.log_activity_button()}
						</Button>
					</Card.Header>
					<Card.Content class="p-0">
						<ActivityList onRefresh={handleActivityAdded} selectedDate={selectedDateIso} />
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
				/>
			{/if}
		</div>
	</main>
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

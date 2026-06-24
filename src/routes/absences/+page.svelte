<script lang="ts">
	import { onMount } from 'svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import AlertCircle from '@lucide/svelte/icons/circle-alert';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import Edit2 from '@lucide/svelte/icons/pencil';
	import Lock from '@lucide/svelte/icons/lock';
	import Plus from '@lucide/svelte/icons/plus';
	import * as m from '$lib/paraglide/messages.js';
	import { absenceStore } from '$lib/absenceStorage';
	import type { AbsenceRecord } from '$lib/types';
	import AbsenceFormDialog from '$lib/components/absence-form-dialog.svelte';
	import { resolve } from '$app/paths';
	import { getDateLocale } from '$lib/dateLocale';
	import { rrulestr } from 'rrule';
	import AbsenceChart from '$lib/components/absence-chart.svelte';
	import { getAbsenceTypeLabel } from '$lib/absence-types';
	import { Spinner } from '$lib/components/ui/spinner';
	import { Badge } from '$lib/components/ui/badge';
	import { EmptyState } from '$lib/components/ui/empty-state';
	import { isAbsenceWithinEditWindow, EDIT_WINDOW_DAYS } from '$lib/utils';
	import { byweekdayToIndex, getRruleUntil } from '$lib/rruleUtils';

	const dateLocale = $derived(getDateLocale());

	let { data } = $props();
	const absences = $derived($absenceStore);
	let isLoading = $state(true);
	let formDialogOpen = $state(false);
	let editingAbsence = $state<AbsenceRecord | null>(null);
	let showPast = $state(false);

	const todayStr = new Date().toISOString().split('T')[0];

	function isUpcoming(absence: AbsenceRecord): boolean {
		if (absence.end_date >= todayStr) return true;
		// Open-ended recurring absences (no UNTIL) are always upcoming
		return absence.is_recurring && absence.rrule ? !absence.rrule.includes('UNTIL=') : false;
	}

	const upcomingAbsences = $derived(
		absences.filter(isUpcoming).sort((a, b) => a.start_date.localeCompare(b.start_date))
	);

	const pastAbsences = $derived(
		absences.filter((a) => !isUpcoming(a)).sort((a, b) => b.start_date.localeCompare(a.start_date))
	);

	onMount(async () => {
		try {
			await absenceStore.load();
		} finally {
			isLoading = false;
		}
	});

	function handleEditAbsence(absence: AbsenceRecord) {
		editingAbsence = absence;
		formDialogOpen = true;
	}

	function handleAbsenceAdded() {
		editingAbsence = null;
	}

	function formatDateRange(startDate: string, endDate: string): string {
		const start = new Date(`${startDate}T12:00:00`);
		const end = new Date(`${endDate}T12:00:00`);

		const formatter = new Intl.DateTimeFormat(dateLocale, {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		});

		if (startDate === endDate) {
			return formatter.format(start);
		}
		return `${formatter.format(start)} - ${formatter.format(end)}`;
	}

	function getWeekdayName(dayNum: number): string {
		// Jan 7 2024 is Sunday (dayNum 0), Jan 8 is Monday (1), etc.
		const date = new Date(2024, 0, 7 + dayNum);
		return date.toLocaleDateString(dateLocale, { weekday: 'long' });
	}

	function getRecurrenceDescription(absence: AbsenceRecord): string {
		if (!absence.is_recurring || !absence.rrule) {
			return '';
		}

		try {
			const rule = rrulestr(absence.rrule);
			const options = rule.origOptions || {};

			let desc = m.recurrence_prefix() + ' ';
			const freq = options.freq;
			const byweekdayRaw = options.byweekday;
			const weekdayArray =
				byweekdayRaw == null ? [] : Array.isArray(byweekdayRaw) ? byweekdayRaw : [byweekdayRaw];

			if (freq === 2) {
				// WEEKLY
				if (weekdayArray.length > 0) {
					const days = weekdayArray
						.map((d) => {
							const dayNum = byweekdayToIndex(d);
							if (dayNum == null) return '';
							return getWeekdayName(dayNum);
						})
						.filter(Boolean)
						.join(', ');
					desc += days;
				} else {
					desc += m.recurrence_week();
				}
			} else if (freq === 1) {
				// DAILY
				desc += m.recurrence_day();
			}

			if (options.until) {
				const rawUntil = getRruleUntil(absence.rrule);
				if (rawUntil) {
					const untilStr = new Intl.DateTimeFormat(dateLocale, {
						month: 'short',
						day: 'numeric',
						year: 'numeric'
					}).format(new Date(`${rawUntil}T12:00:00`));
					desc += ` ${m.recurrence_until_prefix()} ${untilStr}`;
				}
			}

			return desc;
		} catch (e) {
			console.error('Failed to parse rrule:', e);
			return '';
		}
	}
</script>

{#snippet absenceCard(absence: AbsenceRecord)}
	<Card.Root>
		<Card.Content>
			<div class="flex flex-col py-4 sm:flex-row sm:items-start sm:justify-between">
				<div class="min-w-0 flex-1">
					<div class="flex flex-wrap items-center gap-2">
						<h3 class="text-base font-semibold text-foreground sm:text-lg">
							{getAbsenceTypeLabel(absence.absence_type_id)}
						</h3>
						<Badge variant="warning">
							{absence.day_fraction}
							{m.absence_day_fraction_short()}
						</Badge>
						{#if absence.is_recurring}
							<Badge variant="secondary">{m.recurring_label()}</Badge>
						{/if}
					</div>
					<p class="mt-2 text-sm text-muted-foreground">
						{formatDateRange(absence.start_date, absence.end_date)}
					</p>
					{#if absence.is_recurring}
						<p class="mt-1 text-xs text-muted-foreground">
							{getRecurrenceDescription(absence)}
						</p>
					{/if}
					{#if absence.notes}
						<p class="mt-3 text-sm text-foreground">{absence.notes}</p>
					{/if}
				</div>
				{#if isAbsenceWithinEditWindow(absence)}
					<Button
						variant="outline"
						size="sm"
						class="mt-3 flex-shrink-0 self-start sm:mt-0"
						onclick={() => handleEditAbsence(absence)}
					>
						<Edit2 class="h-4 w-4" />
					</Button>
				{:else}
					<Button
						variant="outline"
						size="sm"
						disabled
						title={m.entry_locked_tooltip({ days: EDIT_WINDOW_DAYS })}
						aria-label={m.entry_locked_tooltip({ days: EDIT_WINDOW_DAYS })}
						class="mt-3 flex-shrink-0 self-start text-muted-foreground sm:mt-0"
					>
						<Lock class="h-4 w-4" />
					</Button>
				{/if}
			</div>
		</Card.Content>
	</Card.Root>
{/snippet}

<div class="relative flex min-h-screen flex-col overflow-hidden bg-background text-foreground">
	<main class="relative z-10 flex-1 p-3 sm:p-4 lg:p-8">
		<div class="mx-auto max-w-4xl">
			<!-- Header with Back Button -->
			<div class="mb-4 flex items-center gap-2 sm:mb-6 sm:gap-4 lg:mb-8">
				<a
					href={resolve('/dashboard')}
					aria-label={m.back_to_dashboard()}
					class="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
				>
					<ArrowLeft class="h-4 w-4" />
				</a>
				<div class="min-w-0">
					<h1 class="truncate text-base font-bold text-foreground sm:text-xl lg:text-2xl">
						{m.absences_title()}
					</h1>
					<p class="text-xs text-muted-foreground sm:text-sm lg:text-base">
						{m.absences_description()}
					</p>
				</div>
			</div>

			<!-- Add Button -->
			<div class="mb-4 sm:mb-6">
				<Button onclick={() => (formDialogOpen = true)} size="lg">
					<Plus class="mr-2 h-5 w-5" />
					{m.absence_new_button()}
				</Button>
			</div>

			<!-- Absences List -->
			{#if isLoading}
				<Card.Root>
					<Card.Content class="flex items-center justify-center py-12">
						<div class="text-center">
							<div class="mb-2 flex justify-center text-primary">
								<Spinner size="lg" />
							</div>
							<p class="text-sm text-muted-foreground">{m.absences_loading()}</p>
						</div>
					</Card.Content>
				</Card.Root>
			{:else if absences.length === 0}
				<Card.Root>
					<Card.Content class="flex flex-col items-center justify-center py-12">
						<EmptyState
							icon={AlertCircle}
							title={m.no_absences_found()}
							hint={m.absences_empty_hint()}
						>
							<div class="mt-3">
								<Button onclick={() => (formDialogOpen = true)} variant="outline">
									<Plus class="mr-2 h-4 w-4" />
									{m.absence_add_button()}
								</Button>
							</div>
						</EmptyState>
					</Card.Content>
				</Card.Root>
			{:else}
				<!-- Upcoming absences above the chart -->
				<div class="grid gap-3 lg:gap-6">
					{#each upcomingAbsences as absence (absence.id)}
						{@render absenceCard(absence)}
					{/each}
				</div>

				<!-- Chart -->
				<div class="my-4 sm:my-6">
					<AbsenceChart {absences} />
				</div>

				<!-- Past absences below the chart -->
				{#if pastAbsences.length > 0}
					<div class="mt-2">
						<button
							type="button"
							onclick={() => (showPast = !showPast)}
							class="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
						>
							<span class="transition-transform duration-200 {showPast ? 'rotate-90' : ''}">▶</span>
							{showPast
								? m.absences_hide_past()
								: m.absences_show_past({ count: pastAbsences.length })}
						</button>

						{#if showPast}
							<div class="mt-3 grid gap-3 opacity-60 lg:gap-4">
								{#each pastAbsences as absence (absence.id)}
									{@render absenceCard(absence)}
								{/each}
							</div>
						{/if}
					</div>
				{/if}
			{/if}
		</div>
	</main>
</div>

{#if formDialogOpen}
	<AbsenceFormDialog
		bind:open={formDialogOpen}
		teamMember={data.teamMember}
		onAbsenceAdded={handleAbsenceAdded}
		absenceToEdit={editingAbsence}
	/>
{/if}

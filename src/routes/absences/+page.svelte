<script lang="ts">
	import { onMount } from 'svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { AlertCircle, ArrowLeft, Edit2, Plus } from 'lucide-svelte';
	import * as m from '$lib/paraglide/messages.js';
	import { getAbsences } from '$lib/absenceStorage';
	import type { AbsenceRecord } from '$lib/types';
	import AbsenceFormDialog from '$lib/components/absence-form-dialog.svelte';
	import { resolve } from '$app/paths';
	import { getDateLocale } from '$lib/dateLocale';
	import { rrulestr } from 'rrule';

	const dateLocale = getDateLocale();

	let { data } = $props();
	let absences = $state<AbsenceRecord[]>([]);
	let isLoading = $state(true);
	let formDialogOpen = $state(false);
	let editingAbsence = $state<AbsenceRecord | null>(null);

	onMount(async () => {
		await loadAbsences();
	});

	async function loadAbsences() {
		isLoading = true;
		try {
			absences = await getAbsences();
		} catch (error) {
			console.error('Failed to load absences:', error);
		} finally {
			isLoading = false;
		}
	}

	function getAbsenceTypeLabel(typeId: string): string {
		const typeMap: Record<string, string> = {
			sick: m.absence_type_sick(),
			vacation: m.absence_type_vacation(),
			military: m.absence_type_military(),
			uk: m.absence_type_uk(),
			berufsschule: m.absence_type_berufsschule(),
			custom: m.absence_type_custom()
		};
		return typeMap[typeId] || typeId;
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

	function getRecurrenceDescription(absence: AbsenceRecord): string {
		if (!absence.is_recurring || !absence.rrule) {
			return '';
		}

		try {
			const rule = rrulestr(absence.rrule);
			const options = rule.origOptions || {};

			let desc = 'Every ';
			const freq = options.freq;
			const byweekday = options.byweekday || [];

			const weekdayMap: Record<number, string> = {
				0: 'Sunday',
				1: 'Monday',
				2: 'Tuesday',
				3: 'Wednesday',
				4: 'Thursday',
				5: 'Friday',
				6: 'Saturday'
			};

			if (freq === 2) {
				// WEEKLY
				if (byweekday.length > 0) {
					const days = byweekday
						.map((d: number | { weekday: number }) => {
							const dayNum = typeof d === 'number' ? d : d.weekday;
							return weekdayMap[dayNum];
						})
						.join(', ');
					desc += days;
				} else {
					desc += 'week';
				}
			} else if (freq === 3) {
				// MONTHLY
				desc += 'month';
			} else if (freq === 1) {
				// DAILY
				desc += 'day';
			}

			if (options.until) {
				const until = options.until instanceof Date ? options.until : new Date(options.until);
				desc += ` until ${new Intl.DateTimeFormat(dateLocale, { month: 'short', day: 'numeric', year: 'numeric' }).format(until)}`;
			}

			return desc;
		} catch (e) {
			console.error('Failed to parse rrule:', e);
			return '';
		}
	}

	function handleEditAbsence(absence: AbsenceRecord) {
		editingAbsence = absence;
		formDialogOpen = true;
	}

	function handleAbsenceAdded() {
		editingAbsence = null;
		loadAbsences();
	}
</script>

<div class="relative flex min-h-screen flex-col overflow-hidden bg-background text-foreground">
	<main class="relative z-10 flex-1 p-3 sm:p-4 lg:p-8">
		<div class="mx-auto max-w-4xl">
			<!-- Header with Back Button -->
			<div class="mb-4 flex items-center gap-2 sm:mb-6 sm:gap-4 lg:mb-8">
				<a
					href={resolve('/dashboard')}
					aria-label="Back to dashboard"
					class="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
				>
					<ArrowLeft class="h-4 w-4" />
				</a>
				<div class="min-w-0">
					<h1 class="truncate text-base font-bold text-foreground sm:text-xl lg:text-2xl">
						Absences
					</h1>
					<p class="text-xs text-muted-foreground sm:text-sm lg:text-base">
						Manage your absence rules and schedules
					</p>
				</div>
			</div>

			<!-- Add Button -->
			<div class="mb-4 sm:mb-6">
				<Button onclick={() => (formDialogOpen = true)} size="lg">
					<Plus class="mr-2 h-5 w-5" />
					New Absence
				</Button>
			</div>

			<!-- Absences List -->
			{#if isLoading}
				<Card.Root>
					<Card.Content class="flex items-center justify-center py-12">
						<div class="text-center">
							<div
								class="mb-2 inline-flex h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-primary"
							></div>
							<p class="text-sm text-muted-foreground">Loading absences...</p>
						</div>
					</Card.Content>
				</Card.Root>
			{:else if absences.length === 0}
				<Card.Root>
					<Card.Content class="flex flex-col items-center justify-center py-12">
						<AlertCircle class="mb-2 h-12 w-12 text-muted-foreground/50" />
						<h3 class="mb-1 text-lg font-medium">No absences yet</h3>
						<p class="mb-4 text-sm text-muted-foreground">
							Create your first absence to get started
						</p>
						<Button onclick={() => (formDialogOpen = true)} variant="outline">
							<Plus class="mr-2 h-4 w-4" />
							Add Absence
						</Button>
					</Card.Content>
				</Card.Root>
			{:else}
				<div class="grid gap-4 lg:gap-6">
					{#each absences as absence (absence.id)}
						<Card.Root>
							<Card.Content class="pt-3 sm:pt-6">
								<div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
									<div class="min-w-0 flex-1">
										<div class="flex flex-wrap items-center gap-2">
											<h3 class="text-base font-semibold text-foreground sm:text-lg">
												{getAbsenceTypeLabel(absence.absence_type_id)}
											</h3>
											{#if absence.is_recurring}
												<span
													class="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
												>
													Recurring
												</span>
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
									<Button
										variant="outline"
										size="sm"
										class="flex-shrink-0"
										onclick={() => handleEditAbsence(absence)}
									>
										<Edit2 class="h-4 w-4" />
									</Button>
								</div>
							</Card.Content>
						</Card.Root>
					{/each}
				</div>
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

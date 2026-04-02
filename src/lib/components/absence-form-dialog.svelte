<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import * as AlertDialog from '$lib/components/ui/alert-dialog';
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import { absenceStore } from '$lib/absenceStorage';
	import type { AbsenceType, AbsenceRecord, TeamMember } from '$lib/types';
	import { AlertCircle, Calendar, Trash2 } from 'lucide-svelte';
	import * as m from '$lib/paraglide/messages.js';
	import { getDateLocale } from '$lib/dateLocale';
	import { rrulestr, Frequency } from 'rrule';

	const dateLocale = $derived(getDateLocale());

	const absenceTypes: { id: AbsenceType; labelKey: string; recurring: boolean }[] = [
		{ id: 'sick', labelKey: 'absence_type_sick', recurring: false },
		{ id: 'vacation', labelKey: 'absence_type_vacation', recurring: false },
		{ id: 'military', labelKey: 'absence_type_military', recurring: true },
		{ id: 'uk', labelKey: 'absence_type_uk', recurring: true },
		{ id: 'berufsschule', labelKey: 'absence_type_berufsschule', recurring: true },
		{ id: 'custom', labelKey: 'absence_type_custom', recurring: false }
	];

	const weekdays = [
		{ value: 0, short: 'Su', long: 'Sunday' },
		{ value: 1, short: 'Mo', long: 'Monday' },
		{ value: 2, short: 'Tu', long: 'Tuesday' },
		{ value: 3, short: 'We', long: 'Wednesday' },
		{ value: 4, short: 'Th', long: 'Thursday' },
		{ value: 5, short: 'Fr', long: 'Friday' },
		{ value: 6, short: 'Sa', long: 'Saturday' }
	];

	let {
		open = $bindable(),
		teamMember,
		onAbsenceAdded,
		selectedDate,
		absenceToEdit = null
	}: {
		open: boolean;
		teamMember: TeamMember | null;
		onAbsenceAdded: () => void;
		selectedDate?: string;
		absenceToEdit?: AbsenceRecord | null;
	} = $props();

	let selectedAbsenceType = $state<AbsenceType | null>(null);
	let isRecurring = $state(false);
	let startDate = $state<string>('');
	let endDate = $state<string>('');
	let recurrenceFrequency = $state<'daily' | 'weekly' | 'monthly'>('weekly');
	let selectedDays = $state<number[]>([]);
	let recurrenceUntil = $state<string>('');
	let notes = $state<string>('');
	let isSubmitting = $state(false);
	let hasInitialized = $state(false);
	let submitError = $state<string | null>(null);
	let deleteDialogOpen = $state(false);
	let deleteChoice = $state<'this' | 'all' | null>(null);
	let isDeleting = $state(false);
	let deleteError = $state<string | null>(null);

	$effect(() => {
		if (open && !hasInitialized) {
			if (absenceToEdit) {
				selectedAbsenceType = absenceToEdit.absence_type_id;
				startDate = absenceToEdit.start_date;
				endDate = absenceToEdit.end_date;
				isRecurring = absenceToEdit.is_recurring;
				notes = absenceToEdit.notes || '';

				if (absenceToEdit.rrule) {
					try {
						const rule = rrulestr(absenceToEdit.rrule);
						const options = rule.origOptions || {};
						recurrenceFrequency = getFrequencyString(options.freq || Frequency.WEEKLY);
						recurrenceUntil = options.until
							? options.until instanceof Date
								? options.until.toISOString().split('T')[0]
								: String(options.until)
							: '';
						const byweekday = options.byweekday || [];
						selectedDays = byweekday.map((d: number | { weekday: number }) =>
							typeof d === 'number' ? d : d.weekday
						);
					} catch (e) {
						console.error('Failed to parse rrule:', e);
					}
				}
			} else {
				selectedAbsenceType = null;
				isRecurring = false;
				startDate = selectedDate || '';
				endDate = selectedDate || '';
				recurrenceFrequency = 'weekly';
				selectedDays = [];
				recurrenceUntil = '';
				notes = '';
			}
			submitError = null;
			deleteError = null;
			hasInitialized = true;
		} else if (!open) {
			hasInitialized = false;
			deleteChoice = null;
		}
	});

	function getFrequencyString(freq: number): 'daily' | 'weekly' | 'monthly' {
		switch (freq) {
			case Frequency.DAILY:
				return 'daily';
			case Frequency.WEEKLY:
				return 'weekly';
			case Frequency.MONTHLY:
				return 'monthly';
			default:
				return 'weekly';
		}
	}

	function getFrequencyEnum(freq: string): Frequency {
		switch (freq) {
			case 'daily':
				return Frequency.DAILY;
			case 'weekly':
				return Frequency.WEEKLY;
			case 'monthly':
				return Frequency.MONTHLY;
			default:
				return Frequency.WEEKLY;
		}
	}

	function buildRruleString(): string {
		if (!startDate || !isRecurring) return '';

		const freq = getFrequencyEnum(recurrenceFrequency);
		let rruleStr = `DTSTART:${startDate.replace(/-/g, '')}T000000Z\nFREQ=${Frequency[freq]}`;

		if (recurrenceFrequency === 'weekly' && selectedDays.length > 0) {
			const dayMap = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
			const days = selectedDays.map((d) => dayMap[d]).join(',');
			rruleStr += `;BYDAY=${days}`;
		}

		if (recurrenceUntil) {
			rruleStr += `;UNTIL=${recurrenceUntil.replace(/-/g, '')}T235959Z`;
		}

		return rruleStr;
	}

	function toggleDay(day: number) {
		if (selectedDays.includes(day)) {
			selectedDays = selectedDays.filter((d) => d !== day);
		} else {
			selectedDays = [...selectedDays, day];
		}
	}

	function getAbsenceTypeLabel(typeId: AbsenceType): string {
		const type = absenceTypes.find((t) => t.id === typeId);
		if (!type) return typeId;

		switch (type.labelKey) {
			case 'absence_type_sick':
				return m.absence_type_sick();
			case 'absence_type_vacation':
				return m.absence_type_vacation();
			case 'absence_type_military':
				return m.absence_type_military();
			case 'absence_type_uk':
				return m.absence_type_uk();
			case 'absence_type_berufsschule':
				return m.absence_type_berufsschule();
			case 'absence_type_custom':
				return m.absence_type_custom();
			default:
				return typeId;
		}
	}

	const isValid = $derived(selectedAbsenceType !== null && startDate && endDate && !isSubmitting);
	const showRecurrenceOptions = $derived(isRecurring && selectedAbsenceType !== null);
	const canSubmitRecurring = $derived(
		!isRecurring || recurrenceFrequency === 'monthly' || selectedDays.length > 0
	);

	const selectedDateLabel = $derived(
		selectedDate
			? new Intl.DateTimeFormat(dateLocale, {
					weekday: 'long',
					month: 'long',
					day: 'numeric',
					year: 'numeric'
				}).format(new Date(`${selectedDate}T12:00:00`))
			: null
	);

	const previewDates = $derived(() => {
		if (!showRecurrenceOptions || !startDate) return [];
		try {
			const rruleStr = buildRruleString();
			if (!rruleStr) return [];
			const rule = rrulestr(rruleStr, { dtstart: new Date(`${startDate}T00:00:00Z`) });
			const today = new Date().toISOString().split('T')[0];
			const dates = rule
				.all()
				.filter((date) => {
					const dateStr = date.toISOString().split('T')[0];
					return dateStr > today;
				})
				.slice(0, 6);
			return dates.map((d) => d.toISOString().split('T')[0]);
		} catch (e) {
			console.error('Error generating preview:', e);
			return [];
		}
	});

	async function handleSubmit() {
		submitError = null;
		if (!teamMember) {
			submitError = 'Team information not found. Please contact support.';
			console.error('[AbsenceForm] teamMember is null or undefined');
			return;
		}

		if (!selectedAbsenceType) {
			submitError = 'Please select an absence type.';
			return;
		}

		if (!startDate || !endDate) {
			submitError = 'Please select start and end dates.';
			return;
		}

		if (startDate > endDate) {
			submitError = 'End date must be after or equal to start date.';
			return;
		}

		if (isRecurring && !canSubmitRecurring) {
			submitError = 'Please select at least one day of the week.';
			return;
		}

		isSubmitting = true;

		try {
			if (!teamMember.organization_id || !teamMember.user_id) {
				throw new Error('Missing required user information');
			}

			const rrule = isRecurring ? buildRruleString() : null;

			if (absenceToEdit) {
				await absenceStore.update(absenceToEdit.id, {
					absence_type_id: selectedAbsenceType,
					start_date: startDate,
					end_date: endDate,
					is_recurring: isRecurring,
					rrule,
					notes: notes || null
				});
			} else {
				await absenceStore.add({
					organization_id: teamMember.organization_id,
					user_id: teamMember.user_id,
					team_id: teamMember.team_id || null,
					absence_type_id: selectedAbsenceType,
					start_date: startDate,
					end_date: endDate,
					is_recurring: isRecurring,
					rrule,
					notes: notes || null
				});
			}

			open = false;
			onAbsenceAdded();
		} catch (error) {
			console.error('[AbsenceForm] Failed to save:', error);
			submitError =
				error instanceof Error ? error.message : 'Failed to save absence. Please try again.';
		} finally {
			isSubmitting = false;
		}
	}

	async function handleDelete() {
		if (!absenceToEdit) return;

		if (deleteChoice === null) {
			deleteDialogOpen = true;
			return;
		}

		isDeleting = true;
		deleteError = null;

		try {
			if (deleteChoice === 'all') {
				await absenceStore.delete(absenceToEdit.id);
			}

			deleteDialogOpen = false;
			open = false;
			onAbsenceAdded();
		} catch (error) {
			deleteError = error instanceof Error ? error.message : 'Failed to delete absence';
		} finally {
			isDeleting = false;
		}
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>{absenceToEdit ? m.edit_absence_title() : m.log_absence_title()}</Dialog.Title>
			<Dialog.Description
				>{absenceToEdit
					? m.edit_absence_description()
					: m.log_absence_description()}</Dialog.Description
			>
		</Dialog.Header>

		{#if submitError}
			<div
				class="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950"
			>
				<AlertCircle class="mt-0.5 h-5 w-5 flex-shrink-0 text-red-500 dark:text-red-400" />
				<div class="flex-1">
					<p class="text-sm font-medium text-red-800 dark:text-red-300">Error</p>
					<p class="text-sm text-red-600 dark:text-red-400">{submitError}</p>
				</div>
			</div>
		{/if}

		<div class="grid gap-4 py-4">
			{#if selectedDateLabel && !absenceToEdit}
				<div
					class="flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-4 py-3 text-sm text-muted-foreground"
				>
					<Calendar class="h-4 w-4 text-primary" />
					{m.absence_saved_for_date({ date: selectedDateLabel })}
				</div>
			{/if}

			<div class="grid gap-2">
				<Label>{m.absence_type_label()}</Label>
				<div class="grid grid-cols-2 gap-2">
					{#each absenceTypes as type (type.id)}
						<button
							type="button"
							onclick={() => {
								selectedAbsenceType = type.id;
								if (!type.recurring) {
									isRecurring = false;
								}
							}}
							class="flex items-center justify-center rounded-lg border px-3 py-2 text-sm font-medium transition-colors {selectedAbsenceType ===
							type.id
								? 'border-primary bg-primary/10 text-primary'
								: 'border-border bg-background text-foreground hover:bg-accent'}"
						>
							{getAbsenceTypeLabel(type.id)}
						</button>
					{/each}
				</div>
			</div>

			{#if selectedAbsenceType}
				<div class="grid gap-3 rounded-lg border border-border bg-muted/20 p-4">
					<div class="grid gap-3 sm:grid-cols-2">
						<div class="grid gap-2">
							<Label for="startDate">From</Label>
							<Input id="startDate" type="date" bind:value={startDate} />
						</div>
						<div class="grid gap-2">
							<Label for="endDate">To</Label>
							<Input id="endDate" type="date" bind:value={endDate} />
						</div>
					</div>
				</div>

				{@const selectedType = absenceTypes.find((t) => t.id === selectedAbsenceType)}
				{#if selectedType?.recurring}
					<div class="grid gap-3 rounded-lg border border-border bg-muted/20 p-4">
						<div class="flex items-center gap-2">
							<input
								id="recurring"
								type="checkbox"
								bind:checked={isRecurring}
								class="h-4 w-4 rounded border-border accent-primary"
							/>
							<Label for="recurring" class="cursor-pointer font-medium">{m.recurring_label()}</Label
							>
						</div>
						<p class="text-xs text-muted-foreground">{m.recurring_description()}</p>

						{#if showRecurrenceOptions}
							<div class="mt-2 grid gap-3">
								<div class="grid gap-2">
									<Label>Frequency</Label>
									<div class="flex gap-2">
										<button
											type="button"
											onclick={() => (recurrenceFrequency = 'daily')}
											class="flex-1 rounded-lg border px-3 py-2 text-sm transition-colors {recurrenceFrequency ===
											'daily'
												? 'border-primary bg-primary/10 text-primary'
												: 'border-border bg-background text-foreground hover:bg-accent'}"
										>
											Daily
										</button>
										<button
											type="button"
											onclick={() => (recurrenceFrequency = 'weekly')}
											class="flex-1 rounded-lg border px-3 py-2 text-sm transition-colors {recurrenceFrequency ===
											'weekly'
												? 'border-primary bg-primary/10 text-primary'
												: 'border-border bg-background text-foreground hover:bg-accent'}"
										>
											Weekly
										</button>
										<button
											type="button"
											onclick={() => (recurrenceFrequency = 'monthly')}
											class="flex-1 rounded-lg border px-3 py-2 text-sm transition-colors {recurrenceFrequency ===
											'monthly'
												? 'border-primary bg-primary/10 text-primary'
												: 'border-border bg-background text-foreground hover:bg-accent'}"
										>
											Monthly
										</button>
									</div>
								</div>

								{#if recurrenceFrequency !== 'monthly'}
									<div class="grid gap-2">
										<Label>Days of Week</Label>
										<div class="flex flex-wrap gap-2">
											{#each weekdays as day (day.value)}
												<button
													type="button"
													onclick={() => toggleDay(day.value)}
													class="min-w-[2.5rem] rounded-lg border px-2 py-1 text-xs font-medium transition-colors {selectedDays.includes(
														day.value
													)
														? 'border-primary bg-primary text-primary-foreground'
														: 'border-border bg-background text-foreground hover:bg-accent'}"
												>
													{day.short}
												</button>
											{/each}
										</div>
									</div>
								{/if}

								<div class="grid gap-2">
									<Label for="recurrenceUntil">Until (optional)</Label>
									<Input id="recurrenceUntil" type="date" bind:value={recurrenceUntil} />
								</div>

								<div class="grid gap-2">
									<Label>Preview ({previewDates().length} upcoming)</Label>
									<div class="flex flex-wrap gap-1">
										{#each previewDates() as date (date)}
											<span class="rounded bg-primary/10 px-2 py-0.5 text-xs text-primary">
												{new Date(`${date}T12:00:00`).toLocaleDateString(dateLocale, {
													month: 'short',
													day: 'numeric'
												})}
											</span>
										{/each}
										{#if previewDates().length >= 6}
											<span class="px-2 py-0.5 text-xs text-muted-foreground">...</span>
										{/if}
									</div>
								</div>
							</div>
						{/if}
					</div>
				{/if}
			{/if}

			<div class="grid gap-2">
				<Label for="notes">{m.notes_optional()}</Label>
				<Textarea id="notes" bind:value={notes} placeholder={m.notes_placeholder()} />
			</div>
		</div>

		<Dialog.Footer class={absenceToEdit ? 'flex gap-2' : ''}>
			{#if absenceToEdit}
				<Button
					variant="destructive"
					onclick={handleDelete}
					disabled={isSubmitting || isDeleting}
					class="flex-1"
				>
					<Trash2 class="mr-2 h-4 w-4" />
					{m.delete_activity_confirm_button()}
				</Button>
			{/if}
			<div class="flex gap-2">
				<Button
					variant="outline"
					onclick={() => {
						open = false;
						submitError = null;
					}}
					disabled={isSubmitting || isDeleting}
				>
					{m.cancel()}
				</Button>
				<Button
					variant="default"
					onclick={handleSubmit}
					disabled={!isValid || !canSubmitRecurring || isSubmitting}
				>
					{#if isSubmitting}
						<span class="flex items-center gap-2">
							<span class="h-4 w-4 animate-spin">⟳</span>
							Saving...
						</span>
					{:else}
						{absenceToEdit ? m.save_changes_button() : m.log_absence_button()}
					{/if}
				</Button>
			</div>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<AlertDialog.Root bind:open={deleteDialogOpen}>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>Delete Absence</AlertDialog.Title>
			{#if deleteError}
				<AlertDialog.Description class="text-red-500">{deleteError}</AlertDialog.Description>
			{/if}
		</AlertDialog.Header>
		<AlertDialog.Description>
			{#if absenceToEdit?.is_recurring}
				Delete this occurrence only, or delete the entire recurring rule?
			{:else}
				Are you sure you want to delete this absence?
			{/if}
		</AlertDialog.Description>
		<AlertDialog.Footer>
			<AlertDialog.Cancel disabled={isDeleting}>{m.cancel()}</AlertDialog.Cancel>
			{#if absenceToEdit?.is_recurring}
				<Button
					variant="outline"
					onclick={() => {
						deleteChoice = 'this';
						handleDelete();
					}}
					disabled={isDeleting}
				>
					This Occurrence
				</Button>
			{/if}
			<AlertDialog.Action
				onclick={() => {
					deleteChoice = 'all';
					handleDelete();
				}}
				disabled={isDeleting}
				class="text-destructive-foreground bg-destructive hover:bg-destructive/90"
			>
				{#if isDeleting}
					<span class="flex items-center gap-2">
						<span class="h-4 w-4 animate-spin">⟳</span>
						Deleting...
					</span>
				{:else}
					<Trash2 class="mr-2 h-4 w-4" />
					{#if absenceToEdit?.is_recurring}
						Delete All
					{:else}
						Delete
					{/if}
				{/if}
			</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>

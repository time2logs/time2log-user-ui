<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';
	import { absenceStore } from '$lib/absenceStorage';
	import {
		generateRecurrenceDates,
		getWeekdayLabels,
		type RecurrenceFrequency,
		type RecurrencePattern
	} from '$lib/recurrenceUtils';
	import type { AbsenceType, AbsenceRecord, TeamMember } from '$lib/types';
	import { AlertCircle, Calendar } from 'lucide-svelte';
	import * as m from '$lib/paraglide/messages.js';
	import { getLocale } from '$lib/paraglide/runtime.js';

	const localeMap: Record<string, string> = {
		en: 'en-GB',
		'de-ch': 'de-CH',
		it: 'it-IT',
		fr: 'fr-FR'
	};

	const dateLocale = $derived(localeMap[getLocale()] ?? 'en-GB');

	const absenceTypes: { id: AbsenceType; labelKey: string; recurring: boolean }[] = [
		{ id: 'sick', labelKey: 'absence_type_sick', recurring: false },
		{ id: 'vacation', labelKey: 'absence_type_vacation', recurring: false },
		{ id: 'military', labelKey: 'absence_type_military', recurring: true },
		{ id: 'uk', labelKey: 'absence_type_uk', recurring: true },
		{ id: 'berufsschule', labelKey: 'absence_type_berufsschule', recurring: true },
		{ id: 'custom', labelKey: 'absence_type_custom', recurring: false }
	];

	const weekdays = getWeekdayLabels();

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
	let recurrenceFrequency = $state<RecurrenceFrequency>('weekly');
	let selectedDays = $state<number[]>([]);
	let recurrenceUntil = $state<string>('');
	let maxOccurrences = $state<number>(12);
	let notes = $state<string>('');
	let isSubmitting = $state(false);
	let hasInitialized = $state(false);
	let submitError = $state<string | null>(null);

	$effect(() => {
		if (open && !hasInitialized) {
			if (absenceToEdit) {
				selectedAbsenceType = absenceToEdit.absence_type_id;
				isRecurring = absenceToEdit.is_recurring;
				notes = absenceToEdit.notes || '';
				if (absenceToEdit.recurrence_pattern) {
					recurrenceFrequency = absenceToEdit.recurrence_pattern.frequency;
					selectedDays = absenceToEdit.recurrence_pattern.days || [];
					recurrenceUntil = absenceToEdit.recurrence_pattern.until || '';
				}
			} else {
				selectedAbsenceType = null;
				isRecurring = false;
				recurrenceFrequency = 'weekly';
				selectedDays = [];
				recurrenceUntil = '';
				maxOccurrences = 12;
				notes = '';
			}
			submitError = null;
			hasInitialized = true;
		} else if (!open) {
			hasInitialized = false;
		}
	});

	const isValid = $derived(selectedAbsenceType !== null && !isSubmitting);
	const showRecurrenceOptions = $derived(isRecurring && selectedAbsenceType !== null);
	const canSubmitRecurring = $derived(
		!isRecurring || selectedDays.length > 0 || recurrenceFrequency === 'monthly'
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
		if (!showRecurrenceOptions || !selectedDate) return [];
		const pattern: RecurrencePattern = {
			frequency: recurrenceFrequency,
			days: recurrenceFrequency === 'monthly' ? [] : selectedDays,
			until: recurrenceUntil
		};
		return generateRecurrenceDates(selectedDate, pattern, maxOccurrences).slice(0, 6);
	});

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

		if (isRecurring && !canSubmitRecurring) {
			submitError = 'Please select at least one day of the week.';
			return;
		}

		isSubmitting = true;

		try {
			if (!teamMember.organization_id || !teamMember.user_id) {
				throw new Error('Missing required user information');
			}

			const entryDate = selectedDate || new Date().toISOString().split('T')[0];
			const recurrencePattern: RecurrencePattern | null = isRecurring
				? {
						frequency: recurrenceFrequency,
						days: recurrenceFrequency === 'monthly' ? [] : selectedDays,
						until: recurrenceUntil
					}
				: null;

			if (isRecurring && recurrencePattern) {
				const allDates = generateRecurrenceDates(entryDate, recurrencePattern, maxOccurrences);
				await absenceStore.addRecurring({
					organization_id: teamMember.organization_id,
					user_id: teamMember.user_id,
					team_id: teamMember.team_id || null,
					absence_type_id: selectedAbsenceType,
					notes: notes || null,
					dates: allDates
				});
			} else {
				await absenceStore.add({
					organization_id: teamMember.organization_id,
					user_id: teamMember.user_id,
					team_id: teamMember.team_id || null,
					absence_type_id: selectedAbsenceType,
					entry_date: entryDate,
					is_recurring: false,
					recurrence_pattern: null,
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
			<div class="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3">
				<AlertCircle class="mt-0.5 h-5 w-5 flex-shrink-0 text-red-500" />
				<div class="flex-1">
					<p class="text-sm font-medium text-red-800">Error</p>
					<p class="text-sm text-red-600">{submitError}</p>
				</div>
			</div>
		{/if}

		<div class="grid gap-4 py-4">
			{#if selectedDateLabel}
				<div
					class="flex items-center gap-2 rounded-lg border border-orange-200 bg-orange-50/80 px-4 py-3 text-sm text-stone-700"
				>
					<Calendar class="h-4 w-4 text-orange-500" />
					{m.absence_saved_for_date({ date: selectedDateLabel })}
				</div>
			{/if}

			<div class="grid gap-2">
				<Label>{m.absence_type_label()}</Label>
				<div class="grid grid-cols-2 gap-2">
					{#each absenceTypes as type}
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
								? 'border-orange-400 bg-orange-50 text-orange-700'
								: 'border-stone-200 bg-white text-stone-700 hover:bg-stone-50'}"
						>
							{getAbsenceTypeLabel(type.id)}
						</button>
					{/each}
				</div>
			</div>

			{#if selectedAbsenceType}
				{@const selectedType = absenceTypes.find((t) => t.id === selectedAbsenceType)}
				{#if selectedType?.recurring}
					<div class="grid gap-3 rounded-lg border border-orange-200 bg-orange-50/30 p-4">
						<div class="flex items-center gap-2">
							<input
								id="recurring"
								type="checkbox"
								bind:checked={isRecurring}
								class="h-4 w-4 rounded border-stone-300 text-orange-500 focus:ring-orange-500"
							/>
							<Label for="recurring" class="cursor-pointer font-medium">{m.recurring_label()}</Label
							>
						</div>
						<p class="text-xs text-stone-500">{m.recurring_description()}</p>

						{#if showRecurrenceOptions}
							<div class="mt-2 grid gap-3">
								<div class="grid gap-2">
									<Label>{m.recurring_label()}</Label>
									<div class="flex gap-2">
										<button
											type="button"
											onclick={() => (recurrenceFrequency = 'weekly')}
											class="flex-1 rounded-lg border px-3 py-2 text-sm transition-colors {recurrenceFrequency ===
											'weekly'
												? 'border-orange-400 bg-orange-50 text-orange-700'
												: 'border-stone-200 bg-white text-stone-700 hover:bg-stone-50'}"
										>
											{m.recurring_frequency_weekly()}
										</button>
										<button
											type="button"
											onclick={() => (recurrenceFrequency = 'biweekly')}
											class="flex-1 rounded-lg border px-3 py-2 text-sm transition-colors {recurrenceFrequency ===
											'biweekly'
												? 'border-orange-400 bg-orange-50 text-orange-700'
												: 'border-stone-200 bg-white text-stone-700 hover:bg-stone-50'}"
										>
											{m.recurring_frequency_biweekly()}
										</button>
										<button
											type="button"
											onclick={() => (recurrenceFrequency = 'monthly')}
											class="flex-1 rounded-lg border px-3 py-2 text-sm transition-colors {recurrenceFrequency ===
											'monthly'
												? 'border-orange-400 bg-orange-50 text-orange-700'
												: 'border-stone-200 bg-white text-stone-700 hover:bg-stone-50'}"
										>
											{m.recurring_frequency_monthly()}
										</button>
									</div>
								</div>

								{#if recurrenceFrequency !== 'monthly'}
									<div class="grid gap-2">
										<Label>{m.recurring_days_of_week()}</Label>
										<div class="flex flex-wrap gap-2">
											{#each weekdays as day}
												<button
													type="button"
													onclick={() => toggleDay(day.value)}
													class="min-w-[2.5rem] rounded-lg border px-2 py-1 text-xs font-medium transition-colors {selectedDays.includes(
														day.value
													)
														? 'border-orange-400 bg-orange-400 text-white'
														: 'border-stone-200 bg-white text-stone-700 hover:bg-stone-50'}"
												>
													{day.short}
												</button>
											{/each}
										</div>
									</div>
								{/if}

								<div class="grid gap-2">
									<Label for="recurrenceUntil">{m.recurring_until()}</Label>
									<input
										id="recurrenceUntil"
										type="date"
										bind:value={recurrenceUntil}
										class="flex h-9 w-full rounded-md border border-stone-200 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:ring-1 focus-visible:ring-stone-950 focus-visible:outline-none"
									/>
								</div>

								<div class="grid gap-2">
									<Label>{m.recurring_preview({ count: previewDates().length })}</Label>
									<div class="flex flex-wrap gap-1">
										{#each previewDates() as date}
											<span class="rounded bg-orange-100 px-2 py-0.5 text-xs text-orange-700">
												{new Date(`${date}T12:00:00`).toLocaleDateString(dateLocale, {
													month: 'short',
													day: 'numeric'
												})}
											</span>
										{/each}
										{#if previewDates().length >= 6}
											<span class="px-2 py-0.5 text-xs text-stone-500">...</span>
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
				<textarea
					id="notes"
					bind:value={notes}
					placeholder={m.notes_placeholder()}
					rows="3"
					class="flex min-h-[60px] w-full rounded-md border border-stone-200 bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-stone-400 focus-visible:ring-1 focus-visible:ring-stone-950 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
				></textarea>
			</div>
		</div>

		<Dialog.Footer>
			<Button
				variant="outline"
				onclick={() => {
					open = false;
					submitError = null;
				}}
				disabled={isSubmitting}
			>
				{m.cancel()}
			</Button>
			<Button
				variant="default"
				onclick={handleSubmit}
				disabled={!isValid || !canSubmitRecurring || isSubmitting}
				class="bg-gradient-to-r from-orange-400 to-rose-400 text-white hover:from-orange-500 hover:to-rose-500"
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
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

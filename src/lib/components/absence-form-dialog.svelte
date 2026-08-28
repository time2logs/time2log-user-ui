<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import { ConfirmDialog } from '$lib/components/ui/confirm-dialog';
	import { Button } from '$lib/components/ui/button';
	import { Alert } from '$lib/components/ui/alert';
	import { Label } from '$lib/components/ui/label';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import { DEFAULT_MAX_HOURS_PER_DAY } from '$lib/activityStorage';
	import { absenceStore, getAbsenceFractionForDate } from '$lib/absenceStorage';
	import type { AbsenceType, AbsenceRecord, ActivityRecord, TeamMember } from '$lib/types';
	import AlertCircle from '@lucide/svelte/icons/circle-alert';
	import Calendar from '@lucide/svelte/icons/calendar';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import * as m from '$lib/paraglide/messages.js';
	import { getDateLocale } from '$lib/dateLocale';
	import { rrulestr, Frequency } from 'rrule';
	import { getFrequencyString, buildRruleString, byweekdayToIndex } from '$lib/rruleUtils';
	import { getAbsenceTypeLabel } from '$lib/absence-types';
	import { Spinner } from '$lib/components/ui/spinner';
	import { SegmentedControl } from '$lib/components/ui/segmented-control';
	import { isAbsenceWithinEditWindow, EDIT_WINDOW_DAYS } from '$lib/utils';
	import { countWeekdaysInRange, isWeekendIsoDate } from '$lib/dateUtils';
	import Lock from '@lucide/svelte/icons/lock';

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
		absenceToEdit = null,
		existingActivities = [],
		existingAbsences = []
	}: {
		open: boolean;
		teamMember: TeamMember | null;
		onAbsenceAdded: () => void;
		selectedDate?: string;
		absenceToEdit?: AbsenceRecord | null;
		existingActivities?: ActivityRecord[];
		existingAbsences?: AbsenceRecord[];
	} = $props();

	const maxHoursPerDay = $derived(teamMember?.max_hours_per_day ?? DEFAULT_MAX_HOURS_PER_DAY);

	let selectedAbsenceType = $state<AbsenceType | null>(null);
	let isRecurring = $state(false);
	let startDate = $state<string>('');
	let endDate = $state<string>('');
	let dayFraction = $state<number>(1);
	let recurrenceFrequency = $state<'daily' | 'weekly'>('weekly');
	let selectedDays = $state<number[]>([]);
	let recurrenceUntil = $state<string>('');
	let notes = $state<string>('');
	let isSubmitting = $state(false);
	let hasInitialized = $state(false);
	let submitError = $state<string | null>(null);
	let lastSyncedStart = $state<string>('');
	let deleteDialogOpen = $state(false);
	let deleteChoice = $state<'all' | null>(null);
	let isDeleting = $state(false);
	let deleteError = $state<string | null>(null);

	function formatHoursValue(value: number): string {
		const rounded = Math.round(value * 10) / 10;
		return Number.isInteger(rounded) ? `${rounded}` : rounded.toFixed(1);
	}

	function formatCalendarDate(date: string): string {
		return new Intl.DateTimeFormat(dateLocale, {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		}).format(new Date(`${date}T12:00:00`));
	}

	function getDatesInRange(start: string, end: string): string[] {
		const dates: string[] = [];
		const startTime = Date.parse(`${start}T12:00:00`);
		const endTime = Date.parse(`${end}T12:00:00`);

		for (let time = startTime; time <= endTime; time += 24 * 60 * 60 * 1000) {
			dates.push(new Date(time).toISOString().split('T')[0]);
		}

		return dates;
	}

	function weekdayIndexOf(dateStr: string): number | null {
		if (!dateStr) return null;
		const day = new Date(`${dateStr}T12:00:00`).getDay();
		return Number.isNaN(day) ? null : day;
	}

	$effect(() => {
		if (open && !hasInitialized) {
			if (absenceToEdit) {
				selectedAbsenceType = absenceToEdit.absence_type_id;
				startDate = absenceToEdit.start_date;
				endDate = absenceToEdit.end_date;
				dayFraction = (absenceToEdit.day_fraction ?? 1) < 1 ? 0.5 : 1;
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
						const byweekdayRaw = options.byweekday;
						const byweekday =
							byweekdayRaw == null
								? []
								: Array.isArray(byweekdayRaw)
									? byweekdayRaw
									: [byweekdayRaw];
						selectedDays = byweekday
							.map((d) => byweekdayToIndex(d))
							.filter((value): value is number => value !== undefined)
							.filter(isSelectableWeekday);
					} catch (e) {
						console.error('Failed to parse rrule:', e);
					}
				}
			} else {
				selectedAbsenceType = null;
				isRecurring = false;
				startDate = selectedDate || '';
				endDate = selectedDate || '';
				dayFraction = 1;
				recurrenceFrequency = 'weekly';
				selectedDays = [];
				recurrenceUntil = '';
				notes = '';
			}
			submitError = null;
			deleteError = null;
			lastSyncedStart = startDate;
			hasInitialized = true;
		} else if (!open) {
			hasInitialized = false;
			deleteChoice = null;
		}
	});

	$effect(() => {
		if (hasInitialized && startDate && (!endDate || endDate < startDate)) {
			endDate = startDate;
		}
	});

	$effect(() => {
		if (hasInitialized && startDate && endDate && startDate !== endDate && dayFraction !== 1) {
			dayFraction = 1;
		}
	});

	function isSelectableWeekday(day: number): boolean {
		return day !== 0 && day !== 6;
	}

	function syncSelectedDaysToStartDate() {
		const wd = weekdayIndexOf(startDate);
		selectedDays = wd !== null && isSelectableWeekday(wd) ? [wd] : [];
	}

	$effect(() => {
		if (hasInitialized && startDate && startDate !== lastSyncedStart) {
			syncSelectedDaysToStartDate();
			lastSyncedStart = startDate;
		}
	});

	function getRruleString(): string {
		return buildRruleString({
			startDate,
			isRecurring,
			recurrenceFrequency,
			selectedDays,
			recurrenceUntil
		});
	}

	function toggleRecurring(checked: boolean) {
		isRecurring = checked;
		if (checked) {
			if (endDate && endDate !== startDate) {
				recurrenceUntil = endDate;
			}
			endDate = startDate;
			syncSelectedDaysToStartDate();
			lastSyncedStart = startDate;
		} else if (recurrenceUntil) {
			endDate = recurrenceUntil;
			recurrenceUntil = '';
		}
	}

	function toggleDay(day: number) {
		if (!isSelectableWeekday(day)) return;
		if (selectedDays.includes(day)) {
			selectedDays = selectedDays.filter((d) => d !== day);
		} else {
			selectedDays = [...selectedDays, day];
		}
	}

	const isValid = $derived(selectedAbsenceType !== null && startDate && endDate && !isSubmitting);
	const showRecurrenceOptions = $derived(isRecurring && selectedAbsenceType !== null);
	const canSubmitRecurring = $derived(
		!isRecurring || recurrenceFrequency === 'daily' || selectedDays.length > 0
	);
	const isLocked = $derived(!!absenceToEdit && !isAbsenceWithinEditWindow(absenceToEdit));

	const rangeWeekdayCount = $derived.by(() => {
		if (isRecurring || !startDate || !endDate || startDate > endDate) return null;
		return countWeekdaysInRange(startDate, endDate);
	});

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

	const previewDates = $derived.by(() => {
		if (!showRecurrenceOptions || !startDate) return [];
		try {
			const rruleStr = getRruleString();
			if (!rruleStr) return [];
			const rule = rrulestr(rruleStr, { dtstart: new Date(`${startDate}T00:00:00Z`) });
			const today = new Date().toISOString().split('T')[0];
			// Cap at 50 to prevent infinite loops on rules without UNTIL/COUNT
			const dates = rule
				.all((_, i) => i < 50)
				.filter((date) => date.toISOString().split('T')[0] > today)
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
			submitError = m.error_team_not_found();
			console.error('[AbsenceForm] teamMember is null or undefined');
			return;
		}

		if (!selectedAbsenceType) {
			submitError = m.error_select_absence_type();
			return;
		}

		if (!startDate || !endDate) {
			submitError = m.error_select_dates();
			return;
		}

		if (startDate > endDate) {
			submitError = m.error_end_date_after_start();
			return;
		}

		if (isRecurring && !canSubmitRecurring) {
			submitError = m.error_select_weekday();
			return;
		}

		const otherAbsences = existingAbsences.filter((absence) => absence.id !== absenceToEdit?.id);
		const affectedDates = (
			isRecurring
				? Array.from(new Set([startDate, ...previewDates]))
				: getDatesInRange(startDate, endDate)
		).filter((date) => !isWeekendIsoDate(date));

		for (const date of affectedDates) {
			const activityHours = existingActivities
				.filter((activity) => activity.entry_date === date)
				.reduce((sum, activity) => sum + activity.hours, 0);
			const blockedFraction = Math.min(
				1,
				getAbsenceFractionForDate(date, otherAbsences) + Number(dayFraction)
			);
			const availableHours = Math.max(0, maxHoursPerDay * (1 - blockedFraction));

			if (activityHours > availableHours) {
				submitError = m.error_absence_conflicts_with_activities({
					date: formatCalendarDate(date),
					activityHours: `${formatHoursValue(activityHours)}h`,
					available: `${formatHoursValue(availableHours)}h`
				});
				return;
			}
		}

		isSubmitting = true;

		try {
			if (!teamMember.organization_id || !teamMember.user_id) {
				throw new Error('Missing required user information');
			}

			const rrule = isRecurring ? getRruleString() : null;
			const effectiveEndDate = isRecurring ? recurrenceUntil || startDate : endDate;

			if (absenceToEdit) {
				await absenceStore.update(absenceToEdit.id, {
					absence_type_id: selectedAbsenceType,
					start_date: startDate,
					end_date: effectiveEndDate,
					day_fraction: dayFraction,
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
					end_date: effectiveEndDate,
					day_fraction: dayFraction,
					is_recurring: isRecurring,
					rrule,
					notes: notes || null
				});
			}

			open = false;
			onAbsenceAdded();
		} catch (error) {
			console.error('[AbsenceForm] Failed to save:', error);
			submitError = error instanceof Error ? error.message : m.error_save_absence_failed();
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
			await absenceStore.delete(absenceToEdit.id);
			deleteDialogOpen = false;
			open = false;
			onAbsenceAdded();
		} catch (error) {
			console.error('[AbsenceForm] Failed to delete:', error);
			deleteError = error instanceof Error ? error.message : m.error_delete_absence_failed();
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
			<Alert variant="error" class="mb-4">
				<AlertCircle class="mt-0.5 h-5 w-5 shrink-0" />
				<div class="flex-1">
					<p class="text-sm font-medium">{m.error_label()}</p>
					<p class="text-sm">{submitError}</p>
				</div>
			</Alert>
		{/if}

		{#if isLocked}
			<Alert variant="warning" class="mb-4">
				<Lock class="mt-0.5 h-5 w-5 shrink-0" />
				<div class="flex-1">
					<p class="text-sm font-medium">{m.entry_locked_title()}</p>
					<p class="text-sm">{m.entry_locked_tooltip({ days: EDIT_WINDOW_DAYS })}</p>
				</div>
			</Alert>
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
								if (!type.recurring && isRecurring) {
									toggleRecurring(false);
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
					<div class="grid gap-3 {isRecurring ? 'sm:grid-cols-1' : 'sm:grid-cols-2'}">
						<div class="grid gap-2">
							<Label for="startDate"
								>{m.absence_start_date_label()} <span class="text-destructive">*</span></Label
							>
							<Input id="startDate" type="date" lang={dateLocale} bind:value={startDate} required />
						</div>
						{#if !isRecurring}
							<div class="grid gap-2">
								<Label for="endDate"
									>{m.absence_end_date_label()} <span class="text-destructive">*</span></Label
								>
								<Input id="endDate" type="date" lang={dateLocale} bind:value={endDate} required />
							</div>
						{/if}
					</div>
					{#if startDate && startDate === endDate}
						<div class="flex items-center gap-2">
							<input
								id="halfDay"
								type="checkbox"
								checked={dayFraction < 1}
								onchange={(e) => (dayFraction = e.currentTarget.checked ? 0.5 : 1)}
								class="h-4 w-4 rounded border-border accent-primary"
							/>
							<Label for="halfDay" class="cursor-pointer font-medium"
								>{m.absence_half_day_label()}</Label
							>
						</div>
					{/if}
					{#if rangeWeekdayCount !== null}
						<p class="text-xs text-muted-foreground">
							{rangeWeekdayCount === 1
								? m.absence_workday_count_one({ count: rangeWeekdayCount })
								: m.absence_workday_count({ count: rangeWeekdayCount })}
						</p>
					{/if}
				</div>

				{@const selectedType = absenceTypes.find((t) => t.id === selectedAbsenceType)}
				{#if selectedType?.recurring}
					<div class="grid gap-3 rounded-lg border border-border bg-muted/20 p-4">
						<div class="flex items-center gap-2">
							<input
								id="recurring"
								type="checkbox"
								checked={isRecurring}
								onchange={(e) => toggleRecurring(e.currentTarget.checked)}
								class="h-4 w-4 rounded border-border accent-primary"
							/>
							<Label for="recurring" class="cursor-pointer font-medium">{m.recurring_label()}</Label
							>
						</div>
						<p class="text-xs text-muted-foreground">{m.recurring_description()}</p>

						{#if showRecurrenceOptions}
							<div class="mt-2 grid gap-3">
								<div class="grid gap-2">
									<Label>{m.recurring_frequency_label()}</Label>
									<SegmentedControl
										items={[
											{ value: 'daily', label: m.recurring_frequency_daily() },
											{ value: 'weekly', label: m.recurring_frequency_weekly() }
										]}
										value={recurrenceFrequency}
										onSelect={(v) => (recurrenceFrequency = v as typeof recurrenceFrequency)}
									/>
								</div>

								{#if recurrenceFrequency === 'weekly'}
									<div class="grid gap-2">
										<Label>{m.recurring_days_of_week()}</Label>
										<SegmentedControl
											class="flex-wrap"
											buttonClass="min-w-[2.5rem] px-2 py-1 text-xs"
											items={weekdays.map((day) => ({
												value: String(day.value),
												label: day.short,
												disabled: !isSelectableWeekday(day.value)
											}))}
											selected={selectedDays.map(String)}
											onToggle={(v) => toggleDay(Number(v))}
										/>
									</div>
								{/if}

								<div class="grid gap-2">
									<Label for="recurrenceUntil">{m.recurring_until()}</Label>
									<Input
										id="recurrenceUntil"
										type="date"
										lang={dateLocale}
										bind:value={recurrenceUntil}
									/>
								</div>

								<div class="grid gap-2">
									<Label>{m.recurring_preview({ count: previewDates.length })}</Label>
									<div class="flex flex-wrap gap-1">
										{#each previewDates as date (date)}
											<span class="rounded bg-primary/10 px-2 py-0.5 text-xs text-primary">
												{new Date(`${date}T12:00:00`).toLocaleDateString(dateLocale, {
													month: 'short',
													day: 'numeric'
												})}
											</span>
										{/each}
										{#if previewDates.length >= 6}
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
					disabled={isSubmitting || isDeleting || isLocked}
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
					disabled={!isValid || !canSubmitRecurring || isSubmitting || isLocked}
				>
					{#if isSubmitting}
						<span class="flex items-center gap-2">
							<Spinner size="sm" />
							{m.saving()}
						</span>
					{:else}
						{absenceToEdit ? m.save_changes_button() : m.log_absence_button()}
					{/if}
				</Button>
			</div>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<ConfirmDialog
	bind:open={deleteDialogOpen}
	title={m.delete_absence_title()}
	confirmLabel={absenceToEdit?.is_recurring
		? m.delete_absence_all()
		: m.delete_activity_confirm_button()}
	cancelLabel={m.cancel()}
	variant="destructive"
	loading={isDeleting}
	onConfirm={() => {
		deleteChoice = 'all';
		handleDelete();
	}}
>
	{#if deleteError}
		<Alert variant="error">{deleteError}</Alert>
	{/if}
	<p class="text-sm text-muted-foreground">
		{absenceToEdit?.is_recurring
			? m.delete_absence_recurring_confirm()
			: m.delete_absence_confirm()}
	</p>
</ConfirmDialog>

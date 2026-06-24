<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { ConfirmDialog } from '$lib/components/ui/confirm-dialog';
	import { Alert } from '$lib/components/ui/alert';
	import { Badge } from '$lib/components/ui/badge';
	import { EmptyState } from '$lib/components/ui/empty-state';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import Calendar from '@lucide/svelte/icons/calendar';
	import Clock from '@lucide/svelte/icons/clock';
	import Star from '@lucide/svelte/icons/star';
	import Pencil from '@lucide/svelte/icons/pencil';
	import MapPin from '@lucide/svelte/icons/map-pin';
	import { activityStore } from '$lib/activityStorage';
	import { absenceStore, isDateInAbsence } from '$lib/absenceStorage';
	import type { ActivityRecord, AbsenceRecord } from '$lib/types';
	import * as m from '$lib/paraglide/messages.js';
	import { getDateLocale } from '$lib/dateLocale';
	import { formatHoursMinutes, isWithinEditWindow, isAbsenceWithinEditWindow } from '$lib/utils';
	import { getAbsenceTypeLabel } from '$lib/absence-types';

	const dateLocale = $derived(getDateLocale());

	let {
		onRefresh,
		onAbsenceRefresh,
		selectedDate,
		existingAbsences = [],
		onEdit,
		onEditAbsence
	}: {
		onRefresh: () => void;
		onAbsenceRefresh?: () => void;
		selectedDate?: string;
		existingAbsences?: AbsenceRecord[];
		onEdit?: (activity: ActivityRecord) => void;
		onEditAbsence?: (absence: AbsenceRecord) => void;
	} = $props();

	const activities = $derived($activityStore);

	const filteredActivities = $derived(
		selectedDate
			? activities.filter((activity) => activity.entry_date === selectedDate)
			: activities
	);

	const filteredAbsences = $derived(
		selectedDate
			? existingAbsences.filter((absence) => isDateInAbsence(selectedDate, absence))
			: existingAbsences
	);

	const sortedEntries = $derived(() => {
		const activityEntries = filteredActivities.map((a) => ({
			type: 'activity' as const,
			id: a.id,
			date: a.entry_date,
			data: a
		}));
		const absenceEntries = filteredAbsences.map((a) => ({
			type: 'absence' as const,
			id: a.id,
			date: a.start_date,
			data: a
		}));
		return [...activityEntries, ...absenceEntries].sort((x, y) => {
			if (x.date !== y.date) {
				return x.date.localeCompare(y.date);
			}
			return x.type === 'absence' ? -1 : 1;
		});
	});

	let deleteDialogOpen = $state(false);
	let activityToDeleteId = $state<string | null>(null);
	let deleteError = $state('');

	function requestDelete(id: string) {
		activityToDeleteId = id;
		deleteError = '';
		deleteDialogOpen = true;
	}

	async function confirmDelete() {
		if (!activityToDeleteId) return;
		try {
			await activityStore.delete(activityToDeleteId);
			deleteDialogOpen = false;
			activityToDeleteId = null;
			onRefresh();
		} catch (error) {
			console.error('[ActivityList] Exception deleting:', error);
			deleteError = error instanceof Error ? error.message : 'Failed to delete activity';
		}
	}

	async function handleDeleteAbsence(id: string) {
		if (confirm(m.delete_absence_confirm())) {
			try {
				await absenceStore.delete(id);
				onAbsenceRefresh?.();
			} catch (error) {
				console.error('[ActivityList] Exception deleting:', error);
				alert(error instanceof Error ? error.message : 'Failed to delete absence');
			}
		}
	}

	function formatDate(dateStr: string): string {
		const date = new Date(`${dateStr}T12:00:00`);
		return date.toLocaleDateString(dateLocale, {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		});
	}

	const selectedDateLabel = $derived(selectedDate ? formatDate(selectedDate) : null);
	const hasEntries = $derived(filteredActivities.length > 0 || filteredAbsences.length > 0);
</script>

<div class="flex h-full flex-col">
	{#if activities.length === 0 && existingAbsences.length === 0}
		<EmptyState
			icon={Calendar}
			class="flex-1"
			title={m.no_activities_found()}
			hint={m.start_by_logging_first_activity()}
		/>
	{:else if !hasEntries}
		<EmptyState
			icon={Calendar}
			class="flex-1"
			title={m.no_activities_for_date({ date: selectedDateLabel ?? '' })}
			hint={m.no_activities_for_date_hint()}
		/>
	{:else}
		<div class="space-y-2 p-2 sm:space-y-3 sm:p-3">
			{#each sortedEntries() as entry (entry.type === 'activity' ? `activity-${entry.id}` : `absence-${entry.id}`)}
				{#if entry.type === 'activity'}
					{@const activity = entry.data}
					<div
						class="group relative flex flex-col gap-2 rounded-lg border border-l-4 border-border border-l-transparent bg-card p-2 shadow-sm transition-all hover:border-l-primary hover:bg-accent/40 hover:shadow-md sm:flex-row sm:items-center sm:gap-4 sm:p-3"
					>
						<!-- Activity Info -->
						<div class="min-w-0 flex-1 pr-16 sm:pr-0">
							<div class="mb-1 flex flex-wrap items-center gap-1 sm:gap-2">
								<span class="font-mono text-xs text-muted-foreground">{activity.activity_key}</span>
								<span class="text-sm font-semibold text-foreground">{activity.activity_name}</span>
								{#if activity.activity_label}
									<span class="text-xs text-muted-foreground">({activity.activity_label})</span>
								{/if}
							</div>
							<div
								class="flex flex-wrap items-center gap-2 text-xs text-muted-foreground sm:gap-3 sm:text-sm"
							>
								<div class="flex items-center gap-1">
									<Calendar class="h-3 w-3 sm:h-3.5 sm:w-3.5" />
									<span>{formatDate(activity.entry_date)}</span>
								</div>
								<div class="flex items-center gap-1">
									<Clock class="h-3 w-3 sm:h-3.5 sm:w-3.5" />
									<span class="font-medium">{formatHoursMinutes(activity.hours)}</span>
								</div>
								{#if activity.location}
									<div class="flex items-center gap-1">
										<MapPin class="h-3 w-3 sm:h-3.5 sm:w-3.5" />
										<span class="truncate">{activity.location}</span>
									</div>
								{/if}
								{#if activity.rating}
									<div class="flex items-center gap-0.5">
										<Star class="h-3 w-3 fill-primary text-primary sm:h-3.5 sm:w-3.5" />
										<span class="font-medium text-foreground">{activity.rating}</span>
									</div>
								{/if}
							</div>
							{#if activity.notes}
								<p class="mt-1 line-clamp-2 text-xs text-muted-foreground sm:mt-2 sm:text-sm">
									{activity.notes}
								</p>
							{/if}
						</div>

						<!-- Action Buttons -->
						{#if isWithinEditWindow(activity.entry_date)}
							<div
								class="absolute top-2 right-2 flex flex-row items-center gap-0.5 sm:static sm:gap-1"
							>
								<Button
									variant="ghost"
									size="icon"
									aria-label={m.edit_activity_title()}
									onclick={() => onEdit?.(activity)}
									class="h-7 w-7 text-muted-foreground transition-opacity hover:text-foreground sm:h-9 sm:w-9 sm:opacity-0 sm:group-hover:opacity-100"
								>
									<Pencil class="h-3.5 w-3.5 sm:h-4 sm:w-4" />
								</Button>
								<Button
									variant="ghost"
									size="icon"
									aria-label={m.delete_activity_confirm_button()}
									onclick={() => requestDelete(activity.id)}
									class="flex h-7 w-7 text-muted-foreground transition-opacity hover:bg-destructive/10 hover:text-destructive sm:h-9 sm:w-9 sm:opacity-0 sm:group-hover:opacity-100"
								>
									<Trash2 class="h-3.5 w-3.5 sm:h-4 sm:w-4" />
								</Button>
							</div>
						{/if}
					</div>
				{:else}
					{@const absence = entry.data}
					<div
						class="group relative flex flex-col gap-2 rounded-lg border border-warning/30 bg-warning/5 p-2 shadow-sm backdrop-blur-sm transition-all hover:bg-warning/10 hover:shadow-md sm:flex-row sm:items-center sm:gap-4 sm:p-3"
					>
						<div class="min-w-0 flex-1 pr-10 sm:pr-0">
							<div class="mb-1.5 flex flex-wrap items-center gap-1.5">
								<Badge variant="warning">
									{getAbsenceTypeLabel(absence.absence_type_id)}
								</Badge>
								<Badge variant="warning">
									{absence.day_fraction}
									{m.absence_day_fraction_short()}
								</Badge>
								{#if absence.is_recurring}
									<Badge variant="warning">{m.recurring_label()}</Badge>
								{/if}
							</div>
							<div class="flex items-center gap-1 text-xs text-muted-foreground sm:text-sm">
								<Calendar class="h-3 w-3 shrink-0 sm:h-3.5 sm:w-3.5" />
								<span>
									{#if absence.start_date === absence.end_date}
										{formatDate(absence.start_date)}
									{:else}
										{formatDate(absence.start_date)} – {formatDate(absence.end_date)}
									{/if}
								</span>
							</div>
							{#if absence.notes}
								<p class="mt-1.5 line-clamp-2 text-xs text-muted-foreground sm:text-sm">
									{absence.notes}
								</p>
							{/if}
						</div>
						<div
							class="absolute top-2 right-2 flex flex-row items-center gap-0.5 sm:static sm:gap-1"
						>
							{#if isAbsenceWithinEditWindow(absence)}
								<Button
									variant="ghost"
									size="icon"
									onclick={() => onEditAbsence?.(absence)}
									class="h-7 w-7 text-muted-foreground transition-opacity hover:bg-accent hover:text-accent-foreground sm:h-9 sm:w-9 sm:opacity-0 sm:group-hover:opacity-100"
								>
									<Pencil class="h-3.5 w-3.5 sm:h-4 sm:w-4" />
								</Button>
								<Button
									variant="ghost"
									size="icon"
									aria-label={m.delete_absence_title()}
									onclick={() => handleDeleteAbsence(absence.id)}
									class="flex h-7 w-7 text-muted-foreground transition-opacity hover:bg-destructive/10 hover:text-destructive sm:h-9 sm:w-9 sm:opacity-0 sm:group-hover:opacity-100"
								>
									<Trash2 class="h-3.5 w-3.5 sm:h-4 sm:w-4" />
								</Button>
							{/if}
						</div>
					</div>
				{/if}
			{/each}
		</div>
	{/if}
</div>

<ConfirmDialog
	bind:open={deleteDialogOpen}
	title={m.delete_activity_confirm()}
	confirmLabel={m.delete_activity_confirm_button()}
	cancelLabel={m.cancel()}
	variant="destructive"
	onConfirm={confirmDelete}
>
	{#if deleteError}
		<Alert variant="error">{deleteError}</Alert>
	{/if}
</ConfirmDialog>

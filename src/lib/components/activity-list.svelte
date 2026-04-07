<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as AlertDialog from '$lib/components/ui/alert-dialog';
	import { Trash2, Calendar, Clock, Star, Pencil, MapPin } from 'lucide-svelte';
	import { activityStore } from '$lib/activityStorage';
	import { absenceStore } from '$lib/absenceStorage';
	import type { ActivityRecord, AbsenceRecord } from '$lib/types';
	import * as m from '$lib/paraglide/messages.js';
	import { getDateLocale } from '$lib/dateLocale';

	const dateLocale = $derived(getDateLocale());

	let {
		onRefresh,
		onAbsenceRefresh,
		selectedDate,
		onEdit,
		onEditAbsence
	}: {
		onRefresh: () => void;
		onAbsenceRefresh?: () => void;
		selectedDate?: string;
		onEdit?: (activity: ActivityRecord) => void;
		onEditAbsence?: (absence: AbsenceRecord) => void;
	} = $props();

	const activities = $derived($activityStore);

	let absences = $state<AbsenceRecord[]>([]);
	absenceStore.subscribe((data) => {
		absences = data;
	});

	$effect(() => {
		absenceStore.load();
	});

	const filteredActivities = $derived(
		selectedDate
			? activities.filter((activity) => activity.entry_date === selectedDate)
			: activities
	);

	const filteredAbsences = $derived(
		selectedDate
			? absences.filter(
					(absence) =>
						selectedDate >= absence.start_date &&
						selectedDate <= absence.end_date &&
						(!absence.is_recurring || absence.start_date === absence.end_date)
				)
			: absences
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
			date: a.entry_date,
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

	function formatTime(hours: number): string {
		if (hours > 0) {
			return `${hours}h`;
		}
		return '0h';
	}

	function getAbsenceTypeLabel(typeId: string): string {
		switch (typeId) {
			case 'sick':
				return m.absence_type_sick();
			case 'vacation':
				return m.absence_type_vacation();
			case 'military':
				return m.absence_type_military();
			case 'uk':
				return m.absence_type_uk();
			case 'berufsschule':
				return m.absence_type_berufsschule();
			case 'custom':
				return m.absence_type_custom();
			default:
				return typeId;
		}
	}

	const selectedDateLabel = $derived(selectedDate ? formatDate(selectedDate) : null);
	const hasEntries = $derived(filteredActivities.length > 0 || filteredAbsences.length > 0);
</script>

<div class="flex h-full flex-col">
	{#if activities.length === 0 && absences.length === 0}
		<div class="flex-1 rounded-lg border border-border bg-muted/30 p-6 text-center sm:p-12">
			<div
				class="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground sm:gap-3"
			>
				<Calendar class="h-8 w-8 sm:h-12 sm:w-12" />
				<p class="text-base font-medium sm:text-lg">{m.no_activities_found()}</p>
				<p class="text-xs sm:text-sm">{m.start_by_logging_first_activity()}</p>
			</div>
		</div>
	{:else if !hasEntries}
		<div class="flex-1 rounded-lg border border-border bg-muted/30 p-6 text-center sm:p-12">
			<div
				class="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground sm:gap-3"
			>
				<Calendar class="h-8 w-8 sm:h-12 sm:w-12" />
				<p class="text-base font-medium sm:text-lg">
					{m.no_activities_for_date({ date: selectedDateLabel ?? '' })}
				</p>
				<p class="text-xs sm:text-sm">{m.no_activities_for_date_hint()}</p>
			</div>
		</div>
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
									<span class="font-medium">{formatTime(activity.hours)}</span>
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
						<div
							class="absolute top-2 right-2 flex flex-col items-center gap-0.5 sm:static sm:flex-row sm:gap-1"
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
								class="hidden h-7 w-7 text-muted-foreground transition-opacity hover:bg-destructive/10 hover:text-destructive sm:flex sm:h-9 sm:w-9 sm:opacity-0 sm:group-hover:opacity-100"
							>
								<Trash2 class="h-3.5 w-3.5 sm:h-4 sm:w-4" />
							</Button>
						</div>
					</div>
				{:else}
					{@const absence = entry.data}
					<div
						class="group relative flex flex-col gap-2 rounded-lg border border-orange-200 bg-orange-50/60 p-2 shadow-sm backdrop-blur-sm transition-all hover:bg-orange-100/80 hover:shadow-md sm:flex-row sm:items-center sm:gap-4 sm:p-3"
					>
						<div class="min-w-0 flex-1 pr-10 sm:pr-0">
							<div class="mb-1.5 flex flex-wrap items-center gap-1.5">
								<span
									class="rounded-full bg-orange-200 px-2 py-0.5 text-xs font-medium text-orange-700"
								>
									{getAbsenceTypeLabel(absence.absence_type_id)}
								</span>
								{#if absence.is_recurring}
									<span
										class="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-600"
									>
										{m.recurring_label()}
									</span>
								{/if}
							</div>
							<div class="flex items-center gap-1 text-xs text-stone-600 sm:text-sm">
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
								<p class="mt-1.5 line-clamp-2 text-xs text-stone-600 sm:text-sm">
									{absence.notes}
								</p>
							{/if}
						</div>
						<div
							class="absolute top-2 right-2 flex flex-col items-center gap-0.5 sm:static sm:flex-row sm:gap-1"
						>
							<Button
								variant="ghost"
								size="icon"
								onclick={() => onEditAbsence?.(absence)}
								class="h-7 w-7 text-stone-400 transition-opacity hover:bg-blue-50 hover:text-blue-500 sm:h-9 sm:w-9 sm:opacity-0 sm:group-hover:opacity-100"
							>
								<Pencil class="h-3.5 w-3.5 sm:h-4 sm:w-4" />
							</Button>
							<Button
								variant="ghost"
								size="icon"
								onclick={() => handleDeleteAbsence(absence.id)}
								class="hidden h-7 w-7 text-stone-400 transition-opacity hover:bg-red-50 hover:text-red-500 sm:flex sm:h-9 sm:w-9 sm:opacity-0 sm:group-hover:opacity-100"
							>
								<Trash2 class="h-3.5 w-3.5 sm:h-4 sm:w-4" />
							</Button>
						</div>
					</div>
				{/if}
			{/each}
		</div>
	{/if}
</div>

<AlertDialog.Root bind:open={deleteDialogOpen}>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>{m.delete_activity_confirm()}</AlertDialog.Title>
			{#if deleteError}
				<AlertDialog.Description class="text-red-500">{deleteError}</AlertDialog.Description>
			{/if}
		</AlertDialog.Header>
		<AlertDialog.Footer>
			<AlertDialog.Cancel>{m.cancel()}</AlertDialog.Cancel>
			<AlertDialog.Action
				onclick={confirmDelete}
				class="text-destructive-foreground bg-destructive hover:bg-destructive/90"
			>
				<Trash2 class="mr-2 h-4 w-4" />
				{m.delete_activity_confirm_button()}
			</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>

<style>
	@keyframes slideIn {
		from {
			opacity: 0;
			transform: translateY(-10px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
</style>

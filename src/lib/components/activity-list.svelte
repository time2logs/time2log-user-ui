<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Trash2, Calendar, Clock, Star, Pencil, AlertCircle } from 'lucide-svelte';
	import { activityStore } from '$lib/activityStorage';
	import { absenceStore } from '$lib/absenceStorage';
	import type { ActivityRecord, AbsenceRecord } from '$lib/types';
	import * as m from '$lib/paraglide/messages.js';

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

	let activities = $state<ActivityRecord[]>([]);
	activityStore.subscribe((data) => {
		activities = data;
	});

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

	const filteredActivities = $derived(
		selectedDate
			? activities.filter((activity) => activity.entry_date === selectedDate)
			: activities
	);

	const filteredAbsences = $derived(
		selectedDate ? absences.filter((absence) => absence.entry_date === selectedDate) : absences
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

	async function handleDelete(id: string) {
		if (confirm(m.delete_activity_confirm())) {
			try {
				await activityStore.delete(id);
				onRefresh();
			} catch (error) {
				console.error('[ActivityList] Exception deleting:', error);
				alert(error instanceof Error ? error.message : 'Failed to delete activity');
			}
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
		return date.toLocaleDateString('en-US', {
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

<div class="space-y-4">
	{#if activities.length === 0 && absences.length === 0}
		<div
			class="rounded-lg border border-stone-200 bg-white/60 p-12 text-center shadow-sm backdrop-blur-sm"
		>
			<div class="flex flex-col items-center gap-3 text-stone-400">
				<Calendar class="h-12 w-12" />
				<p class="text-lg font-medium">{m.no_activities_found()}</p>
				<p class="text-sm">{m.start_by_logging_first_activity()}</p>
			</div>
		</div>
	{:else if !hasEntries}
		<div
			class="rounded-lg border border-stone-200 bg-white/60 p-12 text-center shadow-sm backdrop-blur-sm"
		>
			<div class="flex flex-col items-center gap-3 text-stone-400">
				<Calendar class="h-12 w-12" />
				<p class="text-lg font-medium">No activities logged for {selectedDateLabel}.</p>
				<p class="text-sm">Choose another workday or add an activity for this date.</p>
			</div>
		</div>
	{:else}
		<div class="space-y-2">
			{#each sortedEntries() as entry (entry.type === 'activity' ? `activity-${entry.id}` : `absence-${entry.id}`)}
				{#if entry.type === 'activity'}
					{@const activity = entry.data}
					<div
						class="group flex items-center gap-4 rounded-lg border border-stone-200 bg-white/60 p-4 shadow-sm backdrop-blur-sm transition-all hover:bg-white/80 hover:shadow-md"
						style="animation: slideIn 0.3s ease-out"
					>
						<div class="min-w-0 flex-1">
							<div class="mb-1 flex items-center gap-2">
								<span class="font-mono text-xs text-stone-500">{activity.activity_key}</span>
								<span class="text-sm font-semibold text-stone-800">{activity.activity_name}</span>
								{#if activity.activity_label}
									<span class="text-xs text-stone-500">({activity.activity_label})</span>
								{/if}
							</div>
							<div class="flex items-center gap-3 text-sm text-stone-600">
								<div class="flex items-center gap-1">
									<Calendar class="h-3.5 w-3.5" />
									<span>{formatDate(activity.entry_date)}</span>
								</div>
								<div class="flex items-center gap-1">
									<Clock class="h-3.5 w-3.5" />
									<span class="font-medium">{formatTime(activity.hours)}</span>
								</div>
								{#if activity.rating}
									<div class="flex items-center gap-0.5">
										<Star class="h-3.5 w-3.5 fill-orange-400 text-orange-400" />
										<span class="font-medium">{activity.rating}</span>
									</div>
								{/if}
							</div>
							{#if activity.notes}
								<p class="mt-2 line-clamp-2 text-sm text-stone-600">{activity.notes}</p>
							{/if}
						</div>
						<div class="flex items-center gap-1">
							<Button
								variant="ghost"
								size="icon"
								onclick={() => onEdit?.(activity)}
								class="text-stone-400 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-blue-50 hover:text-blue-500"
							>
								<Pencil class="h-4 w-4" />
							</Button>
							<Button
								variant="ghost"
								size="icon"
								onclick={() => handleDelete(activity.id)}
								class="text-stone-400 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-red-50 hover:text-red-500"
							>
								<Trash2 class="h-4 w-4" />
							</Button>
						</div>
					</div>
				{:else}
					{@const absence = entry.data}
					<div
						class="group flex items-center gap-4 rounded-lg border border-orange-200 bg-orange-50/60 p-4 shadow-sm backdrop-blur-sm transition-all hover:bg-orange-100/80 hover:shadow-md"
						style="animation: slideIn 0.3s ease-out"
					>
						<div class="min-w-0 flex-1">
							<div class="mb-1 flex items-center gap-2">
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
							<div class="flex items-center gap-3 text-sm text-stone-600">
								<div class="flex items-center gap-1">
									<Calendar class="h-3.5 w-3.5" />
									<span>{formatDate(absence.entry_date)}</span>
								</div>
								<AlertCircle class="h-3.5 w-3.5 text-orange-500" />
								<span class="font-medium text-orange-600">{m.absence_label()}</span>
							</div>
							{#if absence.notes}
								<p class="mt-2 line-clamp-2 text-sm text-stone-600">{absence.notes}</p>
							{/if}
						</div>
						<div class="flex items-center gap-1">
							<Button
								variant="ghost"
								size="icon"
								onclick={() => onEditAbsence?.(absence)}
								class="text-stone-400 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-blue-50 hover:text-blue-500"
							>
								<Pencil class="h-4 w-4" />
							</Button>
							<Button
								variant="ghost"
								size="icon"
								onclick={() => handleDeleteAbsence(absence.id)}
								class="text-stone-400 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-red-50 hover:text-red-500"
							>
								<Trash2 class="h-4 w-4" />
							</Button>
						</div>
					</div>
				{/if}
			{/each}
		</div>
	{/if}
</div>

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

<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as AlertDialog from '$lib/components/ui/alert-dialog';
	import { Trash2, Calendar, Clock, Star, Pencil, MapPin } from 'lucide-svelte';
	import { activityStore } from '$lib/activityStorage';
	import type { ActivityRecord } from '$lib/types';
	import * as m from '$lib/paraglide/messages.js';

	let {
		onRefresh,
		selectedDate,
		onEdit
	}: {
		onRefresh: () => void;
		selectedDate?: string;
		onEdit?: (activity: ActivityRecord) => void;
	} = $props();

	const activities = $derived($activityStore);

	const filteredActivities = $derived(
		selectedDate
			? activities.filter((activity) => activity.entry_date === selectedDate)
			: activities
	);

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

	const selectedDateLabel = $derived(selectedDate ? formatDate(selectedDate) : null);
</script>

<div class="space-y-4">
	<!-- Activity List -->
	{#if activities.length === 0}
		<div class="rounded-lg border border-border bg-muted/30 p-12 text-center">
			<div class="flex flex-col items-center gap-3 text-muted-foreground">
				<Calendar class="h-12 w-12" />
				<p class="text-lg font-medium">{m.no_activities_found()}</p>
				<p class="text-sm">{m.start_by_logging_first_activity()}</p>
			</div>
		</div>
	{:else if filteredActivities.length === 0}
		<div class="rounded-lg border border-border bg-muted/30 p-12 text-center">
			<div class="flex flex-col items-center gap-3 text-muted-foreground">
				<Calendar class="h-12 w-12" />
				<p class="text-lg font-medium">
					{m.no_activities_for_date({ date: selectedDateLabel ?? '' })}
				</p>
				<p class="text-sm">{m.no_activities_for_date_hint()}</p>
			</div>
		</div>
	{:else}
		<div class="space-y-3 p-2">
			{#each filteredActivities as activity (activity.id)}
				<div
					class="group flex items-center gap-4 rounded-lg border border-l-4 border-border border-l-transparent bg-card p-4 shadow-sm transition-all hover:border-l-primary hover:bg-accent/40 hover:shadow-md"
				>
					<!-- Activity Info -->
					<div class="min-w-0 flex-1">
						<div class="mb-1 flex items-center gap-2">
							<span class="font-mono text-xs text-muted-foreground">{activity.activity_key}</span>
							<span class="text-sm font-semibold text-foreground">{activity.activity_name}</span>
							{#if activity.activity_label}
								<span class="text-xs text-muted-foreground">({activity.activity_label})</span>
							{/if}
						</div>
						<div class="flex items-center gap-3 text-sm text-muted-foreground">
							<div class="flex items-center gap-1">
								<Calendar class="h-3.5 w-3.5" />
								<span>{formatDate(activity.entry_date)}</span>
							</div>
							<div class="flex items-center gap-1">
								<Clock class="h-3.5 w-3.5" />
								<span class="font-medium">{formatTime(activity.hours)}</span>
							</div>
							{#if activity.location}
								<div class="flex items-center gap-1">
									<MapPin class="h-3.5 w-3.5" />
									<span>{activity.location}</span>
								</div>
							{/if}
							{#if activity.rating}
								<div class="flex items-center gap-0.5">
									<Star class="h-3.5 w-3.5 fill-primary text-primary" />
									<span class="font-medium text-foreground">{activity.rating}</span>
								</div>
							{/if}
						</div>
						{#if activity.notes}
							<p class="mt-2 line-clamp-2 text-sm text-muted-foreground">
								{activity.notes}
							</p>
						{/if}
					</div>

					<!-- Action Buttons -->
					<div class="flex items-center gap-1">
						<Button
							variant="ghost"
							size="icon"
							aria-label={m.edit_activity_title()}
							onclick={() => onEdit?.(activity)}
							class="text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-foreground"
						>
							<Pencil class="h-4 w-4" />
						</Button>
						<Button
							variant="ghost"
							size="icon"
							aria-label={m.delete_activity_confirm_button()}
							onclick={() => requestDelete(activity.id)}
							class="text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive"
						>
							<Trash2 class="h-4 w-4" />
						</Button>
					</div>
				</div>
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

<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import * as AlertDialog from '$lib/components/ui/alert-dialog';
	import { Button } from '$lib/components/ui/button';
	import * as Select from '$lib/components/ui/select';
	import { Label } from '$lib/components/ui/label';
	import { Input } from '$lib/components/ui/input';
	type Depth = number;
	import { Textarea } from '$lib/components/ui/textarea';
	import {
		activityStore,
		getLastActivityId,
		getLastLocation,
		MAX_HOURS_PER_ENTRY,
		MAX_HOURS_PER_DAY,
		MIN_HOURS
	} from '$lib/activityStorage';
	import type { ActivityRecord, CurriculumNode, CurriculumTreeNode, TeamMember } from '$lib/types';
	import {
		Star,
		ChevronRight,
		ChevronDown,
		Folder,
		FileText,
		Check,
		AlertCircle,
		Trash2
	} from 'lucide-svelte';
	import * as m from '$lib/paraglide/messages.js';
	import { getDateLocale } from '$lib/dateLocale';

	import { SvelteSet } from 'svelte/reactivity';
	import { buildTree } from '$lib/curriculumTree';

	const dateLocale = $derived(getDateLocale());

	let {
		open = $bindable(),
		curriculumNodes,
		teamMember,
		onActivityAdded,
		selectedDate,
		activityToEdit = null,
		existingActivities = [],
		userLocations = []
	}: {
		open: boolean;
		curriculumNodes: CurriculumNode[];
		teamMember: TeamMember | null;
		onActivityAdded: () => void;
		selectedDate?: string;
		activityToEdit?: ActivityRecord | null;
		existingActivities?: ActivityRecord[];
		userLocations?: string[];
	} = $props();

	const tree = $derived(buildTree(curriculumNodes));

	// Get all activity nodes for pre-selection
	const activityNodes = $derived(curriculumNodes.filter((node) => node.node_type === 'activity'));

	let expanded = new SvelteSet<string>();
	let selectedActivityId = $state<string>('');
	let rating = $state<number>(0);
	let hours = $state<number>(0);
	let location = $state<string>('');
	let notes = $state<string>('');
	let isSubmitting = $state(false);
	let hasInitialized = $state(false);
	let submitError = $state<string | null>(null);
	let deleteDialogOpen = $state(false);
	let isDeleting = $state(false);
	let deleteError = $state<string | null>(null);

	// Pre-fill with last activity or edit activity when dialog opens
	$effect(() => {
		if (open && !hasInitialized) {
			if (activityToEdit) {
				selectedActivityId = activityToEdit.curriculum_activity_id;
				rating = activityToEdit.rating || 0;
				hours = activityToEdit.hours;
				location = activityToEdit.location || '';
				notes = activityToEdit.notes || '';
			} else {
				const lastActivityId = getLastActivityId();
				if (lastActivityId && activityNodes.find((n) => n.id === lastActivityId)) {
					selectedActivityId = lastActivityId;
				} else if (activityNodes.length > 0) {
					selectedActivityId = activityNodes[0].id;
				}
				rating = 0;
				hours = 0;
				const lastLoc = getLastLocation();
				location = (lastLoc && userLocations?.includes(lastLoc)) ? lastLoc : (userLocations?.[0] ?? '');
				notes = '';
			}
			// Auto-expand all categories to show activities
			expanded.clear();
			submitError = null;
			hasInitialized = true;
		} else if (!open) {
			hasInitialized = false;
		}
	});

	const selectedActivity = $derived(activityNodes.find((n) => n.id === selectedActivityId));

	function toggleExpand(id: string) {
		if (expanded.has(id)) {
			expanded.delete(id);
		} else {
			expanded.add(id);
		}
	}

	function selectActivity(id: string) {
		selectedActivityId = id;
	}

	async function handleSubmit() {
		if (!selectedActivity || hours === 0 || isSubmitting) return;
		if (!teamMember) {
			submitError = 'Team information not found. Please contact support.';
			return;
		}

		if (hours < MIN_HOURS) {
			submitError = m.error_hours_min({ min: MIN_HOURS.toString() });
			return;
		}

		if (hours > MAX_HOURS_PER_ENTRY) {
			submitError = m.error_hours_max_entry({ max: MAX_HOURS_PER_ENTRY.toString() });
			return;
		}

		if (wouldExceedDailyMax) {
			const remaining = MAX_HOURS_PER_DAY - currentDayHours;
			submitError = m.error_hours_max_day({
				max: MAX_HOURS_PER_DAY.toString(),
				remaining: remaining > 0 ? remaining.toString() : '0'
			});
			return;
		}

		isSubmitting = true;
		submitError = null;

		try {
			if (activityToEdit) {
				const updateData = {
					curriculum_activity_id: selectedActivity.id,
					entry_date: selectedDate || activityToEdit.entry_date,
					hours,
					notes: notes || null,
					rating: rating || null,
					location,
					activity_name: selectedActivity.label,
					activity_key: selectedActivity.key,
					activity_label: ''
				};

				if (updateData.hours <= 0) {
					throw new Error('Hours must be greater than 0');
				}

				if (!updateData.location.trim()) {
					throw new Error('Location is required');
				}

				if (updateData.rating !== null && (updateData.rating < 1 || updateData.rating > 5)) {
					throw new Error('Rating must be between 1 and 5');
				}

				await activityStore.update(activityToEdit.id, updateData);
			} else {
				const activityData = {
					organization_id: teamMember.organization_id || '',
					profession_id: teamMember.profession_id || '',
					user_id: teamMember.user_id || '',
					team_id: teamMember.team_id || null,
					curriculum_activity_id: selectedActivity.id,
					entry_date: selectedDate || new Date().toISOString().split('T')[0],
					hours,
					notes: notes || null,
					rating: rating || null,
					location,
					activity_name: selectedActivity.label,
					activity_key: selectedActivity.key,
					activity_label: ''
				};

				if (!activityData.organization_id || !activityData.profession_id || !activityData.user_id) {
					throw new Error('Missing required user information');
				}

				if (activityData.hours <= 0) {
					throw new Error('Hours must be greater than 0');
				}

				if (!activityData.location.trim()) {
					throw new Error('Location is required');
				}

				if (activityData.rating !== null && (activityData.rating < 1 || activityData.rating > 5)) {
					throw new Error('Rating must be between 1 and 5');
				}

				await activityStore.add(activityData);
			}

			open = false;
			onActivityAdded();
		} catch (error) {
			submitError =
				error instanceof Error ? error.message : 'Failed to save activity. Please try again.';
		} finally {
			isSubmitting = false;
		}
	}

	function setRating(value: number) {
		rating = value;
	}

	async function handleDelete() {
		if (!activityToEdit) return;

		isDeleting = true;
		deleteError = null;

		try {
			await activityStore.delete(activityToEdit.id);
			deleteDialogOpen = false;
			open = false;
			onActivityAdded();
		} catch (error) {
			deleteError = error instanceof Error ? error.message : 'Failed to delete activity';
		} finally {
			isDeleting = false;
		}
	}

	const hoursExceedsMax = $derived(hours > MAX_HOURS_PER_ENTRY);
	const currentDayHours = $derived(
		existingActivities
			.filter((a) => a.entry_date === (selectedDate || new Date().toISOString().split('T')[0]))
			.reduce((sum, a) => {
				if (activityToEdit && a.id === activityToEdit.id) return sum;
				return sum + a.hours;
			}, 0)
	);
	const wouldExceedDailyMax = $derived(currentDayHours + hours > MAX_HOURS_PER_DAY);
	const isValid = $derived(
		selectedActivityId &&
			hours >= MIN_HOURS &&
			!hoursExceedsMax &&
			!wouldExceedDailyMax &&
			location.trim() &&
			!isSubmitting
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
</script>

<Dialog.Root bind:open>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title
				>{activityToEdit ? m.edit_activity_title() : m.log_activity_title()}</Dialog.Title
			>
			<Dialog.Description
				>{activityToEdit
					? m.edit_activity_description()
					: m.log_activity_description()}</Dialog.Description
			>
		</Dialog.Header>

		<!-- Error Display -->
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
			{#if selectedDateLabel}
				<div
					class="rounded-lg border border-border bg-muted/50 px-4 py-3 text-sm text-muted-foreground"
				>
					{m.activity_saved_for_date({ date: selectedDateLabel })}
				</div>
			{/if}

			<!-- Activity Tree Selector -->
			<div class="grid gap-2">
				<Label>{m.activity_label()}</Label>
				<div class="rounded-lg border border-border bg-card shadow-sm">
					{#if tree.length === 0}
						<div class="flex h-32 items-center justify-center">
							<p class="text-muted-foreground">{m.no_activities_available()}</p>
						</div>
					{:else}
						<div class="max-h-64 divide-y divide-border overflow-y-auto">
							{#snippet treeNode(node: CurriculumTreeNode, depth: Depth = 0)}
								{#if node.node_type === 'category'}
									<button
										type="button"
										class="flex w-full items-center gap-2 px-4 py-2 text-left transition-colors hover:bg-accent"
										style="padding-left: {depth * 20 + 12}px"
										onclick={() => toggleExpand(node.id)}
									>
										{#if expanded.has(node.id)}
											<ChevronDown class="pointer-events-none h-4 w-4 text-muted-foreground" />
										{:else}
											<ChevronRight class="pointer-events-none h-4 w-4 text-muted-foreground" />
										{/if}
										<Folder class="pointer-events-none h-4 w-4 text-primary" />
										<span class="font-mono text-sm text-muted-foreground">{node.key}</span>
										<span class="text-sm font-medium text-foreground">{node.label}</span>
									</button>

									{#if expanded.has(node.id)}
										{#each node.children as child (child.id)}
											{@render treeNode(child, depth + 1)}
										{/each}
									{/if}
								{:else}
									<button
										type="button"
										class="flex w-full items-center gap-2 px-4 py-2 text-left transition-colors hover:bg-accent {selectedActivityId ===
										node.id
											? 'bg-accent'
											: ''}"
										style="padding-left: {depth * 20 + 32}px"
										onclick={() => selectActivity(node.id)}
									>
										<span class="w-4"></span>
										<FileText class="pointer-events-none h-4 w-4 text-muted-foreground" />
										<span class="font-mono text-sm text-muted-foreground">{node.key}</span>
										<span class="text-sm font-medium text-foreground">{node.label}</span>
										{#if selectedActivityId === node.id}
											<Check class="pointer-events-none ml-auto h-4 w-4 text-primary" />
										{/if}
									</button>
								{/if}
							{/snippet}

							{#each tree as node (node.id)}
								{@render treeNode(node, 0)}
							{/each}
						</div>
					{/if}
				</div>
				{#if selectedActivity}
					<p class="text-sm text-muted-foreground">
						{m.selected_activity({ name: `${selectedActivity.key} - ${selectedActivity.label}` })}
					</p>
				{/if}
			</div>

			<!-- Rating -->
			<div class="grid gap-2">
				<Label>{m.rating_label()}</Label>
				<div class="flex gap-1">
					{#each [1, 2, 3, 4, 5] as star (star)}
						<button
							type="button"
							onclick={() => setRating(star)}
							class="transition-transform hover:scale-110"
							aria-label="Rate {star} stars"
						>
							<Star
								class="h-6 w-6 {star <= rating
									? 'fill-primary text-primary'
									: 'fill-muted-foreground/25 text-muted-foreground/25'}"
							/>
						</button>
					{/each}
				</div>
			</div>

			<!-- Time Input -->
			<div class="grid gap-2">
				<Label for="hours">{m.hours_label()}</Label>
				<Input
					id="hours"
					type="number"
					min={MIN_HOURS}
					max={MAX_HOURS_PER_ENTRY}
					step="1"
					bind:value={hours}
					placeholder={m.hours_placeholder()}
					aria-invalid={hoursExceedsMax || wouldExceedDailyMax}
				/>
				{#if hoursExceedsMax}
					<p class="text-sm text-red-600">
						{m.error_hours_max_entry({ max: MAX_HOURS_PER_ENTRY.toString() })}
					</p>
				{:else if wouldExceedDailyMax && hours > 0}
					<p class="text-sm text-red-600">
						{m.error_hours_max_day({
							max: MAX_HOURS_PER_DAY.toString(),
							remaining: Math.max(0, MAX_HOURS_PER_DAY - currentDayHours).toString()
						})}
					</p>
				{:else if hours > 0 && hours < MIN_HOURS}
					<p class="text-sm text-amber-600">
						{m.error_hours_min({ min: MIN_HOURS.toString() })}
					</p>
				{/if}
			</div>

			<!-- Location -->
			<div class="grid gap-2">
				<Label>{m.location_label()}</Label>
				{#if userLocations.length === 0}
					<p class="text-sm text-muted-foreground">
						{m.no_locations_for_activity()}
					</p>
				{:else}
					<Select.Root bind:value={location} type="single">
						<Select.Trigger>
							{location || m.location_placeholder()}
						</Select.Trigger>
						<Select.Content>
							{#each userLocations as loc (loc)}
								<Select.Item value={loc} label={loc}>{loc}</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
				{/if}
			</div>

			<!-- Notes (Optional) -->
			<div class="grid gap-2">
				<Label for="notes">{m.notes_optional()}</Label>
				<Textarea id="notes" bind:value={notes} placeholder={m.notes_placeholder()} />
			</div>
		</div>

		<Dialog.Footer class={activityToEdit ? 'flex gap-2' : ''}>
			{#if activityToEdit}
				<Button
					variant="destructive"
					onclick={() => (deleteDialogOpen = true)}
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
				<Button variant="default" onclick={handleSubmit} disabled={!isValid || isSubmitting}>
					{#if isSubmitting}
						<span class="flex items-center gap-2">
							<span class="h-4 w-4 animate-spin">⟳</span>
							Saving...
						</span>
					{:else}
						{activityToEdit ? m.save_changes_button() : m.log_activity_button()}
					{/if}
				</Button>
			</div>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<AlertDialog.Root bind:open={deleteDialogOpen}>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>{m.delete_activity_confirm()}</AlertDialog.Title>
			{#if deleteError}
				<AlertDialog.Description class="text-red-500">{deleteError}</AlertDialog.Description>
			{/if}
		</AlertDialog.Header>
		<AlertDialog.Footer>
			<AlertDialog.Cancel disabled={isDeleting}>{m.cancel()}</AlertDialog.Cancel>
			<AlertDialog.Action
				onclick={handleDelete}
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
					{m.delete_activity_confirm_button()}
				{/if}
			</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>

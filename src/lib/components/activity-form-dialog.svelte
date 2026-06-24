<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import { ConfirmDialog } from '$lib/components/ui/confirm-dialog';
	import { Button } from '$lib/components/ui/button';
	import { Alert } from '$lib/components/ui/alert';
	import * as Select from '$lib/components/ui/select';
	import { Label } from '$lib/components/ui/label';
	import { Input } from '$lib/components/ui/input';
	import { formatHoursMinutes } from '$lib/utils';
	type Depth = number;
	import { Textarea } from '$lib/components/ui/textarea';
	import {
		activityStore,
		getLastActivityId,
		getLastLocation,
		DEFAULT_MAX_HOURS_PER_DAY,
		MIN_HOURS
	} from '$lib/activityStorage';
	import { getAbsenceFractionForDate } from '$lib/absenceStorage';
	import type {
		ActivityRecord,
		AbsenceRecord,
		CurriculumNode,
		CurriculumTreeNode,
		TeamMember
	} from '$lib/types';
	import Star from '@lucide/svelte/icons/star';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import Folder from '@lucide/svelte/icons/folder';
	import FileText from '@lucide/svelte/icons/file-text';
	import Check from '@lucide/svelte/icons/check';
	import AlertCircle from '@lucide/svelte/icons/circle-alert';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import X from '@lucide/svelte/icons/x';
	import Plus from '@lucide/svelte/icons/plus';
	import * as m from '$lib/paraglide/messages.js';
	import { addUserLocation } from '$lib/locationStorage';
	import { getCurriculumLabel } from '$lib/curriculumLabel';
	import { getDateLocale } from '$lib/dateLocale';
	import { Spinner } from '$lib/components/ui/spinner';

	import { SvelteSet } from 'svelte/reactivity';
	import { buildTree } from '$lib/curriculumTree';

	const dateLocale = $derived(getDateLocale());

	function formatHoursValue(value: number): string {
		const rounded = Math.round(value * 10) / 10;
		return Number.isInteger(rounded) ? `${rounded}` : rounded.toFixed(1);
	}

	let {
		open = $bindable(),
		curriculumNodes,
		teamMember,
		onActivityAdded,
		selectedDate,
		activityToEdit = null,
		existingActivities = [],
		userLocations = [],
		existingAbsences = []
	}: {
		open: boolean;
		curriculumNodes: CurriculumNode[];
		teamMember: TeamMember | null;
		onActivityAdded: () => void;
		selectedDate?: string;
		activityToEdit?: ActivityRecord | null;
		existingActivities?: ActivityRecord[];
		userLocations?: string[];
		existingAbsences?: AbsenceRecord[];
	} = $props();

	const tree = $derived(buildTree(curriculumNodes));

	// Get all activity nodes for pre-selection
	const activityNodes = $derived(curriculumNodes.filter((node) => node.node_type === 'activity'));

	const maxHoursPerDay = $derived(teamMember?.max_hours_per_day ?? DEFAULT_MAX_HOURS_PER_DAY);

	type PendingActivity = Omit<ActivityRecord, 'id' | 'created_at' | 'updated_at'>;

	let expanded = new SvelteSet<string>();
	let selectedActivityId = $state<string>('');
	let rating = $state<number>(0);
	let inputHours = $state<number>(0);
	let inputMinutes = $state<number>(0);
	// The Input wrapper sets `type` dynamically, so Svelte doesn't apply numeric
	// coercion on bind:value and these come back as strings. Coerce here so the
	// hours total is a real number (otherwise `inputHours + ...` concatenates).
	// Both fields must be whole numbers; otherwise a decimal typed into the hours
	// field (e.g. 8.4) would be saved on top of the minutes and inflate the total.
	const hours = $derived(
		(Math.floor(Number(inputHours)) || 0) + (Math.floor(Number(inputMinutes)) || 0) / 60
	);

	// Turn whatever the user typed into a whole number between min and max, and
	// make the field show that cleaned-up value (so "8.4" snaps back to "8").
	function cleanNumberInput(input: HTMLInputElement, min: number, max: number): number {
		const wholeNumber = Math.floor(Number(input.value) || 0);
		const withinRange = Math.min(max, Math.max(min, wholeNumber));
		if (input.value !== '' && input.value !== String(withinRange)) {
			input.value = String(withinRange);
		}
		return withinRange;
	}

	function handleHoursInput(event: Event) {
		inputHours = cleanNumberInput(event.currentTarget as HTMLInputElement, 0, maxHoursPerDay);
	}

	function handleMinutesInput(event: Event) {
		inputMinutes = cleanNumberInput(event.currentTarget as HTMLInputElement, 0, 59);
	}
	let location = $state<string>('');
	let notes = $state<string>('');
	let isSubmitting = $state(false);
	let hasInitialized = $state(false);
	let submitError = $state<string | null>(null);
	let pendingActivities = $state<PendingActivity[]>([]);
	let deleteDialogOpen = $state(false);
	let isDeleting = $state(false);
	let deleteError = $state<string | null>(null);

	// Inline location creation state
	let locationsList = $state<string[]>([]);
	let isAddingLocation = $state(false);
	let isSavingLocation = $state(false);
	let newLocationInput = $state('');
	let locationError = $state<string | null>(null);

	// Pre-fill with last activity or edit activity when dialog opens
	$effect(() => {
		if (open && !hasInitialized) {
			locationsList = [...(userLocations ?? [])];
			isAddingLocation = false;
			locationError = null;
			if (activityToEdit) {
				selectedActivityId = activityToEdit.curriculum_activity_id;
				rating = activityToEdit.rating || 0;
				inputHours = Math.floor(activityToEdit.hours);
				inputMinutes = Math.round((activityToEdit.hours % 1) * 60);
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
				inputHours = 0;
				inputMinutes = 0;
				const lastLoc = getLastLocation();
				location = lastLoc && locationsList.includes(lastLoc) ? lastLoc : (locationsList[0] ?? '');
				notes = '';
			}
			// Auto-expand all categories to show activities
			expanded.clear();
			submitError = null;
			hasInitialized = true;
		} else if (!open) {
			hasInitialized = false;
			pendingActivities = [];
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

	function startAddLocation() {
		isAddingLocation = true;
		newLocationInput = '';
		locationError = null;
	}

	function cancelAddLocation() {
		isAddingLocation = false;
		newLocationInput = '';
		locationError = null;
	}

	async function saveNewLocation() {
		const trimmed = newLocationInput.trim();
		if (!trimmed) {
			return;
		}
		if (locationsList.some((loc) => loc.toLowerCase() === trimmed.toLowerCase())) {
			locationError = m.location_already_exists();
			return;
		}
		if (!teamMember?.user_id) {
			locationError = m.error_save_location_failed();
			return;
		}

		isSavingLocation = true;
		locationError = null;
		try {
			await addUserLocation(trimmed, teamMember.user_id);
			locationsList = [...locationsList, trimmed];
			location = trimmed;
			isAddingLocation = false;
			newLocationInput = '';
		} catch (err) {
			locationError =
				err instanceof Error && err.message === 'DUPLICATE_LOCATION'
					? m.location_already_exists()
					: m.error_save_location_failed();
		} finally {
			isSavingLocation = false;
		}
	}

	function handleAddAnother() {
		if (!selectedActivity || !teamMember || !isValid) return;

		pendingActivities = [
			...pendingActivities,
			{
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
			}
		];

		inputHours = 0;
		inputMinutes = 0;
		notes = '';
		rating = 0;
		isAddingLocation = false;
		locationError = null;
		if (activityNodes.length > 0) selectedActivityId = activityNodes[0].id;
		submitError = null;
	}

	async function handleSubmit() {
		if (!selectedActivity || hours === 0 || isSubmitting) return;
		if (!teamMember) {
			submitError = m.error_team_not_found();
			return;
		}

		if (hours < MIN_HOURS) {
			submitError = m.error_hours_min({ min: MIN_HOURS.toString() });
			return;
		}

		if (hours > maxHoursPerDay) {
			submitError = m.error_hours_max_entry({ max: maxHoursPerDay.toString() });
			return;
		}

		if (wouldExceedDailyMax) {
			const remaining = maxHoursForDate - currentDayHours;
			submitError = m.error_hours_max_day({
				max: maxHoursForDate.toString(),
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
					activity_name: getCurriculumLabel(selectedActivity),
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

				await activityStore.update(activityToEdit.id, updateData, maxHoursPerDay);
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
					activity_name: getCurriculumLabel(selectedActivity),
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

				if (pendingActivities.length > 0) {
					await activityStore.addMany([...pendingActivities, activityData], maxHoursPerDay);
					pendingActivities = [];
				} else {
					await activityStore.add(activityData, maxHoursPerDay);
				}
			}

			open = false;
			onActivityAdded();
		} catch (error) {
			console.error('[ActivityForm] Failed to save:', error);
			submitError = error instanceof Error ? error.message : m.error_save_activity_failed();
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
			console.error('[ActivityForm] Failed to delete:', error);
			deleteError = error instanceof Error ? error.message : m.error_delete_activity_failed();
		} finally {
			isDeleting = false;
		}
	}

	const hoursExceedsMax = $derived(hours > maxHoursPerDay);
	const entryDate = $derived(
		selectedDate || activityToEdit?.entry_date || new Date().toISOString().split('T')[0]
	);
	const absenceFraction = $derived(getAbsenceFractionForDate(entryDate, existingAbsences));
	const blockedHoursForDate = $derived(maxHoursPerDay * absenceFraction);
	const maxHoursForDate = $derived(Math.max(0, maxHoursPerDay * (1 - absenceFraction)));
	const currentDayHours = $derived(
		existingActivities
			.filter((a) => a.entry_date === entryDate)
			.reduce((sum, a) => {
				if (activityToEdit && a.id === activityToEdit.id) return sum;
				return sum + a.hours;
			}, 0) +
			pendingActivities
				.filter((a) => a.entry_date === (selectedDate || new Date().toISOString().split('T')[0]))
				.reduce((sum, a) => sum + a.hours, 0)
	);
	const wouldExceedDailyMax = $derived(currentDayHours + hours > maxHoursForDate);
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

	function openDeleteDialog() {
		deleteDialogOpen = true;
		open = false;
	}
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
			<Alert variant="error" class="mb-4">
				<AlertCircle class="mt-0.5 h-5 w-5 shrink-0" />
				<div class="flex-1">
					<p class="text-sm font-medium">{m.error_label()}</p>
					<p class="text-sm">{submitError}</p>
				</div>
			</Alert>
		{/if}

		<div class="grid gap-4 py-4">
			{#if selectedDateLabel}
				<div
					class="rounded-lg border border-border bg-muted/50 px-4 py-3 text-sm text-muted-foreground"
				>
					{m.activity_saved_for_date({ date: selectedDateLabel })}
				</div>
			{/if}
			{#if absenceFraction > 0}
				<div
					class="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
				>
					{m.activity_hours_remaining_with_absence({
						blocked: `${formatHoursValue(blockedHoursForDate)}h`,
						available: `${formatHoursValue(maxHoursForDate)}h`
					})}
				</div>
			{/if}

			<!-- Pending activities queue -->
			{#if pendingActivities.length > 0}
				<div class="space-y-2 rounded-lg border border-border bg-muted/50 p-3">
					<p class="text-xs font-medium text-muted-foreground">
						{m.queued_activities_label({ count: pendingActivities.length.toString() })}
					</p>
					{#each pendingActivities as entry, i (i)}
						<div class="flex items-center gap-2 text-sm">
							<span class="font-mono text-xs text-muted-foreground">{entry.activity_key}</span>
							<span class="min-w-0 flex-1 truncate text-foreground">{entry.activity_name}</span>
							<span class="font-medium">{formatHoursMinutes(entry.hours)}</span>
							<Button
								variant="ghost"
								size="icon"
								class="h-6 w-6 shrink-0"
								onclick={() => (pendingActivities = pendingActivities.filter((_, j) => j !== i))}
								aria-label={m.remove()}
							>
								<X class="h-3 w-3" />
							</Button>
						</div>
					{/each}
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
										aria-expanded={expanded.has(node.id)}
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
										<span class="text-sm font-medium text-foreground"
											>{getCurriculumLabel(node)}</span
										>
									</button>

									{#if expanded.has(node.id)}
										{#each node.children as child (child.id)}
											{@render treeNode(child, depth + 1)}
										{/each}
									{/if}
								{:else}
									<button
										type="button"
										aria-pressed={selectedActivityId === node.id}
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
										<span class="text-sm font-medium text-foreground"
											>{getCurriculumLabel(node)}</span
										>
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
						{m.selected_activity({
							name: `${selectedActivity.key} - ${getCurriculumLabel(selectedActivity)}`
						})}
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
				<Label>{m.hours_label()}</Label>
				<div class="flex gap-2">
					<div class="flex flex-1 items-center gap-1">
						<Input
							type="number"
							min="0"
							max={String(maxHoursPerDay)}
							step="1"
							value={inputHours}
							oninput={handleHoursInput}
							aria-invalid={hoursExceedsMax || wouldExceedDailyMax}
						/>
						<span class="text-sm text-muted-foreground">h</span>
					</div>
					<div class="flex flex-1 items-center gap-1">
						<Input
							type="number"
							min="0"
							max="59"
							step="1"
							value={inputMinutes}
							oninput={handleMinutesInput}
							aria-invalid={hoursExceedsMax || wouldExceedDailyMax}
						/>
						<span class="text-sm text-muted-foreground">min</span>
					</div>
				</div>
				{#if wouldExceedDailyMax && hours > 0}
					<p class="text-sm text-destructive">
						{m.error_hours_max_day({
							max: maxHoursForDate.toString(),
							remaining: Math.max(0, maxHoursForDate - currentDayHours).toString()
						})}
					</p>
				{:else if hours > 0 && hours < MIN_HOURS}
					<p class="text-sm text-amber-600">
						{m.error_hours_min({ min: MIN_HOURS.toString() })}
					</p>
				{/if}
			</div>
		</div>

		<!-- Location -->
		<div class="grid gap-2">
			<Label>{m.location_label()}</Label>

			{#if isAddingLocation}
				<!-- Inline creation: text input + save/cancel -->
				<div class="flex flex-wrap gap-2">
					<Input
						bind:value={newLocationInput}
						placeholder={m.add_location_placeholder()}
						onkeydown={(e) => {
							if (e.key === 'Enter') {
								e.preventDefault();
								if (!isSavingLocation) saveNewLocation();
							} else if (e.key === 'Escape') {
								cancelAddLocation();
							}
						}}
						class="min-w-40 flex-1"
						disabled={isSavingLocation}
					/>
					<Button type="button" size="sm" onclick={saveNewLocation} disabled={isSavingLocation}>
						{m.save()}
					</Button>
					<Button
						type="button"
						size="sm"
						variant="outline"
						onclick={cancelAddLocation}
						disabled={isSavingLocation}
					>
						{m.cancel()}
					</Button>
				</div>
			{:else if locationsList.length === 0}
				<!-- No saved locations: prompt + add button -->
				<p class="text-sm text-muted-foreground">
					{m.no_locations_for_activity()}
				</p>
				<Button type="button" size="sm" variant="outline" class="w-fit" onclick={startAddLocation}>
					<Plus class="mr-2 h-4 w-4" />
					{m.add_location_action()}
				</Button>
			{:else}
				<!-- Existing locations dropdown + add-new trigger -->
				<div class="flex gap-2">
					<Select.Root bind:value={location} type="single">
						<Select.Trigger class="flex-1">
							{location || m.location_placeholder()}
						</Select.Trigger>
						<Select.Content>
							{#each locationsList as loc (loc)}
								<Select.Item value={loc} label={loc}>{loc}</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
					<Button
						type="button"
						size="sm"
						variant="outline"
						onclick={startAddLocation}
						title={m.add_location_action()}
					>
						<Plus class="h-4 w-4" />
					</Button>
				</div>
			{/if}

			{#if locationError}
				<p class="text-sm text-destructive">{locationError}</p>
			{/if}
		</div>

		<!-- Notes (Optional) -->
		<div class="grid gap-2">
			<Label for="notes">{m.notes_optional()}</Label>
			<Textarea id="notes" bind:value={notes} placeholder={m.notes_placeholder()} />
		</div>

		<Dialog.Footer class={activityToEdit ? 'flex gap-2' : ''}>
			{#if activityToEdit}
				<Button
					variant="destructive"
					onclick={() => openDeleteDialog()}
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
				{#if !activityToEdit}
					<Button variant="outline" onclick={handleAddAnother} disabled={!isValid || isSubmitting}>
						{m.add_another_activity()}
					</Button>
				{/if}
				<Button variant="default" onclick={handleSubmit} disabled={!isValid || isSubmitting}>
					{#if isSubmitting}
						<span class="flex items-center gap-2">
							<Spinner size="sm" />
							{m.saving()}
						</span>
					{:else if activityToEdit}
						{m.save_changes_button()}
					{:else if pendingActivities.length > 0}
						{m.submit_all_button({ count: (pendingActivities.length + 1).toString() })}
					{:else}
						{m.log_activity_button()}
					{/if}
				</Button>
			</div>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<ConfirmDialog
	bind:open={deleteDialogOpen}
	title={m.delete_activity_confirm()}
	confirmLabel={m.delete_activity_confirm_button()}
	cancelLabel={m.cancel()}
	variant="destructive"
	loading={isDeleting}
	onConfirm={handleDelete}
>
	{#if deleteError}
		<Alert variant="error">{deleteError}</Alert>
	{/if}
</ConfirmDialog>

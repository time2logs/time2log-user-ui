<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';
	import {
		activityStore,
		getLastActivityId,
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
		AlertCircle
	} from 'lucide-svelte';
	import * as m from '$lib/paraglide/messages.js';
	import { getDateLocale } from '$lib/dateLocale';

	import { SvelteMap, SvelteSet } from 'svelte/reactivity';

	const dateLocale = $derived(getDateLocale());

	let {
		open = $bindable(),
		curriculumNodes,
		teamMember,
		onActivityAdded,
		selectedDate,
		activityToEdit = null,
		existingActivities = []
	}: {
		open: boolean;
		curriculumNodes: CurriculumNode[];
		teamMember: TeamMember | null;
		onActivityAdded: () => void;
		selectedDate?: string;
		activityToEdit?: ActivityRecord | null;
		existingActivities?: ActivityRecord[];
	} = $props();

	// Build tree from flat list
	function buildTree(nodes: CurriculumNode[]): CurriculumTreeNode[] {
		const map = new SvelteMap<string, CurriculumTreeNode>();
		const roots: CurriculumTreeNode[] = [];

		nodes.forEach((node) => {
			map.set(node.id, { ...node, children: [] });
		});

		nodes.forEach((node) => {
			const treeNode = map.get(node.id)!;
			if (node.parent_id && map.has(node.parent_id)) {
				map.get(node.parent_id)!.children.push(treeNode);
			} else {
				roots.push(treeNode);
			}
		});

		const sortByKey = (a: CurriculumTreeNode, b: CurriculumTreeNode) =>
			a.key.localeCompare(b.key, undefined, { numeric: true });
		const sortTree = (nodes: CurriculumTreeNode[]) => {
			nodes.sort(sortByKey);
			nodes.forEach((n) => sortTree(n.children));
		};
		sortTree(roots);

		return roots;
	}

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
				location = '';
				notes = '';
			}
			// Auto-expand all categories to show activities
			const newExpanded = new SvelteSet<string>();
			curriculumNodes.forEach((node) => {
				if (node.node_type === 'category') {
					newExpanded.add(node.id);
				}
			});
			expanded = newExpanded;
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
					class="rounded-lg border border-orange-200 bg-orange-50/80 px-4 py-3 text-sm text-stone-700 dark:border-orange-800 dark:bg-orange-950/50 dark:text-slate-300"
				>
					{m.activity_saved_for_date({ date: selectedDateLabel })}
				</div>
			{/if}

			<!-- Activity Tree Selector -->
			<div class="grid gap-2">
				<Label>{m.activity_label()}</Label>
				<div
					class="rounded-lg border border-stone-200 bg-white/60 shadow-sm backdrop-blur-sm dark:border-slate-700 dark:bg-slate-800/50"
				>
					{#if tree.length === 0}
						<div class="flex h-32 items-center justify-center">
							<p class="text-stone-400 dark:text-slate-500">{m.no_activities_available()}</p>
						</div>
					{:else}
						<div class="max-h-64 divide-y divide-white/30 overflow-y-auto dark:divide-slate-700/50">
							{#snippet treeNode(node: CurriculumTreeNode, depth: number)}
								{#if node.node_type === 'category'}
									<button
										type="button"
										class="flex w-full items-center gap-2 px-4 py-2 text-left transition-colors hover:bg-white/40 dark:hover:bg-slate-700/50"
										style="padding-left: {depth * 20 + 12}px"
										onclick={() => toggleExpand(node.id)}
									>
										{#if expanded.has(node.id)}
											<ChevronDown
												class="pointer-events-none h-4 w-4 text-stone-400 dark:text-slate-500"
											/>
										{:else}
											<ChevronRight
												class="pointer-events-none h-4 w-4 text-stone-400 dark:text-slate-500"
											/>
										{/if}
										<Folder class="pointer-events-none h-4 w-4 text-orange-400" />
										<span class="font-mono text-sm text-stone-500 dark:text-slate-500"
											>{node.key}</span
										>
										<span class="text-sm font-medium text-stone-800 dark:text-slate-200"
											>{node.label}</span
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
										class="flex w-full items-center gap-2 px-4 py-2 text-left transition-colors hover:bg-white/40 dark:hover:bg-slate-700/50 {selectedActivityId ===
										node.id
											? 'bg-orange-50 dark:bg-orange-950/50'
											: ''}"
										style="padding-left: {depth * 20 + 32}px"
										onclick={() => selectActivity(node.id)}
									>
										<span class="w-4"></span>
										<FileText class="pointer-events-none h-4 w-4 text-rose-400" />
										<span class="font-mono text-sm text-stone-500 dark:text-slate-500"
											>{node.key}</span
										>
										<span class="text-sm font-medium text-stone-800 dark:text-slate-200"
											>{node.label}</span
										>
										{#if selectedActivityId === node.id}
											<Check class="pointer-events-none ml-auto h-4 w-4 text-orange-500" />
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
					<p class="text-sm text-stone-600 dark:text-slate-400">
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
									? 'fill-orange-400 text-orange-400'
									: 'fill-stone-200 text-stone-200 dark:fill-slate-700 dark:text-slate-600'}"
							/>
						</button>
					{/each}
				</div>
			</div>

			<!-- Time Input -->
			<div class="grid gap-2">
				<Label for="hours">{m.hours_label()}</Label>
				<input
					id="hours"
					type="number"
					min={MIN_HOURS}
					max={MAX_HOURS_PER_ENTRY}
					step="1"
					bind:value={hours}
					placeholder={m.hours_placeholder()}
					class="flex h-9 w-full rounded-md border border-stone-200 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-stone-500 focus-visible:ring-1 focus-visible:ring-stone-950 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800/30 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus-visible:ring-orange-400 {hoursExceedsMax ||
					wouldExceedDailyMax
						? 'border-red-400 focus-visible:ring-red-400'
						: ''}"
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
				<Label for="location">{m.location_label()}</Label>
				<input
					id="location"
					type="text"
					bind:value={location}
					placeholder={m.location_placeholder()}
					class="flex h-9 w-full rounded-md border border-stone-200 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-stone-500 focus-visible:ring-1 focus-visible:ring-stone-950 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800/30 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus-visible:ring-orange-400"
				/>
			</div>

			<!-- Notes (Optional) -->
			<div class="grid gap-2">
				<Label for="notes">{m.notes_optional()}</Label>
				<textarea
					id="notes"
					bind:value={notes}
					placeholder={m.notes_placeholder()}
					rows="3"
					class="flex min-h-[60px] w-full rounded-md border border-stone-200 bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-stone-400 focus-visible:ring-1 focus-visible:ring-stone-950 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800/30 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus-visible:ring-orange-400"
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
				disabled={!isValid || isSubmitting}
				class="bg-gradient-to-r from-orange-400 to-rose-400 text-white hover:from-orange-500 hover:to-rose-500"
			>
				{#if isSubmitting}
					<span class="flex items-center gap-2">
						<span class="h-4 w-4 animate-spin">⟳</span>
						Saving...
					</span>
				{:else}
					{activityToEdit ? m.save_changes_button() : m.log_activity_button()}
				{/if}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

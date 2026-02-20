<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';
	import { addActivity, getLastActivityId } from '$lib/activityStorage';
	import type { CurriculumNode, CurriculumTreeNode } from '$lib/types';
	import { Star, ChevronRight, ChevronDown, Folder, FileText, Check } from 'lucide-svelte';

	let {
		open = $bindable(),
		curriculumNodes,
		onActivityAdded
	}: {
		open: boolean;
		curriculumNodes: CurriculumNode[];
		onActivityAdded: () => void;
	} = $props();

	// Build tree from flat list
	function buildTree(nodes: CurriculumNode[]): CurriculumTreeNode[] {
		const map = new Map<string, CurriculumTreeNode>();
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
	const activityNodes = $derived(
		curriculumNodes.filter((node) => node.node_type === 'activity')
	);

	let expanded = $state<Set<string>>(new Set());
	let selectedActivityId = $state<string>('');
	let rating = $state<number>(0);
	let hours = $state<number>(0);
	let minutes = $state<number>(0);
	let notes = $state<string>('');
	let isSubmitting = $state(false);
	let hasInitialized = $state(false);

	// Pre-fill with last activity when dialog opens
	$effect(() => {
		if (open && !hasInitialized) {
			const lastActivityId = getLastActivityId();
			if (lastActivityId && activityNodes.find((n) => n.id === lastActivityId)) {
				selectedActivityId = lastActivityId;
			} else if (activityNodes.length > 0) {
				selectedActivityId = activityNodes[0].id;
			}
			// Auto-expand all categories to show activities
			const newExpanded = new Set<string>();
			curriculumNodes.forEach((node) => {
				if (node.node_type === 'category') {
					newExpanded.add(node.id);
				}
			});
			expanded = newExpanded;
			// Reset other fields
			rating = 0;
			hours = 0;
			minutes = 0;
			notes = '';
			hasInitialized = true;
		} else if (!open) {
			hasInitialized = false;
		}
	});

	const selectedActivity = $derived(
		activityNodes.find((n) => n.id === selectedActivityId)
	);

	function toggleExpand(id: string) {
		if (expanded.has(id)) {
			expanded.delete(id);
		} else {
			expanded.add(id);
		}
		expanded = new Set(expanded);
	}

	function selectActivity(id: string) {
		selectedActivityId = id;
	}

	function handleSubmit() {
		if (!selectedActivity || hours === 0 && minutes === 0 || isSubmitting) return;

		isSubmitting = true;

		try {
			addActivity({
				organization_id: '', // Will be filled from user context later
				profession_id: '',
				user_id: '',
				team_id: null,
				curriculum_activity_id: selectedActivity.id,
				entry_date: new Date().toISOString().split('T')[0],
				hours,
				minutes,
				notes: notes || null,
				rating: rating || null,
				activity_name: selectedActivity.name,
				activity_key: selectedActivity.key,
				activity_label: selectedActivity.label,
				created_at: '',
				updated_at: ''
			});

			// Close dialog and notify parent
			open = false;
			onActivityAdded();
		} catch (error) {
			console.error('Failed to add activity:', error);
		} finally {
			isSubmitting = false;
		}
	}

	function setRating(value: number) {
		rating = value;
	}

	const isValid = $derived(selectedActivityId && (hours > 0 || minutes > 0) && !isSubmitting);
</script>

<Dialog.Root bind:open>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Log Activity</Dialog.Title>
			<Dialog.Description>Record your completed activity with time and rating.</Dialog.Description>
		</Dialog.Header>

		<div class="grid gap-4 py-4">
			<!-- Activity Tree Selector -->
			<div class="grid gap-2">
				<Label>Activity</Label>
				<div class="rounded-lg border border-stone-200 bg-white/60 shadow-sm backdrop-blur-sm">
					{#if tree.length === 0}
						<div class="flex h-32 items-center justify-center">
							<p class="text-stone-400">No activities available</p>
						</div>
					{:else}
						<div class="divide-y divide-white/30 max-h-64 overflow-y-auto">
							{#snippet treeNode(node: CurriculumTreeNode, depth: number)}
								{#if node.node_type === 'category'}
									<button
										type="button"
										class="flex w-full items-center gap-2 px-4 py-2 text-left transition-colors hover:bg-white/40"
										style="padding-left: {depth * 20 + 12}px"
										onclick={() => toggleExpand(node.id)}
									>
										{#if expanded.has(node.id)}
											<ChevronDown class="h-4 w-4 text-stone-400 pointer-events-none" />
										{:else}
											<ChevronRight class="h-4 w-4 text-stone-400 pointer-events-none" />
										{/if}
										<Folder class="h-4 w-4 text-orange-400 pointer-events-none" />
										<span class="font-mono text-sm text-stone-500">{node.key}</span>
										<span class="text-sm font-medium text-stone-800">{node.name}</span>
									</button>

									{#if expanded.has(node.id)}
										{#each node.children as child}
											{@render treeNode(child, depth + 1)}
										{/each}
									{/if}
								{:else}
									<button
										type="button"
										class="flex w-full items-center gap-2 px-4 py-2 text-left transition-colors hover:bg-white/40 {selectedActivityId === node.id ? 'bg-orange-50' : ''}"
										style="padding-left: {depth * 20 + 32}px"
										onclick={() => selectActivity(node.id)}
									>
										<span class="w-4"></span>
										<FileText class="h-4 w-4 text-rose-400 pointer-events-none" />
										<span class="font-mono text-sm text-stone-500">{node.key}</span>
										<span class="text-sm font-medium text-stone-800">{node.name}</span>
										{#if node.label}
											<span class="text-sm text-stone-500">({node.label})</span>
										{/if}
										{#if selectedActivityId === node.id}
											<Check class="ml-auto h-4 w-4 text-orange-500 pointer-events-none" />
										{/if}
									</button>
								{/if}
							{/snippet}

							{#each tree as node}
								{@render treeNode(node, 0)}
							{/each}
						</div>
					{/if}
				</div>
				{#if selectedActivity}
					<p class="text-sm text-stone-600">
						Selected: <span class="font-medium">{selectedActivity.key} - {selectedActivity.name}</span>
					</p>
				{/if}
			</div>

			<!-- Rating -->
			<div class="grid gap-2">
				<Label>Rating (Optional)</Label>
				<div class="flex gap-1">
					{#each [1, 2, 3, 4, 5] as star}
						<button
							type="button"
							onclick={() => setRating(star)}
							class="transition-transform hover:scale-110"
							aria-label="Rate {star} stars"
						>
							<Star
								class="h-6 w-6 {star <= rating
									? 'fill-orange-400 text-orange-400'
									: 'fill-stone-200 text-stone-200'}"
							/>
						</button>
					{/each}
				</div>
			</div>

			<!-- Time Input -->
			<div class="grid grid-cols-2 gap-4">
				<div class="grid gap-2">
					<Label for="hours">Hours</Label>
					<input
						id="hours"
						type="number"
						min="0"
						max="23"
						bind:value={hours}
						class="flex h-9 w-full rounded-md border border-stone-200 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-stone-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-950 disabled:cursor-not-allowed disabled:opacity-50"
					/>
				</div>
				<div class="grid gap-2">
					<Label for="minutes">Minutes</Label>
					<input
						id="minutes"
						type="number"
						min="0"
						max="59"
						bind:value={minutes}
						class="flex h-9 w-full rounded-md border border-stone-200 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-stone-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-950 disabled:cursor-not-allowed disabled:opacity-50"
					/>
				</div>
			</div>

			<!-- Notes (Optional) -->
			<div class="grid gap-2">
				<Label for="notes">Notes (Optional)</Label>
				<textarea
					id="notes"
					bind:value={notes}
					placeholder="Add any additional notes..."
					rows="3"
					class="flex min-h-[60px] w-full rounded-md border border-stone-200 bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-stone-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-950 disabled:cursor-not-allowed disabled:opacity-50"
				></textarea>
			</div>
		</div>

		<Dialog.Footer>
			<Button
				variant="outline"
				onclick={() => {
					open = false;
				}}
			>
				Cancel
			</Button>
			<Button
				variant="default"
				onclick={handleSubmit}
				disabled={!isValid}
				class="bg-gradient-to-r from-orange-400 to-rose-400 text-white hover:from-orange-500 hover:to-rose-500"
			>
				Log Activity
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

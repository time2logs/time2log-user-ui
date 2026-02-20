<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Trash2, Calendar, Clock, Star } from 'lucide-svelte';
	import { activityStore } from '$lib/activityStorage';
	import type { ActivityRecord, CurriculumNode, CurriculumTreeNode } from '$lib/types';
	import * as m from '$lib/paraglide/messages.js';

	let { curriculumNodes, onRefresh }: { curriculumNodes: any[]; onRefresh: () => void } = $props();

	// Initialize the store when component mounts
	$effect(() => {
		activityStore.initialize();
	});

	// Subscribe to the store for automatic updates
	let activities = $state<ActivityRecord[]>([]);
	activityStore.subscribe((data) => {
		activities = data;
		console.log('[ActivityList] Store updated, now has', data.length, 'activities');
	});
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

	function handleDelete(id: string) {
		if (confirm(m.delete_activity_confirm())) {
			activityStore.delete(id);
			onRefresh();
		}
	}

	function formatDate(dateStr: string): string {
		const date = new Date(dateStr);
		return date.toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		});
	}

	function formatTime(hours: number, minutes: number): string {
		if (hours > 0) {
			return `${hours}h`;
		}
		return '0h';
	}
</script>

<div class="space-y-4">
	<!-- Activity List -->
	{#if activities.length === 0}
		<div class="rounded-lg border border-stone-200 bg-white/60 p-12 text-center shadow-sm backdrop-blur-sm">
			<div class="flex flex-col items-center gap-3 text-stone-400">
				<Calendar class="h-12 w-12" />
				<p class="text-lg font-medium">{m.no_activities_found()}</p>
				<p class="text-sm">{m.start_by_logging_first_activity()}</p>
			</div>
		</div>
	{:else}
		<div class="space-y-2">
			{#each activities as activity (activity.id)}
				<div
					class="group flex items-center gap-4 rounded-lg border border-stone-200 bg-white/60 p-4 shadow-sm backdrop-blur-sm transition-all hover:bg-white/80 hover:shadow-md"
					style="animation: slideIn 0.3s ease-out"
				>
					<!-- Activity Info -->
					<div class="flex-1 min-w-0">
						<div class="flex items-center gap-2 mb-1">
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
								<span class="font-medium">{formatTime(activity.hours, activity.minutes)}</span>
							</div>
							{#if activity.rating}
								<div class="flex items-center gap-0.5">
									<Star class="h-3.5 w-3.5 fill-orange-400 text-orange-400" />
									<span class="font-medium">{activity.rating}</span>
								</div>
							{/if}
						</div>
						{#if activity.notes}
							<p class="mt-2 text-sm text-stone-600 line-clamp-2">{activity.notes}</p>
						{/if}
					</div>

					<!-- Delete Button -->
					<Button
						variant="ghost"
						size="icon"
						onclick={() => handleDelete(activity.id)}
						class="opacity-0 group-hover:opacity-100 transition-opacity text-stone-400 hover:text-red-500 hover:bg-red-50"
					>
						<Trash2 class="h-4 w-4" />
					</Button>
				</div>
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

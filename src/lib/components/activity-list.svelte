<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Trash2, Calendar, Clock, Star } from 'lucide-svelte';
	import { activityStore } from '$lib/activityStorage';
	import { supabase } from '$lib/supabaseClient';
	import type { ActivityRecord, CurriculumNode, CurriculumTreeNode } from '$lib/types';
	import * as m from '$lib/paraglide/messages.js';

	let { curriculumNodes, onRefresh }: { curriculumNodes: any[]; onRefresh: () => void } = $props();

	// Subscribe to the store for automatic updates
	let activities = $state<ActivityRecord[]>([]);
	activityStore.subscribe((data) => {
		activities = data;
		console.log('[ActivityList] Store updated, now has', data.length, 'activities');
	});

	// Load activities from Supabase when component mounts
	async function loadActivitiesFromSupabase() {
		try {
			console.log('[ActivityList] Loading activities from Supabase...');
			const { data, error } = await supabase
				.from('activity_records')
				.select('*, curriculum_nodes!inner(id, key, label)')
				.order('created_at', { ascending: false });

			if (error) {
				console.error('[ActivityList] Error loading from Supabase:', error);
				// Fallback to localStorage if Supabase fails
				const localStorageActivities = activityStore.getAll();
				if (localStorageActivities.length > 0) {
					console.log('[ActivityList] Falling back to localStorage, found', localStorageActivities.length, 'activities');
					activities = localStorageActivities;
				}
				return;
			}

			console.log('[ActivityList] Loaded', data?.length || 0, 'activities from Supabase');

			// Update both state and store with Supabase data
			if (data && data.length > 0) {
				const formattedActivities = data.map((record: any) => ({
					id: record.id,
					organization_id: record.organization_id,
					profession_id: record.profession_id,
					user_id: record.user_id,
					team_id: record.team_id,
					curriculum_activity_id: record.curriculum_activity_id,
					entry_date: record.entry_date,
					hours: record.hours,
					notes: record.notes,
					rating: record.rating,
					created_at: record.created_at,
					updated_at: record.updated_at,
					activity_name: record.curriculum_nodes?.label || '',
					activity_key: record.curriculum_nodes?.key || '',
					activity_label: '' // label is already used as name
				}));

				activities = formattedActivities;
				console.log('[ActivityList] Activities loaded and formatted');
			} else {
				activities = [];
			}
		} catch (error) {
			console.error('[ActivityList] Exception loading from Supabase:', error);
		}
	}

	// Load activities on mount
	$effect(() => {
		loadActivitiesFromSupabase();
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

	async function handleDelete(id: string) {
		if (confirm(m.delete_activity_confirm())) {
			try {
				// Delete from Supabase
				const { error } = await supabase
					.from('activity_records')
					.delete()
					.eq('id', id);

				if (error) {
					console.error('[ActivityList] Error deleting from Supabase:', error);
					// Fallback to localStorage deletion
					activityStore.delete(id);
				} else {
					console.log('[ActivityList] Deleted from Supabase:', id);
					// Also remove from local state
					activities = activities.filter(a => a.id !== id);
				}

				onRefresh();
			} catch (error) {
				console.error('[ActivityList] Exception deleting:', error);
				// Fallback to localStorage
				activityStore.delete(id);
				onRefresh();
			}
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

	function formatTime(hours: number): string {
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

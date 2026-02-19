<script lang="ts">
	import type { CurriculumNode, CurriculumTreeNode } from '$lib/types';
	import { ChevronRight, ChevronDown, Folder, FileText } from 'lucide-svelte';

	let { nodes }: { nodes: CurriculumNode[] } = $props();

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

	const tree = $derived(buildTree(nodes));

	let expanded = $state<Set<string>>(new Set());

	function toggleExpand(id: string) {
		if (expanded.has(id)) {
			expanded.delete(id);
		} else {
			expanded.add(id);
		}
		expanded = new Set(expanded);
	}
</script>

{#snippet treeNode(node: CurriculumTreeNode, depth: number)}
	<div class="border-b border-white/30 last:border-b-0">
		<button
			class="flex w-full items-center gap-2 px-4 py-3 text-left transition-colors hover:bg-white/40"
			style="padding-left: {depth * 24 + 16}px"
			onclick={() => node.node_type === 'category' && toggleExpand(node.id)}
			disabled={node.node_type === 'activity'}
		>
			{#if node.node_type === 'category'}
				{#if expanded.has(node.id)}
					<ChevronDown class="h-4 w-4 text-stone-400" />
				{:else}
					<ChevronRight class="h-4 w-4 text-stone-400" />
				{/if}
				<Folder class="h-4 w-4 text-orange-400" />
			{:else}
				<span class="w-4"></span>
				<FileText class="h-4 w-4 text-rose-400" />
			{/if}
			<span class="font-mono text-sm text-stone-500">{node.key}</span>
			<span class="text-sm font-medium text-stone-800">{node.name}</span>
			<span class="text-sm font-medium text-stone-800">{node.label}</span>
		</button>

		{#if node.node_type === 'category' && expanded.has(node.id)}
			{#each node.children as child}
				{@render treeNode(child, depth + 1)}
			{/each}
		{/if}
	</div>
{/snippet}

{#if tree.length === 0}
	<div class="flex h-48 items-center justify-center">
		<p class="text-stone-400">No curriculum nodes found</p>
	</div>
{:else}
	<div class="divide-y divide-white/30">
		{#each tree as node}
			{@render treeNode(node, 0)}
		{/each}
	</div>
{/if}

<script lang="ts">
	import { cn } from '$lib/utils.js';

	type Item = {
		value: string;
		label: string;
	};

	type Props = {
		items: Item[];
		value?: string;
		selected?: string[];
		class?: string;
		buttonClass?: string;
		onSelect?: (value: string) => void;
		onToggle?: (value: string) => void;
	};

	let {
		items,
		value,
		selected = [],
		class: className,
		buttonClass,
		onSelect,
		onToggle
	}: Props = $props();

	function baseClass(isActive: boolean): string {
		return cn(
			'flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
			isActive
				? 'border-primary bg-primary/10 text-primary'
				: 'border-border bg-background text-foreground hover:bg-accent',
			buttonClass
		);
	}

	function isActive(item: Item): boolean {
		return selected.length > 0 ? selected.includes(item.value) : value === item.value;
	}
</script>

<div class={cn('flex flex-wrap gap-2', className)}>
	{#each items as item (item.value)}
		<button
			type="button"
			onclick={() => {
				if (selected.length > 0 || onToggle) {
					onToggle?.(item.value);
				} else {
					onSelect?.(item.value);
				}
			}}
			class={baseClass(isActive(item))}
		>
			{item.label}
		</button>
	{/each}
</div>

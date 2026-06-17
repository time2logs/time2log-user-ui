<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn, type IconComponent } from '$lib/utils.js';

	type Props = {
		value: string | number;
		label?: string;
		icon?: IconComponent;
		size?: 'sm' | 'default' | 'lg';
		class?: string;
		children?: Snippet;
	};

	let { value, label, icon: Icon, size = 'default', class: className, children }: Props = $props();

	const valueSize = {
		sm: 'text-2xl font-bold tabular-nums',
		default: 'text-3xl font-bold tabular-nums',
		lg: 'text-xl font-bold tabular-nums sm:text-3xl'
	};
</script>

<div class={cn('flex flex-col gap-1', className)}>
	<div class="flex items-center gap-2">
		{#if Icon}
			<Icon class="h-5 w-5 text-primary" />
		{/if}
		<span class={valueSize[size]}>{value}</span>
	</div>
	{#if label}
		<p class="text-sm text-muted-foreground">{label}</p>
	{/if}
	{@render children?.()}
</div>

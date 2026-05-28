<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		icon,
		value,
		label,
		valueClass = ''
	}: {
		icon?: Snippet;
		value: string | number;
		label: string;
		valueClass?: string;
	} = $props();
</script>

<div class="flex flex-col items-center rounded-lg bg-muted/40 p-2 text-center sm:p-4">
	{#if icon}
		<div class="mb-1 sm:mb-2">{@render icon()}</div>
	{/if}
	<p class="text-xl font-bold tabular-nums sm:text-3xl {valueClass}">{value}</p>
	<p class="mt-0.5 text-[10px] leading-tight text-muted-foreground sm:mt-1 sm:text-xs">{label}</p>
</div>

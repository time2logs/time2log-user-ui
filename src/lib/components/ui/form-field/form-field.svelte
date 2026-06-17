<script lang="ts">
	import type { Snippet } from 'svelte';
	import { Label } from '$lib/components/ui/label';
	import { cn } from '$lib/utils.js';

	type Props = {
		label?: string;
		htmlFor?: string;
		hint?: string;
		error?: string;
		class?: string;
		labelClass?: string;
		children?: Snippet;
	};

	let { label, htmlFor, hint, error, class: className, labelClass, children }: Props = $props();
</script>

<div class={cn('grid gap-2', className)}>
	{#if label}
		<Label for={htmlFor} class={labelClass}>{label}</Label>
	{/if}
	{@render children?.()}
	{#if error}
		<p class="text-sm text-destructive">{error}</p>
	{:else if hint}
		<p class="text-sm text-muted-foreground">{hint}</p>
	{/if}
</div>

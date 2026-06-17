<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn, type IconComponent } from '$lib/utils.js';

	type Props = {
		icon?: IconComponent;
		title?: string;
		hint?: string;
		class?: string;
		children?: Snippet;
		action?: Snippet;
	};

	let { icon: Icon, title, hint, class: className, children, action }: Props = $props();
</script>

<div
	class={cn(
		'flex flex-col items-center justify-center gap-2 rounded-lg border border-border bg-muted/30 p-6 text-center text-muted-foreground sm:gap-3 sm:p-12',
		className
	)}
>
	{#if Icon}
		<Icon class="h-8 w-8 opacity-70" />
	{/if}
	{#if title}
		<p class="text-sm font-medium text-foreground">{title}</p>
	{/if}
	{#if hint}
		<p class="text-sm">{hint}</p>
	{/if}
	{@render children?.()}
	{#if action}
		<div class="mt-2">{@render action()}</div>
	{/if}
</div>

<script lang="ts">
	import { Dialog as DialogPrimitive } from 'bits-ui';
	import type { Snippet } from 'svelte';

	let {
		open = $bindable(),
		children
	}: {
		open: boolean;
		children: Snippet;
	} = $props();
</script>

<DialogPrimitive.Root bind:open>
	{@render children()}
</DialogPrimitive.Root>

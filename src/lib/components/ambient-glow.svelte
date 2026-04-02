<script lang="ts">
	import { onMount } from 'svelte';

	let blobs = $state<{ x: number; y: number; colorClass: string }[]>([]);

	onMount(() => {
		// Generate random positions between 10% and 90% to keep blobs mostly on screen
		blobs = [
			{
				x: Math.floor(Math.random() * 80) + 10,
				y: Math.floor(Math.random() * 80) + 10,
				colorClass: 'bg-blue-400/10 dark:bg-blue-600/10'
			},
			{
				x: Math.floor(Math.random() * 80) + 10,
				y: Math.floor(Math.random() * 80) + 10,
				colorClass: 'bg-indigo-400/10 dark:bg-indigo-600/10'
			}
		];
	});
</script>

<div class="pointer-events-none absolute inset-0 z-0 overflow-hidden">
	{#each blobs as blob (blob.colorClass)}
		<div
			class="absolute h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[100px] transition-all duration-1000 ease-in-out {blob.colorClass}"
			style="left: {blob.x}%; top: {blob.y}%;"
		></div>
	{/each}
</div>

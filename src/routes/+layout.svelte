<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { theme } from '$lib/themeStore';
	import { onMount } from 'svelte';
	import { palette } from '$lib/paletteStore';

	onMount(() => {
		theme.initialize();
		palette.initialize();
	});

	let { children } = $props();
</script>

<svelte:head
	><link rel="icon" href={favicon} /> <link rel="manifest" href="/manifest.json" /></svelte:head
>
{@render children()}

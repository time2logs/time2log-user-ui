<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { theme } from '$lib/themeStore';
	import { onMount } from 'svelte';
	import { palette } from '$lib/paletteStore';
	import { registerSW } from 'virtual:pwa-register';

	onMount(() => {
		theme.initialize();
		palette.initialize();
		registerSW({ immediate: true });
	});

	let { children } = $props();
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>
{@render children()}

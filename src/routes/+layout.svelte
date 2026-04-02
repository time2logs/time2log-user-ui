<script lang="ts">
	import '../app.css';
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { theme } from '$lib/themeStore';
	import { onMount } from 'svelte';

	let { children } = $props();

	onMount(() => {
		theme.initialize();
	});
</script>


<svelte:head><link rel="icon" href={favicon} /></svelte:head>
{@render children()}

<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { logout } from '$lib/api';

	let { children } = $props();
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>
{@render children()}

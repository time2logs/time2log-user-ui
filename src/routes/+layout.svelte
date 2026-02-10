<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { logout } from '$lib/api';
	import { page } from '$app/stores';

	let { children } = $props();
	let isAuthenticated = $state(false);

	// Check if current route is dashboard (protected)
	$isAuthenticated = $page.route.id?.startsWith('/dashboard') ?? false;
</script>

<nav class="hidden bg-gray-800 text-white p-4 flex justify-between items-center absolute top-0 left-0">
  <span class="font-semibold">Time2Log</span>
  {#if isAuthenticated}
    <button onclick={logout} class="hover:underline">Logout</button>
  {:else}
    <a href="/login" class="hover:underline">Login</a>
  {/if}
</nav>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>
{@render children()}

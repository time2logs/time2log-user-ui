<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { getAccessToken, logout } from '$lib/api';
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';

	let { children } = $props();
	let isAuthenticated = $state(false);

	function checkAuth() {
		if (browser) {
			isAuthenticated = !!getAccessToken();
		}
	}

	onMount(() => {
		checkAuth();
		// Listen for storage changes (e.g., login in another tab)
		if (browser) {
			window.addEventListener('storage', checkAuth);
		}
	});
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

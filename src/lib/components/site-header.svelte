<script lang="ts">
	import LanguageSwitcher from '$lib/components/language-switcher.svelte';
	import { resolve } from '$app/paths';

	let { loggedIn = false }: { loggedIn?: boolean } = $props();
</script>

<header class="border-b border-border/30 bg-background/60 px-8 py-4 backdrop-blur-xl">
	<div class="mx-auto flex max-w-6xl items-center justify-between">
		<div class="flex items-center gap-2">
			<a
				class="text-xl font-bold text-foreground"
				href={loggedIn ? resolve('/dashboard') : resolve('/')}>time2log</a
			>
		</div>
		<LanguageSwitcher />
	</div>
</header>

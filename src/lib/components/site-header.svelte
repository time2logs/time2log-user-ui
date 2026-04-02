<script lang="ts">
	import LanguageSwitcher from '$lib/components/language-switcher.svelte';
	import { resolve } from '$app/paths';
</script>

<header
	class="border-b border-white/30 bg-white/20 px-8 py-4 backdrop-blur-xl dark:border-slate-700/30 dark:bg-slate-900/40"
>
	<div class="mx-auto flex max-w-6xl items-center justify-between">
		<div class="flex items-center gap-2">
			<a class="text-xl font-bold text-stone-800 dark:text-slate-100" href={resolve('/')}>time2log</a>
		</div>
		<LanguageSwitcher />
	</div>
</header>

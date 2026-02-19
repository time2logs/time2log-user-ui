<script lang="ts">
	import LanguageSwitcher from '$lib/components/language-switcher.svelte';
</script>

<header class="border-b border-white/30 bg-white/20 px-8 py-4 backdrop-blur-xl">
	<div class="mx-auto flex max-w-6xl items-center justify-between">
		<div class="flex items-center gap-2">
			<span class="text-xl font-bold text-stone-800">time2log</span>
		</div>
		<LanguageSwitcher />
	</div>
</header>

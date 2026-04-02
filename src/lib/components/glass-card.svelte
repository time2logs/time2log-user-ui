<script lang="ts">
	let { class: className = '', children } = $props();
</script>

<div
	class="glass-card overflow-hidden rounded-3xl border border-white/50 bg-white/25 shadow-xl backdrop-blur-2xl dark:border-slate-600/40 dark:bg-slate-800/60 dark:shadow-2xl dark:shadow-black/50 {className}"
	style="box-shadow: 0 8px 32px 0 rgba(255, 200, 150, 0.1), inset 0 0 0 1px rgba(255, 255, 255, 0.5);"
>
	{@render children()}
</div>

<style>
	:global(.dark) .glass-card {
		box-shadow:
			0 8px 32px 0 rgba(0, 0, 0, 0.4),
			inset 0 0 0 1px rgba(255, 255, 255, 0.08);
	}
</style>

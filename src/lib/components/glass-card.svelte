<script lang="ts">
	let { class: className = '', children } = $props();
</script>

<div
	class="overflow-hidden rounded-3xl border border-white/50 bg-white/25 shadow-xl backdrop-blur-2xl dark:border-slate-700/50 dark:bg-slate-800/40 dark:shadow-2xl dark:shadow-black/50"
	style="box-shadow: 0 8px 32px 0 rgba(255, 200, 150, 0.1), inset 0 0 0 1px rgba(255, 255, 255, 0.5);"
>
	{@render children()}
</div>

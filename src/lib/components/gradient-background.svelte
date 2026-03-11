<script lang="ts">
	let { class: className = '', children } = $props();
</script>

<div class={`relative flex min-h-screen flex-col overflow-hidden ${className}`}>
	<div class="fixed inset-0 bg-gradient-to-br from-orange-50 via-rose-50 to-white"></div>

	<div
		class="fixed top-0 left-1/4 h-[600px] w-[600px] rounded-full bg-orange-200/40 blur-[120px]"
	></div>
	<div
		class="fixed top-1/4 right-0 h-[500px] w-[500px] rounded-full bg-orange-300/35 blur-[120px]"
	></div>
	<div
		class="fixed bottom-0 left-1/3 h-[400px] w-[400px] rounded-full bg-rose-200/30 blur-[100px]"
	></div>

	<div class="relative z-10 flex min-h-screen flex-col">
		{@render children()}
	</div>
</div>

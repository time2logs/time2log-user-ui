<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { ArrowRight } from 'lucide-svelte';

	let { data } = $props();
	let isLoggedIn = $derived(data.profile !== null);

	let cardElement: HTMLDivElement;
	let cursorX = $state(0);
	let cursorY = $state(0);
	let cursorVisible = $state(false);

	function handleMouseMove(e: MouseEvent) {
		if (!cardElement) return;
		const rect = cardElement.getBoundingClientRect();
		cursorX = e.clientX - rect.left;
		cursorY = e.clientY - rect.top;
		cursorVisible = true;
	}

	function handleMouseLeave() {
		cursorVisible = false;
	}
</script>

<div class="relative flex min-h-screen flex-col overflow-hidden">
	<!-- Background gradient that covers entire page -->
	<div class="fixed inset-0 bg-gradient-to-br from-orange-50 via-rose-50 to-white"></div>

	<!-- Soft gradient orbs - more orange, less pink -->
	<div
		class="fixed top-0 left-1/4 h-[600px] w-[600px] rounded-full bg-orange-200/40 blur-[120px]"
	></div>
	<div
		class="fixed top-1/4 right-0 h-[500px] w-[500px] rounded-full bg-orange-300/35 blur-[120px]"
	></div>
	<div
		class="fixed bottom-0 left-1/3 h-[400px] w-[400px] rounded-full bg-rose-200/30 blur-[100px]"
	></div>

	<section class="relative z-10 flex flex-grow items-center justify-center px-4 py-20">
		<!-- Frosted glass card with cursor bloom inside -->
		<div
			bind:this={cardElement}
			onmousemove={handleMouseMove}
			onmouseleave={handleMouseLeave}
			class="relative mx-auto max-w-2xl overflow-hidden rounded-3xl border border-white/50 bg-white/25 p-8 shadow-xl backdrop-blur-2xl sm:p-12"
			style="box-shadow: 0 8px 32px 0 rgba(255, 200, 150, 0.1), inset 0 0 0 1px rgba(255, 255, 255, 0.5);"
		>
			<!-- Cursor bloom effect - only inside card -->
			<div
				class="pointer-events-none absolute z-0 h-[300px] w-[300px] rounded-full bg-gradient-to-r from-orange-200/40 via-rose-200/40 to-orange-300/40 blur-[60px] transition-opacity duration-300"
				style="left: {cursorX - 150}px; top: {cursorY - 150}px; opacity: {cursorVisible ? 1 : 0};"
			></div>

			<div class="relative z-10 text-center">
				<h1 class="mb-6 text-4xl font-bold tracking-tight text-stone-800 sm:text-5xl lg:text-6xl">
					Track Your
					<span
						class="bg-gradient-to-br from-orange-400 via-rose-400 to-orange-500 bg-clip-text text-transparent"
					>
						Learning
					</span>
					Journey
				</h1>

				<p class="mx-auto mb-10 max-w-xl text-lg leading-relaxed text-stone-600 sm:text-xl">
					Simple, intuitive time logging for students and professionals. Stay organized, track your
					progress, and achieve your goals.
				</p>

				<div class="flex flex-col items-center justify-center gap-4 sm:flex-row">
					{#if isLoggedIn}
						<Button
							href="/dashboard"
							size="lg"
							class="min-w-[200px] bg-stone-800 text-base text-white transition-all hover:bg-stone-700"
						>
							Go to Dashboard
							<ArrowRight class="ml-2 h-4 w-4" />
						</Button>
					{:else}
						<Button
							href="/login"
							size="lg"
							class="min-w-[200px] bg-stone-800 text-base text-white transition-all hover:bg-stone-700"
						>
							Get Started
							<ArrowRight class="ml-2 h-4 w-4" />
						</Button>
					{/if}
				</div>
			</div>
		</div>
	</section>

	<footer class="relative z-10 mt-auto px-4 py-8">
		<div class="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
			<div class="flex items-center gap-2">
				<span class="font-semibold text-stone-700">time2log</span>
			</div>
			<p class="text-sm text-stone-500">
				© {new Date().getFullYear()} time2log. All rights reserved.
			</p>
		</div>
	</footer>
</div>
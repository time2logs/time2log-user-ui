<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { ArrowRight } from 'lucide-svelte';
	import GradientBackground from '$lib/components/gradient-background.svelte';
	import SiteFooter from '$lib/components/site-footer.svelte';
	import GlassCard from '$lib/components/glass-card.svelte';

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

<GradientBackground>
	<section class="flex flex-grow items-center justify-center px-4 py-20">
		<GlassCard class="relative mx-auto max-w-2xl p-8 sm:p-12">
			<div
				bind:this={cardElement}
				onmousemove={handleMouseMove}
				onmouseleave={handleMouseLeave}
				class="relative"
			>
				<div
					class="pointer-events-none absolute z-0 h-[300px] w-[300px] rounded-full bg-gradient-to-r from-orange-200/40 via-rose-200/40 to-orange-300/40 blur-[60px] transition-opacity duration-300 dark:opacity-0"
					style="left: {cursorX - 150}px; top: {cursorY - 150}px; opacity: {cursorVisible ? 1 : 0};"
				></div>

				<div class="relative z-10 text-center">
					<h1
						class="mb-6 text-4xl font-bold tracking-tight text-stone-800 sm:text-5xl lg:text-6xl dark:text-slate-100"
					>
						Track Your
						<span
							class="bg-gradient-to-br from-orange-400 via-rose-400 to-orange-500 bg-clip-text text-transparent"
						>
							Learning
						</span>
						Journey
					</h1>

					<p
						class="mx-auto mb-10 max-w-xl text-lg leading-relaxed text-stone-600 sm:text-xl dark:text-slate-400"
					>
						Simple, intuitive time logging for students and professionals. Stay organized, track
						your progress, and achieve your goals.
					</p>

					<div class="flex flex-col items-center justify-center gap-4 sm:flex-row">
						{#if isLoggedIn}
							<Button
								href="/dashboard"
								size="lg"
								class="min-w-[200px] bg-stone-800 text-base text-white transition-all hover:bg-stone-700 dark:bg-slate-700 dark:text-white dark:hover:bg-slate-600"
							>
								Go to Dashboard
								<ArrowRight class="ml-2 h-4 w-4" />
							</Button>
						{:else}
							<Button
								href="/login"
								size="lg"
								class="min-w-[200px] bg-stone-800 text-base text-white transition-all hover:bg-stone-700 dark:bg-slate-700 dark:text-white dark:hover:bg-slate-600"
							>
								Get Started
								<ArrowRight class="ml-2 h-4 w-4" />
							</Button>
						{/if}
					</div>
				</div>
			</div></GlassCard
		>
	</section>

	<SiteFooter />
</GradientBackground>

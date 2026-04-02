<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { ArrowRight } from 'lucide-svelte';
	import SiteFooter from '$lib/components/site-footer.svelte';
	import AmbientGlow from '$lib/components/ambient-glow.svelte';

	let { data } = $props();
	let isLoggedIn = $derived(data.profile !== null);
</script>

<div class="relative flex min-h-screen flex-col overflow-hidden bg-background text-foreground">
	<!-- Subtle background glow -->
	<AmbientGlow />

	<section class="relative z-10 flex flex-grow items-center justify-center px-4 py-20">
		<div
			class="mx-auto max-w-2xl rounded-xl border border-border bg-card p-8 text-center shadow-sm sm:p-12"
		>
			<h1 class="mb-6 text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
				Track Your
				<span class="text-primary"> Learning </span>
				Journey
			</h1>

			<p class="mx-auto mb-10 max-w-xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
				Simple, intuitive time logging for students and professionals. Stay organized, track your
				progress, and achieve your goals.
			</p>

			<div class="flex flex-col items-center justify-center gap-4 sm:flex-row">
				{#if isLoggedIn}
					<Button href="/dashboard" size="lg" class="min-w-[200px]">
						Go to Dashboard
						<ArrowRight class="ml-2 h-4 w-4" />
					</Button>
				{:else}
					<Button href="/login" size="lg" class="min-w-[200px]">
						Get Started
						<ArrowRight class="ml-2 h-4 w-4" />
					</Button>
				{/if}
			</div>
		</div>
	</section>

	<div class="relative z-10">
		<SiteFooter />
	</div>
</div>

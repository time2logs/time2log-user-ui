<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Home, ArrowLeft } from 'lucide-svelte';
	import GradientBackground from '$lib/components/gradient-background.svelte';
	import GlassCard from '$lib/components/glass-card.svelte';
	import { page } from '$app/stores';

	const status = $derived($page.status);
	const message = $derived($page.error?.message || 'Page not found');

	function goBack() {
		history.back();
	}
</script>

<svelte:head>
	<title>{status} - Time2Log</title>
</svelte:head>

<GradientBackground>
	<section class="flex flex-grow items-center justify-center px-4 py-20">
		<GlassCard class="relative mx-auto max-w-lg p-8 sm:p-12">
			<div class="relative z-10 text-center">
				<div class="mb-6">
					<span
						class="bg-gradient-to-br from-orange-400 via-rose-400 to-orange-500 bg-clip-text text-8xl font-bold text-transparent"
					>
						{status}
					</span>
				</div>

				<h1 class="mb-4 text-2xl font-bold tracking-tight text-stone-800 sm:text-3xl">
					{#if status === 404}
						Page Not Found
					{:else if status === 403}
						Access Denied
					{:else if status === 500}
						Server Error
					{:else}
						Something Went Wrong
					{/if}
				</h1>

				<p class="mx-auto mb-8 max-w-md text-stone-600">
					{#if status === 404}
						The page you're looking for doesn't exist or has been moved.
					{:else if status === 403}
						You don't have permission to access this page.
					{:else if status === 500}
						An unexpected error occurred. Please try again later.
					{:else}
						{message}
					{/if}
				</p>

				<div class="flex flex-col items-center justify-center gap-3 sm:flex-row">
					<Button
						onclick={goBack}
						variant="outline"
						size="lg"
						class="min-w-[160px] border-stone-300 text-stone-700 hover:bg-stone-100"
					>
						<ArrowLeft class="mr-2 h-4 w-4" />
						Go Back
					</Button>
					<Button
						href="/"
						size="lg"
						class="min-w-[160px] bg-stone-800 text-white hover:bg-stone-700"
					>
						<Home class="mr-2 h-4 w-4" />
						Home
					</Button>
				</div>
			</div>
		</GlassCard>
	</section>
</GradientBackground>

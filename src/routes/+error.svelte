<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Home, ArrowLeft } from 'lucide-svelte';
	import { page } from '$app/stores';

	const status = $derived($page.status);

	function goBack() {
		history.back();
	}
</script>

<svelte:head>
	<title>{status} - Time2Log</title>
</svelte:head>

<div class="flex min-h-screen flex-col bg-background text-foreground">
	<section class="flex flex-grow items-center justify-center px-4 py-20">
		<div
			class="relative mx-auto max-w-lg rounded-xl border border-border bg-card p-8 text-center shadow-sm sm:p-12"
		>
			<div class="mb-6">
				<span class="text-8xl font-bold text-primary">
					{status}
				</span>
			</div>

			<h1 class="mb-4 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
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

			<p class="mx-auto mb-8 max-w-md text-muted-foreground">
				{#if status === 404}
					The page you're looking for doesn't exist or has been moved.
				{:else if status === 403}
					You don't have permission to access this page.
				{:else}
					An unexpected error occurred. Please try again later.
				{/if}
			</p>

			<div class="flex flex-col items-center justify-center gap-3 sm:flex-row">
				<Button onclick={goBack} variant="outline" size="lg" class="min-w-[160px]">
					<ArrowLeft class="mr-2 h-4 w-4" />
					Go Back
				</Button>
				<Button href="/" size="lg" class="min-w-[160px]">
					<Home class="mr-2 h-4 w-4" />
					Home
				</Button>
			</div>
		</div>
	</section>
</div>

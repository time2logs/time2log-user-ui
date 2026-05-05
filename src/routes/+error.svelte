<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Home, ArrowLeft } from 'lucide-svelte';
	import { page } from '$app/stores';
	import * as m from '$lib/paraglide/messages.js';

	const status = $derived($page.status);
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
					{m.error_404_title()}
				{:else if status === 403}
					{m.error_403_title()}
				{:else if status === 500}
					{m.error_500_title()}
				{:else}
					{m.error_generic_title()}
				{/if}
			</h1>

			<p class="mx-auto mb-8 max-w-md text-muted-foreground">
				{#if status === 404}
					{m.error_404_message()}
				{:else if status === 403}
					{m.error_403_message()}
				{:else}
					{m.error_generic_message()}
				{/if}
			</p>

			<div class="flex flex-col items-center justify-center gap-3 sm:flex-row">
				<Button onclick={() => history.back()} variant="outline" size="lg" class="min-w-[160px]">
					<ArrowLeft class="mr-2 h-4 w-4" />
					{m.error_go_back()}
				</Button>
				<Button href="/" size="lg" class="min-w-[160px]">
					<Home class="mr-2 h-4 w-4" />
					{m.error_home_button()}
				</Button>
			</div>
		</div>
	</section>
</div>

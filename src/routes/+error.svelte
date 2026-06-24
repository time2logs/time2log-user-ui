<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import Home from '@lucide/svelte/icons/house';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import { page } from '$app/stores';
	import * as m from '$lib/paraglide/messages.js';

	const status = $derived($page.status);

	const title = $derived(
		status === 404
			? m.error_page_not_found()
			: status === 403
				? m.error_page_access_denied()
				: status === 500
					? m.error_page_server_error()
					: m.error_page_generic()
	);

	const description = $derived(
		status === 404
			? m.error_page_not_found_desc()
			: status === 403
				? m.error_page_access_denied_desc()
				: m.error_page_generic_desc()
	);

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
				{title}
			</h1>

			<p class="mx-auto mb-8 max-w-md text-muted-foreground">
				{description}
			</p>

			<div class="flex flex-col items-center justify-center gap-3 sm:flex-row">
				<Button onclick={goBack} variant="outline" size="lg" class="min-w-[160px]">
					<ArrowLeft class="mr-2 h-4 w-4" />
					{m.go_back()}
				</Button>
				<Button href="/" size="lg" class="min-w-[160px]">
					<Home class="mr-2 h-4 w-4" />
					{m.home_button()}
				</Button>
			</div>
		</div>
	</section>
</div>

<script lang="ts">
	import * as m from '$lib/paraglide/messages.js';
	import GradientBackground from '$lib/components/gradient-background.svelte';
	import { Button } from '$lib/components/ui/button';
	import { ArrowLeft } from 'lucide-svelte';
</script>

<GradientBackground>
	<main class="flex flex-1 flex-col items-center justify-center gap-6 p-8">
		<div class="text-center">
			<h1 class="text-2xl font-bold text-stone-800">{m.settings_title()}</h1>
			<p class="mt-4 text-stone-600">{m.page_under_construction()}</p>
		</div>
		<Button variant="outline" href="/dashboard" class="gap-2">
			<ArrowLeft class="h-4 w-4" />
			Dashboard
		</Button>
	</main>
</GradientBackground>

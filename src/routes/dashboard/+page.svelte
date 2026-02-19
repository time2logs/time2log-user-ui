<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import CurriculumTree from '$lib/components/curriculum-tree.svelte';
	import * as m from '$lib/paraglide/messages.js';
	import GradientBackground from '$lib/components/gradient-background.svelte';
	import SiteHeader from '$lib/components/site-header.svelte';
	import GlassCard from '$lib/components/glass-card.svelte';

	let { data } = $props();

	const initials = $derived(
		data.profile ? `${data.profile.first_name[0]}${data.profile.last_name[0]}`.toUpperCase() : '?'
	);

	const fullName = $derived(
		data.profile ? `${data.profile.first_name} ${data.profile.last_name}` : 'Guest'
	);
</script>

<GradientBackground>
	<SiteHeader />

	<main class="flex-1 p-8">
		<div class="mx-auto max-w-4xl">
			<div class="mb-8 flex items-start justify-between gap-4">
				<div class="flex items-center gap-4">
					<div
						class="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-rose-400 text-xl font-semibold text-white shadow-lg"
					>
						{initials}
					</div>
					<div>
						<h1 class="text-2xl font-bold text-stone-800">{m.welcome({ name: fullName })}</h1>
						<p class="text-stone-600">{m.dashboard_subtitle()}</p>
					</div>
				</div>
			</div>

			<GlassCard class="mt-4">
				<Card.Header>
					<Card.Title class="text-lg font-bold text-stone-800 mt-4">{m.curriculum_title()}</Card.Title>
					<Card.Description class="text-sm text-stone-600 mb-2"
						>{m.curriculum_description()}</Card.Description
					>
				</Card.Header>
				<Card.Content class="p-0 mb-2">
					<CurriculumTree nodes={data.curriculumNodes} />
				</Card.Content>
			</GlassCard>
		</div>
	</main>
</GradientBackground>

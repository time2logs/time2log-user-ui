<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import CurriculumTree from '$lib/components/curriculum-tree.svelte';
	import LanguageSwitcher from '$lib/components/language-switcher.svelte';
	import * as m from '$lib/paraglide/messages.js';

	let { data } = $props();

	const initials = $derived(
		data.profile ? `${data.profile.first_name[0]}${data.profile.last_name[0]}`.toUpperCase() : '?'
	);

	const fullName = $derived(
		data.profile ? `${data.profile.first_name} ${data.profile.last_name}` : 'Guest'
	);
</script>

<div class="min-h-screen bg-gray-50 p-8">
	<div class="mx-auto max-w-4xl">
		<!-- Header with profile -->
		<div class="mb-8 flex items-center gap-4">
			<div
				class="flex h-16 w-16 items-center justify-center rounded-full bg-slate-700 text-xl font-semibold text-white"
			>
				{initials}
			</div>
			<div>
				<h1 class="text-2xl font-bold text-gray-900">{m.welcome({ name: fullName })}</h1>
				<p class="text-gray-500">{m.dashboard_subtitle()}</p>
			</div>
		</div>

		<!-- Language Switcher -->
		<div class="mb-6">
			<LanguageSwitcher />
		</div>

		<Card.Root>
			<Card.Header>
				<Card.Title>{m.curriculum_title()}</Card.Title>
				<Card.Description>{m.curriculum_description()}</Card.Description>
			</Card.Header>
			<Card.Content class="p-0">
				<CurriculumTree nodes={data.curriculumNodes} />
			</Card.Content>
		</Card.Root>
	</div>
</div>

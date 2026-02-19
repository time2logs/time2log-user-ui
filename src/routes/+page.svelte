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
		<!-- Frosted glass card -->
		<div
			class="relative mx-auto max-w-2xl overflow-hidden rounded-3xl border border-white/50 bg-white/25 p-8 shadow-xl backdrop-blur-2xl sm:p-12"
			style="box-shadow: 0 8px 32px 0 rgba(255, 200, 150, 0.1), inset 0 0 0 1px rgba(255, 255, 255, 0.5);"
		>
			<div class="flex items-center gap-4 mb-6">
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
	</section>
</div>


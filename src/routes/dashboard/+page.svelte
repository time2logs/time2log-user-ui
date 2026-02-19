<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import * as AlertDialog from '$lib/components/ui/alert-dialog';
	import { Button } from '$lib/components/ui/button';
	import CurriculumTree from '$lib/components/curriculum-tree.svelte';
	import * as m from '$lib/paraglide/messages.js';
	import GradientBackground from '$lib/components/gradient-background.svelte';
	import SiteHeader from '$lib/components/site-header.svelte';
	import GlassCard from '$lib/components/glass-card.svelte';
	import { logout } from '$lib/api';
	import { LogOut, Loader2 } from 'lucide-svelte';

	let { data } = $props();

	let isLoggingOut = $state(false);
	let dialogOpen = $state(false);

	async function handleLogout() {
		isLoggingOut = true;
		try {
			await logout();
		} catch (error) {
			console.error('Logout failed:', error);
			isLoggingOut = false;
		}
	}

	const initials = $derived(
		data.profile
			? `${data.profile.first_name[0]}${data.profile.last_name[0]}`.toUpperCase()
			: '?'
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

	<AlertDialog.Root bind:open={dialogOpen}>
		<AlertDialog.Content>
			<AlertDialog.Header>
				<AlertDialog.Title>Abmelden bestätigen</AlertDialog.Title>
				<AlertDialog.Description>Möchtest du dich wirklich ausloggen?</AlertDialog.Description>
			</AlertDialog.Header>
			<AlertDialog.Footer>
				<AlertDialog.Cancel>Abbrechen</AlertDialog.Cancel>
				<AlertDialog.Action
					onclick={handleLogout}
					disabled={isLoggingOut}
					class="bg-red-500 hover:bg-red-600"
				>
					{#if isLoggingOut}
						<Loader2 class="mr-2 h-4 w-4 animate-spin" /> Beende...
					{:else}
						Abmelden
					{/if}
				</AlertDialog.Action>
			</AlertDialog.Footer>
		</AlertDialog.Content>
	</AlertDialog.Root>
</div>

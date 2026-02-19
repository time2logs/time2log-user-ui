<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import * as AlertDialog from '$lib/components/ui/alert-dialog';
	import { Button } from '$lib/components/ui/button';
	import CurriculumTree from '$lib/components/curriculum-tree.svelte';
	import LanguageSwitcher from '$lib/components/language-switcher.svelte';
	import * as m from '$lib/paraglide/messages.js';
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
		data.profile ? `${data.profile.first_name[0]}${data.profile.last_name[0]}`.toUpperCase() : '?'
	);

	const fullName = $derived(
		data.profile ? `${data.profile.first_name} ${data.profile.last_name}` : 'Guest'
	);
</script>

<div class="min-h-screen bg-gray-50 p-8">
	<div class="mx-auto max-w-4xl">
		<!-- Header with profile and language switcher -->
		<div class="mb-8 flex items-start justify-between gap-4">
			<div class="flex items-center gap-4">
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
			<div class="flex items-center gap-2">
				<LanguageSwitcher />
				<Button
					variant="outline"
					onclick={() => (dialogOpen = true)}
					class="h-10 w-10 rounded-full p-0"
				>
					<LogOut class="h-4 w-4" />
				</Button>
			</div>
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

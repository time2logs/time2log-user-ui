<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import GradientBackground from '$lib/components/gradient-background.svelte';
	import SiteHeader from '$lib/components/site-header.svelte';
	import GlassCard from '$lib/components/glass-card.svelte';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Button } from '$lib/components/ui/button';
	import { enhance } from '$app/forms';
	import { Loader2 } from 'lucide-svelte';

	let { data, form } = $props();

	let firstName = $state('');
	let lastName = $state('');
	let password = $state('');
	let isSubmitting = $state(false);

	// Reactively sync initial values from form (on action failure)
	$effect(() => {
		firstName = form?.values?.firstName ?? '';
		lastName = form?.values?.lastName ?? '';
		password = '';
	});
</script>

<GradientBackground>
	<SiteHeader />

	<main class="flex-1 p-8">
		<div class="mx-auto max-w-lg">
			<GlassCard class="mt-4 p-8">
				{#if data.inviteError || !data.token}
					<!-- Error state: invalid or expired token -->
					<Card.Header>
						<Card.Title class="text-lg font-bold text-stone-800">Einladung ungültig</Card.Title>
						<Card.Description class="text-sm text-stone-600">
							{data.inviteError ?? 'Kein Einladungstoken vorhanden.'}
						</Card.Description>
					</Card.Header>
					<Card.Content class="pt-4">
						<p class="text-sm text-stone-500">
							Bitte öffne den Link, den du per E-Mail erhalten hast.
						</p>
					</Card.Content>
				{:else}
					<!-- Valid invite: show onboarding form -->
					<Card.Header>
						<Card.Title class="text-lg font-bold text-stone-800">
							Willkommen bei Time2Log!
						</Card.Title>
						<Card.Description class="text-sm text-stone-600">
							Du wurdest zu <strong>{data.inviteDetails.organization_name}</strong> eingeladen. Erstelle
							dein Konto, um loszulegen.
						</Card.Description>
					</Card.Header>
					<Card.Content class="pt-4">
						{#if form?.error}
							<div
								class="mb-4 rounded-md border border-red-200 bg-red-50/80 p-3 text-sm text-red-700"
							>
								{form.error}
							</div>
						{/if}

						<form
							method="POST"
							action="?/complete"
							use:enhance={() => {
								isSubmitting = true;
								return async ({ update }) => {
									isSubmitting = false;
									await update();
								};
							}}
							class="space-y-4"
						>
							<input type="hidden" name="invite_token" value={data.token} />

							<div>
								<Label for="email">E-Mail</Label>
								<Input
									id="email"
									name="email"
									type="email"
									value={data.inviteDetails.email}
									readonly
									disabled
									class="bg-stone-100 text-stone-500"
								/>
							</div>

							<div>
								<Label for="first_name">Vorname</Label>
								<Input
									id="first_name"
									name="first_name"
									bind:value={firstName}
									placeholder="Vorname"
									required
									disabled={isSubmitting}
								/>
							</div>

							<div>
								<Label for="last_name">Nachname</Label>
								<Input
									id="last_name"
									name="last_name"
									bind:value={lastName}
									placeholder="Nachname"
									required
									disabled={isSubmitting}
								/>
							</div>

							<div>
								<Label for="password">Passwort</Label>
								<Input
									id="password"
									name="password"
									type="password"
									bind:value={password}
									placeholder="Mindestens 8 Zeichen"
									required
									minlength={8}
									disabled={isSubmitting}
								/>
							</div>

							<Button type="submit" class="w-full" disabled={isSubmitting}>
								{#if isSubmitting}
									<Loader2 class="mr-2 h-4 w-4 animate-spin" />
									Konto wird erstellt...
								{:else}
									Konto erstellen
								{/if}
							</Button>
						</form>
					</Card.Content>
				{/if}
			</GlassCard>
		</div>
	</main>
</GradientBackground>

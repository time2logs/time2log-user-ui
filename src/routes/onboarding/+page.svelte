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
	import * as m from '$lib/paraglide/messages.js';

	let { data, form } = $props();

	let firstName = $state('');
	let lastName = $state('');
	let password = $state('');
	let isSubmitting = $state(false);

	let avatarFile: File | null = $state(null);
	let avatarPreviewUrl = $state('');
	let avatarError = $state('');

	function handleAvatarChange(e: Event) {
		const target = e.target as HTMLInputElement;
		const file = target.files?.[0];
		avatarError = '';
		
		if (file) {
			if (file.size > 5 * 1024 * 1024) {
				avatarError = 'File size exceeds 5MB limit. Please choose a smaller image.';
				avatarFile = null;
				avatarPreviewUrl = '';
				target.value = ''; // reset input
				return;
			}
			
			if (!file.type.startsWith('image/')) {
				avatarError = 'Unsupported file type. Please use JPEG, PNG, or WEBP.';
				avatarFile = null;
				avatarPreviewUrl = '';
				target.value = ''; // reset input
				return;
			}
			
			avatarFile = file;
			avatarPreviewUrl = URL.createObjectURL(file);
		} else {
			avatarFile = null;
			avatarPreviewUrl = '';
		}
	}

	$effect(() => {
		return () => {
			if (avatarPreviewUrl) URL.revokeObjectURL(avatarPreviewUrl);
		};
	});

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
						<Card.Title class="text-lg font-bold text-stone-800">
							{m.onboarding_invalid_invite()}
						</Card.Title>
						<Card.Description class="text-sm text-stone-600">
							{data.inviteError ?? m.onboarding_no_invite_token()}
						</Card.Description>
					</Card.Header>
					<Card.Content class="pt-4">
						<p class="text-sm text-stone-500">
							{m.onboarding_invalid_token_message()}
						</p>
					</Card.Content>
				{:else}
					<!-- Valid invite: show onboarding form -->
					<Card.Header>
						<Card.Title class="text-lg font-bold text-stone-800">
							{m.onboarding_welcome_title()}
						</Card.Title>
						<Card.Description class="text-sm text-stone-600">
							{@html m.onboarding_welcome_description({
								orgName: data.inviteDetails.organization_name
							})}
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
							enctype="multipart/form-data"
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
								<Label for="avatar">Profile Picture (Optional)</Label>
								<div class="mt-2 flex items-center gap-4">
									{#if avatarPreviewUrl}
										<div class="relative h-16 w-16 shrink-0 overflow-hidden rounded-full border border-stone-200">
											<img src={avatarPreviewUrl} alt="Avatar preview" class="h-full w-full object-cover" />
										</div>
									{:else}
										<div class="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-dashed border-stone-300 bg-stone-50 text-stone-400">
											<span class="text-xs">No image</span>
										</div>
									{/if}
									<div class="flex-1">
										<Input
											id="avatar"
											name="avatar"
											type="file"
											accept="image/jpeg, image/png, image/webp"
											onchange={handleAvatarChange}
											disabled={isSubmitting}
											class="text-sm file:mr-4 file:rounded-md file:border-0 file:bg-stone-100 file:px-4 file:py-2 file:text-sm file:font-semibold hover:file:bg-stone-200"
										/>
									</div>
								</div>
								{#if avatarError}
									<p class="mt-1 text-sm text-red-600">{avatarError}</p>
								{/if}
							</div>

							<div>
								<Label for="email">{m.onboarding_email_label()}</Label>
								<Input
									id="email"
									name="email"
									type="email"
									value={data.inviteDetails.email}
									readonly
									class="bg-stone-100 text-stone-500"
								/>
							</div>

							<div>
								<Label for="first_name">{m.onboarding_first_name_label()}</Label>
								<Input
									id="first_name"
									name="first_name"
									bind:value={firstName}
									placeholder={m.onboarding_first_name_placeholder()}
									required
									disabled={isSubmitting}
								/>
							</div>

							<div>
								<Label for="last_name">{m.onboarding_last_name_label()}</Label>
								<Input
									id="last_name"
									name="last_name"
									bind:value={lastName}
									placeholder={m.onboarding_last_name_placeholder()}
									required
									disabled={isSubmitting}
								/>
							</div>

							<div>
								<Label for="password">{m.onboarding_password_label()}</Label>
								<Input
									id="password"
									name="password"
									type="password"
									bind:value={password}
									placeholder={m.onboarding_password_placeholder()}
									required
									minlength={8}
									disabled={isSubmitting}
								/>
							</div>

							<Button type="submit" class="w-full" disabled={isSubmitting}>
								{#if isSubmitting}
									<Loader2 class="mr-2 h-4 w-4 animate-spin" />
									{m.onboarding_creating_account()}
								{:else}
									{m.onboarding_create_account()}
								{/if}
							</Button>
						</form>
					</Card.Content>
				{/if}
			</GlassCard>
		</div>
	</main>
</GradientBackground>

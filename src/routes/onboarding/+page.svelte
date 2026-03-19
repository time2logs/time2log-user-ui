<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import GradientBackground from '$lib/components/gradient-background.svelte';
	import SiteHeader from '$lib/components/site-header.svelte';
	import GlassCard from '$lib/components/glass-card.svelte';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Button } from '$lib/components/ui/button';
	import { enhance } from '$app/forms';
	import { Loader2, Plus } from 'lucide-svelte';
	import * as m from '$lib/paraglide/messages.js';

	let { data, form } = $props();

	let firstName = $state('');
	let lastName = $state('');
	let password = $state('');
	let isSubmitting = $state(false);
	let isCompressing = $state(false);

	let avatarFile: File | null = $state(null);
	let avatarPreviewUrl = $state('');
	let avatarError = $state('');
	let fileInput: HTMLInputElement;

	async function compressImage(file: File): Promise<Blob> {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.readAsDataURL(file);
			reader.onload = (event) => {
				const img = new Image();
				img.src = event.target?.result as string;
				img.onload = () => {
					const canvas = document.createElement('canvas');
					let MAX_WIDTH = 800;
					let MAX_HEIGHT = 800;
					let width = img.width;
					let height = img.height;

					if (width > height) {
						if (width > MAX_WIDTH) {
							height *= MAX_WIDTH / width;
							width = MAX_WIDTH;
						}
					} else {
						if (height > MAX_HEIGHT) {
							width *= MAX_HEIGHT / height;
							height = MAX_HEIGHT;
						}
					}

					canvas.width = width;
					canvas.height = height;
					const ctx = canvas.getContext('2d');
					ctx?.drawImage(img, 0, 0, width, height);

					// Start with high quality and decrease until under 0.5MB
					let quality = 0.9;
					const targetSize = 500 * 1024; // 0.5MB

					const attemptBlob = () => {
						canvas.toBlob(
							(blob) => {
								if (blob) {
									if (blob.size > targetSize && quality > 0.1) {
										quality -= 0.1;
										attemptBlob();
									} else if (blob.size > targetSize && MAX_WIDTH > 200) {
										// If still too big, try resizing even smaller
										MAX_WIDTH -= 200;
										MAX_HEIGHT -= 200;

										let newWidth = img.width;
										let newHeight = img.height;
										if (newWidth > newHeight) {
											if (newWidth > MAX_WIDTH) {
												newHeight *= MAX_WIDTH / newWidth;
												newWidth = MAX_WIDTH;
											}
										} else {
											if (newHeight > MAX_HEIGHT) {
												newWidth *= MAX_HEIGHT / newHeight;
												newHeight = MAX_HEIGHT;
											}
										}
										canvas.width = newWidth;
										canvas.height = newHeight;
										ctx?.drawImage(img, 0, 0, newWidth, newHeight);
										quality = 0.7; // Reset quality for smaller dimensions
										attemptBlob();
									} else {
										resolve(blob);
									}
								} else {
									reject(new Error('Canvas to Blob failed'));
								}
							},
							'image/jpeg',
							quality
						);
					};
					attemptBlob();
				};
				img.onerror = () => reject(new Error('Image load failed'));
			};
			reader.onerror = () => reject(new Error('FileReader failed'));
		});
	}

	async function handleAvatarChange(e: Event) {
		const target = e.target as HTMLInputElement;
		const file = target.files?.[0];
		avatarError = '';

		if (file) {
			if (!file.type.startsWith('image/')) {
				avatarError = 'Unsupported file type. Please use JPEG, PNG, or WEBP.';
				avatarFile = null;
				avatarPreviewUrl = '';
				target.value = '';
				return;
			}

			try {
				isCompressing = true;
				const compressedBlob = await compressImage(file);
				const compressedFile = new File([compressedBlob], 'avatar.jpg', { type: 'image/jpeg' });

				avatarFile = compressedFile;
				if (avatarPreviewUrl) URL.revokeObjectURL(avatarPreviewUrl);
				avatarPreviewUrl = URL.createObjectURL(compressedFile);
			} catch (err) {
				console.error('Compression failed:', err);
				avatarError = 'Failed to process image. Please try another one.';
			} finally {
				isCompressing = false;
			}
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
						<Card.Title class="text-lg font-bold text-stone-800 dark:text-slate-100">
							{m.onboarding_invalid_invite()}
						</Card.Title>
						<Card.Description class="text-sm text-stone-600 dark:text-slate-400">
							{data.inviteError ?? m.onboarding_no_invite_token()}
						</Card.Description>
					</Card.Header>
					<Card.Content class="pt-4">
						<p class="text-sm text-stone-500 dark:text-slate-500">
							{m.onboarding_invalid_token_message()}
						</p>
					</Card.Content>
				{:else}
					<!-- Valid invite: show onboarding form -->
					<Card.Header>
						<Card.Title class="text-lg font-bold text-stone-800 dark:text-slate-100">
							{m.onboarding_welcome_title()}
						</Card.Title>
						<Card.Description class="text-sm text-stone-600 dark:text-slate-400">
							{@html m.onboarding_welcome_description({
								orgName: data.inviteDetails.organization_name
							})}
						</Card.Description>
					</Card.Header>
					<Card.Content class="pt-4">
						{#if form?.error}
							<div
								class="mb-4 rounded-md border border-red-200 bg-red-50/80 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
							>
								{form.error}
							</div>
						{/if}

						<form
							method="POST"
							action="?/complete"
							enctype="multipart/form-data"
							use:enhance={({ formData }) => {
								isSubmitting = true;
								if (avatarFile) {
									formData.set('avatar', avatarFile);
								}
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
								<div class="mt-2 flex flex-col items-center gap-4">
									<button
										type="button"
										onclick={() => fileInput.click()}
										class="group relative h-24 w-24 overflow-hidden rounded-full border-2 border-dashed border-stone-300 bg-stone-50 transition-all hover:border-orange-400 hover:bg-stone-100 disabled:cursor-not-allowed dark:border-slate-600 dark:bg-slate-800 dark:hover:border-orange-400"
										disabled={isSubmitting}
									>
										{#if avatarPreviewUrl}
											<img
												src={avatarPreviewUrl}
												alt="Avatar preview"
												class="h-full w-full object-cover transition-opacity group-hover:opacity-50"
											/>
										{:else}
											<div
												class="flex h-full w-full items-center justify-center text-stone-400 group-hover:text-orange-500 dark:text-slate-500 dark:group-hover:text-orange-400"
											>
												<Plus class="h-8 w-8" />
											</div>
										{/if}

										<div
											class="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100"
										>
											<div class="rounded-full bg-white/80 p-2 shadow-sm dark:bg-slate-700">
												<Plus class="h-5 w-5 text-orange-600 dark:text-orange-400" />
											</div>
										</div>
									</button>

									<input
										bind:this={fileInput}
										id="avatar"
										name="avatar"
										type="file"
										accept="image/jpeg, image/png, image/webp"
										onchange={handleAvatarChange}
										class="hidden"
										disabled={isSubmitting}
									/>

									<p class="text-xs text-stone-500 dark:text-slate-500">
										Click to upload. JPG, PNG or WEBP (max. 0.5MB after auto-compression)
									</p>
								</div>
								{#if avatarError}
									<p class="mt-2 text-center text-sm text-red-600 dark:text-red-400">
										{avatarError}
									</p>
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
									class="bg-stone-100 text-stone-500 dark:bg-slate-800 dark:text-slate-400"
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

							<Button type="submit" class="w-full" disabled={isSubmitting || isCompressing}>
								{#if isSubmitting}
									<Loader2 class="mr-2 h-4 w-4 animate-spin" />
									{m.onboarding_creating_account()}
								{:else if isCompressing}
									<Loader2 class="mr-2 h-4 w-4 animate-spin" />
									Processing image...
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

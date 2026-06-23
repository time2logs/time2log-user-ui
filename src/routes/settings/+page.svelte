<script lang="ts">
	import * as m from '$lib/paraglide/messages.js';
	import LanguageSwitcher from '$lib/components/language-switcher.svelte';
	import { Input } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button';
	import { Separator } from '$lib/components/ui/separator';
	import { ConfirmDialog } from '$lib/components/ui/confirm-dialog';
	import { Alert } from '$lib/components/ui/alert';
	import { Spinner } from '$lib/components/ui/spinner';
	import { FormField } from '$lib/components/ui/form-field';
	import { enhance } from '$app/forms';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import User from '@lucide/svelte/icons/user';
	import Globe from '@lucide/svelte/icons/globe';
	import LogOut from '@lucide/svelte/icons/log-out';
	import Moon from '@lucide/svelte/icons/moon';
	import Sun from '@lucide/svelte/icons/sun';
	import Camera from '@lucide/svelte/icons/camera';
	import ShieldAlert from '@lucide/svelte/icons/shield-alert';
	import { theme } from '$lib/themeStore';
	import AmbientGlow from '$lib/components/ambient-glow.svelte';
	import * as Select from '$lib/components/ui/select';
	import { palette, type Palette } from '$lib/paletteStore';

	let currentPalette = $state<Palette>('default');
	palette.subscribe((p) => {
		currentPalette = p;
	});

	type SettingsForm = {
		profileError?: string;
		profileSuccess?: boolean;
		emailError?: string;
		emailSuccess?: boolean;
		emailOtpSent?: boolean;
		passwordError?: string;
		passwordSuccess?: boolean;
	} | null;

	let { data, form: rawForm } = $props();
	const form = $derived(rawForm as SettingsForm);

	let isLoggingOut = $state(false);
	let logoutDialogOpen = $state(false);
	let isSaving = $state(false);
	let isSavingEmail = $state(false);
	let isSendingEmailOtp = $state(false);
	let isSavingPassword = $state(false);
	let isCompressing = $state(false);
	let currentTheme = $state<'light' | 'dark'>('light');

	let firstName = $state(data.profile?.first_name ?? '');
	let lastName = $state(data.profile?.last_name ?? '');
	let emailValue = $state(data.email ?? '');

	$effect(() => {
		firstName = data.profile?.first_name ?? '';
		lastName = data.profile?.last_name ?? '';
		emailValue = data.email ?? '';
	});

	let avatarFile: File | null = $state(null);
	let avatarPreviewUrl = $state('');
	let avatarError = $state('');
	let fileInput: HTMLInputElement | undefined = $state();

	theme.subscribe((t) => {
		currentTheme = t;
	});

	const initials = $derived(
		data.profile
			? `${data.profile.first_name?.[0] ?? ''}${data.profile.last_name?.[0] ?? ''}`.toUpperCase() ||
					'?'
			: '?'
	);

	const displayAvatarUrl = $derived(avatarPreviewUrl || data.profile?.avatar_url || null);

	function handleLogout() {
		isLoggingOut = true;
		window.location.href = '/logout';
	}

	function toggleTheme() {
		theme.toggle();
	}

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

					let quality = 0.9;
					const targetSize = 500 * 1024;

					const attemptBlob = () => {
						canvas.toBlob(
							(blob) => {
								if (blob) {
									if (blob.size > targetSize && quality > 0.1) {
										quality -= 0.1;
										attemptBlob();
									} else if (blob.size > targetSize && MAX_WIDTH > 200) {
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
										quality = 0.7;
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
				avatarError = m.settings_error_file_type();
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
				avatarError = m.settings_error_file_type();
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
</script>

<div class="relative flex min-h-screen flex-col overflow-hidden bg-background text-foreground">
	<AmbientGlow />
	<main class="relative z-10 flex flex-1 flex-col items-center p-4 pt-6 sm:p-8 sm:pt-12">
		<div class="w-full max-w-md">
			<Button
				variant="ghost"
				href="/dashboard"
				class="mb-4 gap-2 self-start text-muted-foreground sm:mb-6"
			>
				<ArrowLeft class="h-4 w-4" />
				{m.back_to_dashboard()}
			</Button>

			<h1 class="mb-4 text-2xl font-bold text-foreground sm:mb-8 sm:text-3xl">
				{m.settings_title()}
			</h1>

			<div class="space-y-6">
				<div class="rounded-xl border border-border bg-card shadow-sm">
					<form
						method="POST"
						action="?/updateProfile"
						enctype="multipart/form-data"
						use:enhance={({ formData }) => {
							isSaving = true;
							if (avatarFile) {
								formData.set('avatar', avatarFile);
							}
							return async ({ update }) => {
								isSaving = false;
								await update();
								avatarFile = null;
								if (avatarPreviewUrl) {
									URL.revokeObjectURL(avatarPreviewUrl);
									avatarPreviewUrl = '';
								}
							};
						}}
					>
						<div class="p-4">
							<div class="mb-4 flex items-center gap-2 text-foreground">
								<User class="h-5 w-5" />
								<h3 class="font-semibold">{m.profile_settings()}</h3>
							</div>

							<!-- Avatar -->
							<div class="mb-5 flex flex-col items-center gap-2">
								<button
									type="button"
									onclick={() => fileInput?.click()}
									class="group relative h-20 w-20 overflow-hidden rounded-full border-2 border-border shadow-sm transition-all hover:border-border hover:border-primary"
									disabled={isSaving || isCompressing}
								>
									{#if displayAvatarUrl}
										<img
											src={displayAvatarUrl}
											alt={m.change_avatar()}
											class="h-full w-full object-cover transition-opacity group-hover:opacity-60"
										/>
									{:else}
										<div
											class="flex h-full w-full items-center justify-center bg-primary/10 text-xl font-semibold text-primary ring-1 ring-primary/20 transition-opacity group-hover:opacity-60"
										>
											{initials}
										</div>
									{/if}
									<div
										class="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100"
									>
										{#if isCompressing}
											<Spinner class="h-5 w-5 text-white drop-shadow" />
										{:else}
											<Camera class="h-5 w-5 text-white drop-shadow" />
										{/if}
									</div>
								</button>
								<input
									bind:this={fileInput}
									type="file"
									accept="image/jpeg,image/png,image/webp"
									class="hidden"
									onchange={handleAvatarChange}
									disabled={isSaving || isCompressing}
								/>
								{#if avatarError}
									<p class="text-xs text-destructive">{avatarError}</p>
								{:else}
									<p class="text-xs text-muted-foreground">{m.change_avatar()}</p>
								{/if}
							</div>

							<div class="space-y-3">
								<FormField label={m.first_name()} htmlFor="first_name">
									<Input
										id="first_name"
										name="first_name"
										type="text"
										bind:value={firstName}
										disabled={isSaving}
										required
									/>
								</FormField>
								<Separator />
								<FormField label={m.last_name()} htmlFor="last_name">
									<Input
										id="last_name"
										name="last_name"
										type="text"
										bind:value={lastName}
										disabled={isSaving}
										required
									/>
								</FormField>
							</div>

							{#if form?.profileError}
								<Alert variant="error" class="mt-4">{form.profileError}</Alert>
							{/if}
							{#if form?.profileSuccess}
								<Alert variant="success" class="mt-4">{m.settings_profile_saved()}</Alert>
							{/if}

							<Button type="submit" class="mt-4 w-full" disabled={isSaving || isCompressing}>
								{#if isSaving}
									<Spinner size="sm" class="mr-2" />
									{m.saving()}
								{:else}
									{m.save()}
								{/if}
							</Button>
						</div>
					</form>
				</div>

				<div class="rounded-xl border border-border bg-card shadow-sm">
					<div class="p-4">
						<div class="mb-4 flex items-center gap-2 text-foreground">
							<Moon class="h-5 w-5" />
							<h3 class="font-semibold">{m.appearance_settings()}</h3>
						</div>
						<div class="flex items-center justify-between">
							<span class="text-muted-foreground">
								{currentTheme === 'dark' ? m.dark_mode() : m.light_mode()}
							</span>
							<button
								type="button"
								onclick={toggleTheme}
								aria-label={currentTheme === 'dark'
									? 'Switch to light mode'
									: 'Switch to dark mode'}
								class="relative h-7 w-14 rounded-full transition-colors duration-300 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none {currentTheme ===
								'dark'
									? 'bg-primary'
									: 'bg-muted'}"
							>
								<span
									class="absolute top-1 h-5 w-5 rounded-full bg-white shadow-md transition-all duration-300 {currentTheme ===
									'dark'
										? 'left-[34px]'
										: 'left-1'}"
								>
									{#if currentTheme === 'dark'}
										<Moon class="mt-0.5 ml-0.5 h-4 w-4 text-primary" />
									{:else}
										<Sun class="mt-0.5 ml-0.5 h-4 w-4 text-primary" />
									{/if}
								</span>
							</button>
							<div class="mt-4 flex flex-col gap-2">
								<span class="text-muted-foreground">Farbschema</span>
								<Select.Root
									type="single"
									value={currentPalette}
									onValueChange={(v) => palette.set(v as Palette)}
								>
									<Select.Trigger class="w-44">
										{{
											default: 'Standard',
											deuteranopia: 'Deuteranopie',
											protanopia: 'Protanopie',
											monochrome: 'Monochrom'
										}[currentPalette]}
									</Select.Trigger>
									<Select.Content>
										<Select.Item value="default" label="Standard">Standard</Select.Item>
										<Select.Item value="deuteranopia" label="Deuteranopie">Deuteranopie</Select.Item
										>
										<Select.Item value="protanopia" label="Protanopie">Protanopie</Select.Item>
										<Select.Item value="monochrome" label="Monochrom">Monochrom</Select.Item>
									</Select.Content>
								</Select.Root>
							</div>
						</div>
					</div>
				</div>

				<div class="rounded-xl border border-border bg-card shadow-sm">
					<div class="p-4">
						<div class="mb-4 flex items-center gap-2 text-foreground">
							<Globe class="h-5 w-5" />
							<h3 class="font-semibold">{m.language_settings()}</h3>
						</div>
						<LanguageSwitcher />
					</div>
				</div>

				<!-- Danger Zone -->
				<div class="rounded-xl border border-destructive/20 bg-destructive/5">
					<div class="p-4">
						<div class="mb-4 flex items-center gap-2 text-destructive">
							<ShieldAlert class="h-5 w-5" />
							<h3 class="font-semibold">{m.danger_zone()}</h3>
						</div>

						<div class="space-y-6">
							<!-- Change email -->
							<form
								method="POST"
								action="?/sendEmailOtp"
								use:enhance={() => {
									isSendingEmailOtp = true;
									return async ({ update }) => {
										isSendingEmailOtp = false;
										await update();
									};
								}}
							>
								<Button type="submit" variant="outline" class="w-full" disabled={isSendingEmailOtp}>
									{#if isSendingEmailOtp}
										<Spinner size="sm" class="mr-2" />
										{m.saving()}
									{:else}
										{m.settings_send_email_otp()}
									{/if}
								</Button>
							</form>

							<form
								method="POST"
								action="?/updateEmail"
								use:enhance={() => {
									isSavingEmail = true;
									return async ({ update }) => {
										isSavingEmail = false;
										await update();
									};
								}}
								class="space-y-3"
							>
								<p class="text-sm font-medium text-foreground">
									{m.change_email()}
								</p>
								<FormField label={m.settings_current_email_label()} htmlFor="current_email">
									<Input
										id="current_email"
										name="current_email"
										type="email"
										placeholder={data.email ?? ''}
										disabled={isSavingEmail}
									/>
								</FormField>
								<FormField label={m.settings_email_otp_label()} htmlFor="otp">
									<Input
										id="otp"
										name="otp"
										inputmode="numeric"
										autocomplete="one-time-code"
										disabled={isSavingEmail}
									/>
								</FormField>
								<FormField label={m.settings_new_email_label()} htmlFor="email">
									<Input
										id="email"
										name="email"
										type="email"
										bind:value={emailValue}
										disabled={isSavingEmail}
									/>
								</FormField>
								{#if form?.emailError}
									<Alert variant="error">{form.emailError}</Alert>
								{/if}
								{#if form?.emailOtpSent}
									<Alert variant="success">{m.settings_email_otp_sent()}</Alert>
								{/if}
								{#if form?.emailSuccess}
									<Alert variant="success">{m.settings_email_confirmation_sent()}</Alert>
								{/if}
								<Button
									type="submit"
									variant="outline"
									class="w-full border-destructive/20 text-destructive hover:bg-destructive/10"
									disabled={isSavingEmail}
								>
									{#if isSavingEmail}
										<Spinner size="sm" class="mr-2" />
										{m.saving()}
									{:else}
										{m.change_email()}
									{/if}
								</Button>
							</form>

							<Separator class="border-destructive/20 " />

							<!-- Change password -->
							<form
								method="POST"
								action="?/updatePassword"
								use:enhance={() => {
									isSavingPassword = true;
									return async ({ update }) => {
										isSavingPassword = false;
										await update();
									};
								}}
								class="space-y-3"
							>
								<p class="text-sm font-medium text-foreground">
									{m.change_password_title()}
								</p>
								<FormField label={m.new_password_label()} htmlFor="password">
									<Input
										id="password"
										name="password"
										type="password"
										placeholder={m.onboarding_password_placeholder()}
										disabled={isSavingPassword}
									/>
								</FormField>
								<FormField label={m.confirm_password_label()} htmlFor="confirm_password">
									<Input
										id="confirm_password"
										name="confirm_password"
										type="password"
										placeholder={m.onboarding_password_placeholder()}
										disabled={isSavingPassword}
									/>
								</FormField>
								{#if form?.passwordError}
									<Alert variant="error">{form.passwordError}</Alert>
								{/if}
								{#if form?.passwordSuccess}
									<Alert variant="success">{m.settings_password_saved()}</Alert>
								{/if}
								<Button
									type="submit"
									variant="outline"
									class="w-full border-destructive/20 text-destructive hover:bg-destructive/10"
									disabled={isSavingPassword}
								>
									{#if isSavingPassword}
										<Spinner size="sm" class="mr-2" />
										{m.saving()}
									{:else}
										{m.change_password_title()}
									{/if}
								</Button>
							</form>

							<Separator class="border-destructive/20 " />

							<!-- Logout -->
							<div>
								<p class="mb-3 text-sm font-medium text-foreground">
									{m.account()}
								</p>
								<Button
									variant="outline"
									onclick={() => (logoutDialogOpen = true)}
									class="w-full justify-start gap-2 border-destructive/20 bg-destructive/5 text-destructive hover:bg-destructive/10"
								>
									<LogOut class="h-4 w-4" />
									{m.logout()}
								</Button>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	</main>
</div>

<ConfirmDialog
	bind:open={logoutDialogOpen}
	title={m.logout_confirm_title()}
	description={m.logout_confirm_description()}
	confirmLabel={m.logout()}
	cancelLabel={m.cancel()}
	variant="destructive"
	loading={isLoggingOut}
	onConfirm={handleLogout}
/>

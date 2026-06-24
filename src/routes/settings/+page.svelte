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
	import AccountChangeDialog from '$lib/components/account-change-dialog.svelte';
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import User from '@lucide/svelte/icons/user';
	import Globe from '@lucide/svelte/icons/globe';
	import LogOut from '@lucide/svelte/icons/log-out';
	import Moon from '@lucide/svelte/icons/moon';
	import Sun from '@lucide/svelte/icons/sun';
	import Camera from '@lucide/svelte/icons/camera';
	import ShieldAlert from '@lucide/svelte/icons/shield-alert';
	import Mail from '@lucide/svelte/icons/mail';
	import KeyRound from '@lucide/svelte/icons/key-round';
	import { theme } from '$lib/themeStore';
	import AmbientGlow from '$lib/components/ambient-glow.svelte';
	import * as Select from '$lib/components/ui/select';
	import { palette, type Palette } from '$lib/paletteStore';
	import { untrack } from 'svelte';
	import { compressImage } from '$lib/imageUtils';
	import { getInitials } from '$lib/userUtils';

	let currentPalette = $derived<Palette>($palette);

	type SettingsForm = {
		profileError?: string;
		profileSuccess?: boolean;
	} | null;

	let { data, form: rawForm } = $props();
	const form = $derived(rawForm as SettingsForm);

	let isLoggingOut = $state(false);
	let logoutDialogOpen = $state(false);
	let isSaving = $state(false);
	let isCompressing = $state(false);
	let dialogOpen = $state(false);
	let dialogMode = $state<'email' | 'password'>('email');
	let currentTheme = $derived<'light' | 'dark'>($theme);

	let firstName = $state(untrack(() => data.profile?.first_name ?? ''));
	let lastName = $state(untrack(() => data.profile?.last_name ?? ''));

	$effect(() => {
		firstName = data.profile?.first_name ?? '';
		lastName = data.profile?.last_name ?? '';
	});

	let avatarFile: File | null = $state(null);
	let avatarPreviewUrl = $state('');
	let avatarError = $state('');
	let fileInput: HTMLInputElement | undefined = $state();

	theme.subscribe((t) => {
		currentTheme = t;
	});

	const initials = $derived(
		data.profile ? getInitials(data.profile.first_name, data.profile.last_name) : '?'
	);

	const displayAvatarUrl = $derived(avatarPreviewUrl || data.profile?.avatar_url || null);

	function handleLogout() {
		isLoggingOut = true;
		window.location.href = '/logout';
	}

	function toggleTheme() {
		theme.toggle();
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
									aria-label={m.change_avatar()}
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
									id="avatar"
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
									? m.theme_switch_light()
									: m.theme_switch_dark()}
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
								<span class="text-muted-foreground">{m.color_scheme()}</span>
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

						<div class="space-y-3">
							<p class="text-sm text-muted-foreground">
								{data.email ?? '—'}
							</p>

							<Button
								variant="outline"
								class="w-full justify-start gap-2 border-destructive/20 text-destructive hover:bg-destructive/10"
								onclick={() => {
									dialogMode = 'email';
									dialogOpen = true;
								}}
							>
								<Mail class="h-4 w-4" />
								{m.change_email()}
							</Button>

							<Button
								variant="outline"
								class="w-full justify-start gap-2 border-destructive/20 text-destructive hover:bg-destructive/10"
								onclick={() => {
									dialogMode = 'password';
									dialogOpen = true;
								}}
							>
								<KeyRound class="h-4 w-4" />
								{m.change_password_title()}
							</Button>

							<Separator class="border-destructive/20" />

							<!-- Logout -->
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

<AccountChangeDialog
	bind:open={dialogOpen}
	mode={dialogMode}
	currentEmail={data.email ?? ''}
	onsuccess={() => invalidateAll()}
/>

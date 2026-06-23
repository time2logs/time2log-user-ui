<script lang="ts">
	import { onMount } from 'svelte';
	import { Alert } from '$lib/components/ui/alert';
	import { Spinner } from '$lib/components/ui/spinner';
	import { FormField } from '$lib/components/ui/form-field';
	import { buttonVariants } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as Card from '$lib/components/ui/card';
	import { cn } from '$lib/utils';
	import * as m from '$lib/paraglide/messages.js';
	import LanguageSwitcher from '$lib/components/language-switcher.svelte';
	import AmbientGlow from '$lib/components/ambient-glow.svelte';
	import { supabase } from '$lib/supabaseClient';

	let password = $state('');
	let confirmPassword = $state('');
	let errorMessage = $state('');
	let linkInvalid = $state(false);
	let isLoading = $state(false);
	let isReady = $state(false);

	onMount(async () => {
		const hash = new URLSearchParams(window.location.hash.slice(1));
		const linkError = hash.get('error_description');
		if (linkError) {
			errorMessage = linkError;
			linkInvalid = true;
			isReady = true;
			return;
		}

		const {
			data: { session }
		} = await supabase.auth.getSession();
		if (!session) {
			errorMessage = m.reset_password_invalid_link();
			linkInvalid = true;
		}
		isReady = true;
	});

	async function resetPassword() {
		errorMessage = '';

		if (password !== confirmPassword) {
			errorMessage = m.settings_error_password_mismatch();
			return;
		}
		if (!password || password.length < 8) {
			errorMessage = m.onboarding_error_password_length();
			return;
		}
		if (!/[A-Z]/.test(password)) {
			errorMessage = m.onboarding_error_password_uppercase();
			return;
		}
		if (!/[0-9]/.test(password)) {
			errorMessage = m.onboarding_error_password_number();
			return;
		}
		if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(password)) {
			errorMessage = m.onboarding_error_password_special();
			return;
		}

		isLoading = true;
		const { error } = await supabase.auth.updateUser({ password });
		isLoading = false;

		if (error) {
			errorMessage = error.message || m.reset_password_failed();
			return;
		}

		await supabase.auth.signOut();
		window.location.href = '/login?reset=1';
	}
</script>

<div class="relative flex min-h-screen flex-col overflow-hidden bg-background text-foreground">
	<AmbientGlow />

	<header
		class="relative z-10 border-b bg-background/95 px-8 py-4 backdrop-blur supports-[backdrop-filter]:bg-background/60"
	>
		<div class="mx-auto flex max-w-6xl items-center justify-between">
			<div class="flex items-center gap-2">
				<a class="text-xl font-bold" href="/">time2log</a>
			</div>
			<LanguageSwitcher />
		</div>
	</header>

	<main class="relative z-10 flex flex-1 items-center justify-center px-4 py-12">
		<Card.Root class="w-full max-w-sm">
			<Card.Header class="pt-8">
				<Card.Title class="text-2xl font-bold">
					{m.reset_password_title()}
				</Card.Title>
				<Card.Description>
					{m.reset_password_description()}
				</Card.Description>
			</Card.Header>
			<Card.Content class="pb-8">
				<form
					onsubmit={(e) => {
						e.preventDefault();
						resetPassword();
					}}
					class="grid gap-8"
				>
					{#if errorMessage}
						<Alert variant="error">{errorMessage}</Alert>
					{/if}

					<FormField label={m.new_password_label()} htmlFor="password">
						<Input
							id="password"
							type="password"
							placeholder={m.onboarding_password_placeholder()}
							bind:value={password}
							required
							disabled={isLoading || !isReady || linkInvalid}
						/>
					</FormField>
					<FormField label={m.confirm_password_label()} htmlFor="confirm_password">
						<Input
							id="confirm_password"
							type="password"
							placeholder={m.onboarding_password_placeholder()}
							bind:value={confirmPassword}
							required
							disabled={isLoading || !isReady || linkInvalid}
						/>
					</FormField>

					<button
						type="submit"
						class={cn(buttonVariants(), 'w-full')}
						disabled={isLoading || !isReady || linkInvalid}
					>
						{#if isLoading || !isReady}
							<Spinner size="sm" class="mr-2" />
							{m.saving()}
						{:else}
							{m.reset_password_button()}
						{/if}
					</button>
				</form>
			</Card.Content>
		</Card.Root>
	</main>

	<footer class="relative z-10 border-t bg-muted/20 px-4 py-8">
		<div class="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
			<div class="flex items-center gap-2">
				<a class="font-semibold text-muted-foreground" href="/">time2log</a>
			</div>
			<p class="text-sm text-muted-foreground">
				&copy; {new Date().getFullYear()} time2log. All rights reserved.
			</p>
		</div>
	</footer>
</div>

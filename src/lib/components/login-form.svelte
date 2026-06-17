<script lang="ts">
	import { Spinner } from '$lib/components/ui/spinner';
	import { Alert } from '$lib/components/ui/alert';
	import { FormField } from '$lib/components/ui/form-field';
	import { buttonVariants } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as Card from '$lib/components/ui/card';
	import { supabase } from '$lib/supabaseClient';
	import { cn } from '$lib/utils';
	import * as m from '$lib/paraglide/messages.js';
	import LanguageSwitcher from '$lib/components/language-switcher.svelte';
	import AmbientGlow from '$lib/components/ambient-glow.svelte';

	let email = $state('');
	let password = $state('');
	let errorMessage = $state('');
	let isLoading = $state(false);

	async function signInWithEmail() {
		isLoading = true;
		const { error } = await supabase.auth.signInWithPassword({
			email: email,
			password: password
		});
		errorMessage = error ? error.message : '';
		isLoading = false;

		if (!error) {
			window.location.href = '/dashboard';
		}
	}
</script>

<div class="relative flex min-h-screen flex-col overflow-hidden bg-background text-foreground">
	<!-- Subtle background glow -->
	<AmbientGlow />

	<!-- Header -->
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

	<!-- Main Content -->
	<main class="relative z-10 flex flex-1 items-center justify-center px-4 py-12">
		<Card.Root class="w-full max-w-sm">
			<Card.Header class="pt-8">
				<Card.Title class="text-2xl font-bold">
					{m.login_title()}
				</Card.Title>
				<Card.Description>
					{m.login_description()}
				</Card.Description>
			</Card.Header>
			<Card.Content class="pb-8">
				<form
					onsubmit={(e) => {
						e.preventDefault();
						signInWithEmail();
					}}
					class="grid gap-8"
				>
					{#if errorMessage}
						<Alert variant="error">{errorMessage}</Alert>
					{/if}

					<FormField label={m.email_label()} htmlFor="email">
						<Input
							id="email"
							type="email"
							placeholder="hans.muster@gmail.com"
							bind:value={email}
							required
							disabled={isLoading}
						/>
					</FormField>
					<FormField label={m.password_label()} htmlFor="password">
						<Input
							id="password"
							type="password"
							bind:value={password}
							required
							disabled={isLoading}
						/>
					</FormField>
					<button type="submit" class={cn(buttonVariants(), 'w-full')} disabled={isLoading}>
						{#if isLoading}
							<Spinner size="sm" class="mr-2" />
							{m.logging_in()}
						{:else}
							{m.login_button()}
						{/if}
					</button>
				</form>
			</Card.Content>
		</Card.Root>
	</main>

	<!-- Footer -->
	<footer class="relative z-10 border-t bg-muted/20 px-4 py-8">
		<div class="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
			<div class="flex items-center gap-2">
				<a class="font-semibold text-muted-foreground" href="/">time2log</a>
			</div>
			<p class="text-sm text-muted-foreground">
				© {new Date().getFullYear()} time2log. All rights reserved.
			</p>
		</div>
	</footer>
</div>

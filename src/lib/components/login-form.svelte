<script lang="ts">
	import { Loader2 } from 'lucide-svelte';
	import { buttonVariants } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
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
				<span class="text-xl font-bold">time2log</span>
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
						<div
							class="rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive"
						>
							{errorMessage}
						</div>
					{/if}

					<div class="grid gap-2">
						<Label for="email">{m.email_label()}</Label>
						<Input
							id="email"
							type="email"
							placeholder="hans.muster@gmail.com"
							bind:value={email}
							required
							disabled={isLoading}
						/>
					</div>
					<div class="grid gap-2">
						<div class="flex items-center">
							<Label for="password">{m.password_label()}</Label>
						</div>
						<Input
							id="password"
							type="password"
							bind:value={password}
							required
							disabled={isLoading}
						/>
					</div>
					<button type="submit" class={cn(buttonVariants(), 'w-full')} disabled={isLoading}>
						{#if isLoading}
							<Loader2 class="mr-2 h-4 w-4 animate-spin" />
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
				<span class="font-semibold text-muted-foreground">time2log</span>
			</div>
			<p class="text-sm text-muted-foreground">
				© {new Date().getFullYear()} time2log. All rights reserved.
			</p>
		</div>
	</footer>
</div>

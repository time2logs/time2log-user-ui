<script lang="ts">
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
	import { enhance } from '$app/forms';

	let { form } = $props();
	let isLoading = $state(false);
</script>

<div class="relative flex min-h-screen flex-col overflow-hidden bg-background text-foreground">
	<AmbientGlow />

	<header
		class="relative z-10 border-b bg-background/95 px-8 py-4 backdrop-blur supports-[backdrop-filter]:bg-background/60"
	>
		<div class="mx-auto flex max-w-6xl items-center justify-between">
			<div class="flex items-center gap-2">
				<img src="/icon.png" alt="" class="h-7 w-7" />
				<a class="text-xl font-bold" href="/">time2log</a>
			</div>
			<LanguageSwitcher />
		</div>
	</header>

	<main class="relative z-10 flex flex-1 items-center justify-center px-4 py-12">
		<Card.Root class="w-full max-w-sm">
			<Card.Header class="pt-8">
				<Card.Title class="text-2xl font-bold">
					{m.forgot_password_title()}
				</Card.Title>
				<Card.Description>
					{m.forgot_password_description()}
				</Card.Description>
			</Card.Header>
			<Card.Content class="pb-8">
				{#if form?.success}
					<Alert variant="success">{m.forgot_password_email_sent()}</Alert>
					<a href="/login" class={cn(buttonVariants({ variant: 'outline' }), 'mt-4 w-full')}>
						{m.back_to_login()}
					</a>
				{:else}
					<form
						method="POST"
						action="?/sendResetLink"
						use:enhance={() => {
							isLoading = true;
							return async ({ update }) => {
								isLoading = false;
								await update();
							};
						}}
						class="grid gap-8"
					>
						{#if form?.error}
							<Alert variant="error">{form.error}</Alert>
						{/if}

						<FormField label={m.email_label()} htmlFor="email">
							<Input
								id="email"
								name="email"
								type="email"
								placeholder="hans.muster@gmail.com"
								required
								disabled={isLoading}
							/>
						</FormField>

						<button type="submit" class={cn(buttonVariants(), 'w-full')} disabled={isLoading}>
							{#if isLoading}
								<Spinner size="sm" class="mr-2" />
								{m.saving()}
							{:else}
								{m.forgot_password_send_link()}
							{/if}
						</button>
					</form>

					<div class="mt-4 text-center">
						<a href="/login" class="text-sm text-muted-foreground underline">
							{m.back_to_login()}
						</a>
					</div>
				{/if}
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

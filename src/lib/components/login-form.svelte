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

	let email = $state('');
	let password = $state('');
	let errorMessage = $state('');
	let isLoading = $state(false);

	let cardElement: HTMLDivElement;
	let cursorX = $state(0);
	let cursorY = $state(0);
	let cursorVisible = $state(false);

	function handleMouseMove(e: MouseEvent) {
		if (!cardElement) return;
		const rect = cardElement.getBoundingClientRect();
		cursorX = e.clientX - rect.left;
		cursorY = e.clientY - rect.top;
		cursorVisible = true;
	}

	function handleMouseLeave() {
		cursorVisible = false;
	}

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

<div class="relative flex min-h-screen flex-col overflow-hidden">
	<!-- Background gradient that covers entire page -->
	<div class="fixed inset-0 bg-gradient-to-br from-orange-50 via-rose-50 to-white"></div>

	<!-- Soft gradient orbs -->
	<div
		class="fixed top-0 left-1/4 h-[600px] w-[600px] rounded-full bg-orange-200/40 blur-[120px]"
	></div>
	<div
		class="fixed top-1/4 right-0 h-[500px] w-[500px] rounded-full bg-orange-300/35 blur-[120px]"
	></div>
	<div
		class="fixed bottom-0 left-1/3 h-[400px] w-[400px] rounded-full bg-rose-200/30 blur-[100px]"
	></div>

	<!-- Header -->
	<header class="relative z-10 border-b border-white/30 bg-white/20 px-8 py-4 backdrop-blur-xl">
		<div class="mx-auto flex max-w-6xl items-center justify-between">
			<div class="flex items-center gap-2">
				<span class="text-xl font-bold text-stone-800">time2log</span>
			</div>
			<LanguageSwitcher />
		</div>
	</header>

	<!-- Main Content -->
	<main class="relative z-10 flex flex-1 items-center justify-center px-4 py-12">
		<!-- Frosted glass card with cursor bloom inside -->
		<div
			bind:this={cardElement}
			onmousemove={handleMouseMove}
			onmouseleave={handleMouseLeave}
			class="relative mx-auto w-full max-w-sm overflow-hidden rounded-3xl border border-white/50 bg-white/25 p-8 shadow-xl backdrop-blur-2xl"
			style="box-shadow: 0 8px 32px 0 rgba(255, 200, 150, 0.1), inset 0 0 0 1px rgba(255, 255, 255, 0.5);"
		>
			<!-- Cursor bloom effect - only inside card -->
			<div
				class="pointer-events-none absolute z-0 h-[300px] w-[300px] rounded-full bg-gradient-to-r from-orange-200/40 via-rose-200/40 to-orange-300/40 blur-[60px] transition-opacity duration-300"
				style="left: {cursorX - 150}px; top: {cursorY - 150}px; opacity: {cursorVisible ? 1 : 0};"
			></div>

			<div class="relative z-10">
				<Card.Root class="border-0 bg-transparent shadow-none">
					<Card.Header class="px-0 pb-4">
						<Card.Title class="text-2xl font-bold text-stone-800">
							{m.login_title()}
						</Card.Title>
						<Card.Description class="text-stone-600">
							{m.login_description()}
						</Card.Description>
					</Card.Header>
					<Card.Content class="px-0">
						<form
							onsubmit={(e) => {
								e.preventDefault();
								signInWithEmail();
							}}
							class="grid gap-4"
						>
							{#if errorMessage}
								<div class="rounded-md border border-red-200 bg-red-50/80 p-3 text-sm text-red-700">
									{errorMessage}
								</div>
							{/if}

							<div class="grid gap-2">
								<Label for="email" class="text-stone-700">{m.email_label()}</Label>
								<Input
									id="email"
									type="email"
									placeholder="hans.muster@gmail.com"
									bind:value={email}
									required
									disabled={isLoading}
									class="border-white/50 bg-white/50 backdrop-blur-sm placeholder:text-stone-400 focus:bg-white/70"
								/>
							</div>
							<div class="grid gap-2">
								<div class="flex items-center">
									<Label for="password" class="text-stone-700">{m.password_label()}</Label>
								</div>
								<Input
									id="password"
									type="password"
									bind:value={password}
									required
									disabled={isLoading}
									class="border-white/50 bg-white/50 backdrop-blur-sm placeholder:text-stone-400 focus:bg-white/70"
								/>
							</div>
							<button
								type="submit"
								class={cn(buttonVariants(), 'w-full bg-stone-800 text-white hover:bg-stone-700')}
								disabled={isLoading}
							>
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
			</div>
		</div>
	</main>

	<!-- Footer -->
	<footer class="relative z-10 px-4 py-8">
		<div class="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
			<div class="flex items-center gap-2">
				<span class="font-semibold text-stone-700">time2log</span>
			</div>
			<p class="text-sm text-stone-500">
				© {new Date().getFullYear()} time2log. All rights reserved.
			</p>
		</div>
	</footer>
</div>

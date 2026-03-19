<script lang="ts">
	import * as m from '$lib/paraglide/messages.js';
	import GradientBackground from '$lib/components/gradient-background.svelte';
	import GlassCard from '$lib/components/glass-card.svelte';
	import LanguageSwitcher from '$lib/components/language-switcher.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Separator } from '$lib/components/ui/separator';
	import * as AlertDialog from '$lib/components/ui/alert-dialog';
	import { ArrowLeft, User, Globe, LogOut, Loader2, Moon, Sun } from 'lucide-svelte';
	import { logout } from '$lib/api';
	import { theme } from '$lib/themeStore';

	let { data } = $props();

	let isLoggingOut = $state(false);
	let logoutDialogOpen = $state(false);
	let currentTheme = $state<'light' | 'dark'>('light');

	theme.subscribe((t) => {
		currentTheme = t;
	});

	const initials = $derived(
		data.profile ? `${data.profile.first_name[0]}${data.profile.last_name[0]}`.toUpperCase() : '?'
	);

	const fullName = $derived(
		data.profile ? `${data.profile.first_name} ${data.profile.last_name}` : 'Guest'
	);

	async function handleLogout() {
		isLoggingOut = true;
		try {
			await logout();
		} catch (error) {
			console.error('Logout failed:', error);
			isLoggingOut = false;
		}
	}

	function toggleTheme() {
		theme.toggle();
	}
</script>

<GradientBackground>
	<main class="flex flex-1 flex-col items-center justify-center p-4 sm:p-8">
		<div class="w-full max-w-md">
			<Button
				variant="ghost"
				href="/dashboard"
				class="mb-6 gap-2 self-start text-stone-600 dark:text-slate-400"
			>
				<ArrowLeft class="h-4 w-4" />
				{m.back_to_dashboard()}
			</Button>

			<h1 class="mb-8 text-3xl font-bold text-stone-800 dark:text-slate-100">
				{m.settings_title()}
			</h1>

			<div class="space-y-6">
				<GlassCard>
					<div class="flex items-center gap-4 p-4">
						{#if data.profile?.avatar_url}
							<div
								class="h-16 w-16 overflow-hidden rounded-full border-2 border-white shadow-lg dark:border-slate-600"
							>
								<img
									src={data.profile.avatar_url}
									alt={fullName}
									class="h-full w-full object-cover"
								/>
							</div>
						{:else}
							<div
								class="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-rose-400 text-xl font-semibold text-white shadow-lg"
							>
								{initials}
							</div>
						{/if}
						<div>
							<h2 class="text-lg font-semibold text-stone-800 dark:text-slate-100">{fullName}</h2>
							<p class="text-sm text-stone-600 dark:text-slate-400">{data.email ?? ''}</p>
						</div>
					</div>
				</GlassCard>

				<GlassCard>
					<div class="p-4">
						<div class="mb-4 flex items-center gap-2 text-stone-800 dark:text-slate-100">
							<User class="h-5 w-5" />
							<h3 class="font-semibold">{m.profile_settings()}</h3>
						</div>
						<div class="space-y-3">
							<div class="flex justify-between">
								<span class="text-stone-600 dark:text-slate-400">{m.first_name()}</span>
								<span class="font-medium text-stone-800 dark:text-slate-200"
									>{data.profile?.first_name ?? '-'}</span
								>
							</div>
							<Separator />
							<div class="flex justify-between">
								<span class="text-stone-600 dark:text-slate-400">{m.last_name()}</span>
								<span class="font-medium text-stone-800 dark:text-slate-200"
									>{data.profile?.last_name ?? '-'}</span
								>
							</div>
						</div>
					</div>
				</GlassCard>

				<GlassCard>
					<div class="p-4">
						<div class="mb-4 flex items-center gap-2 text-stone-800 dark:text-slate-100">
							<Moon class="h-5 w-5" />
							<h3 class="font-semibold">{m.appearance_settings()}</h3>
						</div>
						<div class="flex items-center justify-between">
							<span class="text-stone-600 dark:text-slate-400">
								{currentTheme === 'dark' ? m.dark_mode() : m.light_mode()}
							</span>
							<button
								type="button"
								onclick={toggleTheme}
								class="relative h-6 w-12 rounded-full transition-colors {currentTheme === 'dark'
									? 'bg-blue-600'
									: 'bg-stone-300'}"
							>
								<span
									class="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-md transition-transform {currentTheme ===
									'dark'
										? 'left-[26px]'
										: 'left-0.5'}"
								>
									{#if currentTheme === 'dark'}
										<Moon class="mt-0.5 ml-0.5 h-4 w-4 text-blue-400" />
									{:else}
										<Sun class="mt-0.5 ml-0.5 h-4 w-4 text-orange-400" />
									{/if}
								</span>
							</button>
						</div>
					</div>
				</GlassCard>

				<GlassCard>
					<div class="p-4">
						<div class="mb-4 flex items-center gap-2 text-stone-800 dark:text-slate-100">
							<Globe class="h-5 w-5" />
							<h3 class="font-semibold">{m.language_settings()}</h3>
						</div>
						<LanguageSwitcher />
					</div>
				</GlassCard>

				<GlassCard>
					<div class="p-4">
						<div class="mb-4 flex items-center gap-2 text-stone-800 dark:text-slate-100">
							<LogOut class="h-5 w-5" />
							<h3 class="font-semibold">{m.account()}</h3>
						</div>
						<Button
							variant="outline"
							onclick={() => (logoutDialogOpen = true)}
							class="w-full justify-start gap-2 border-red-200 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-900 dark:bg-red-950 dark:text-red-400 dark:hover:bg-red-900"
						>
							<LogOut class="h-4 w-4" />
							{m.logout()}
						</Button>
					</div>
				</GlassCard>
			</div>
		</div>
	</main>
</GradientBackground>

<AlertDialog.Root bind:open={logoutDialogOpen}>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>{m.logout_confirm_title()}</AlertDialog.Title>
			<AlertDialog.Description>{m.logout_confirm_description()}</AlertDialog.Description>
		</AlertDialog.Header>
		<AlertDialog.Footer>
			<AlertDialog.Cancel>{m.cancel()}</AlertDialog.Cancel>
			<AlertDialog.Action
				onclick={handleLogout}
				disabled={isLoggingOut}
				class="bg-red-500 hover:bg-red-600"
			>
				{#if isLoggingOut}
					<Loader2 class="mr-2 h-4 w-4 animate-spin" /> {m.logging_out()}
				{:else}
					{m.logout()}
				{/if}
			</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>

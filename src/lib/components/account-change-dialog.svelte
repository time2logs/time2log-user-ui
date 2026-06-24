<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import * as m from '$lib/paraglide/messages.js';
	import { supabase } from '$lib/supabaseClient';
	import { Input } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button';
	import { Alert } from '$lib/components/ui/alert';
	import { Spinner } from '$lib/components/ui/spinner';
	import { FormField } from '$lib/components/ui/form-field';
	import { validatePassword, type PasswordRule } from '$lib/passwordValidation';
	import { getRateLimitSeconds } from '$lib/rateLimitError';

	type Mode = 'email' | 'password';
	type Step = 'security' | 'emailForm' | 'passwordForm' | 'done';

	let {
		open = $bindable(false),
		mode = 'email',
		currentEmail = '',
		onsuccess
	}: {
		open?: boolean;
		mode?: Mode;
		currentEmail?: string;
		onsuccess?: () => void;
	} = $props();

	let step = $state<Step>('security');
	let loading = $state(false);
	let error = $state('');

	// security step
	let currentPassword = $state('');

	// email step
	let newEmail = $state('');
	let otp = $state('');
	let otpSent = $state(false);

	// password step
	let newPassword = $state('');
	let confirmPassword = $state('');

	const pwMessages: Record<PasswordRule, string> = {
		length: m.onboarding_error_password_length(),
		uppercase: m.onboarding_error_password_uppercase(),
		number: m.onboarding_error_password_number(),
		special: m.onboarding_error_password_special()
	};

	const title = $derived(mode === 'email' ? m.change_email() : m.change_password_title());

	function errMsg(err: unknown): string {
		const seconds = getRateLimitSeconds(err);
		if (seconds) return m.rate_limited({ seconds });
		return (err as { message?: string })?.message || m.error_server();
	}

	// ponytail: reset via open-transition watch instead of onClose callback (bits-ui Dialog lacks one)
	let wasOpen = false;
	$effect(() => {
		if (wasOpen && !open) {
			step = 'security';
			loading = false;
			error = '';
			currentPassword = '';
			newEmail = '';
			otp = '';
			otpSent = false;
			newPassword = '';
			confirmPassword = '';
		}
		wasOpen = open;
	});

	async function verifyPassword() {
		error = '';
		loading = true;
		try {
			const { error: signInError } = await supabase.auth.signInWithPassword({
				email: currentEmail,
				password: currentPassword
			});
			if (signInError) {
				error = errMsg(signInError);
				return;
			}
			step = mode === 'email' ? 'emailForm' : 'passwordForm';
		} catch (err) {
			error = errMsg(err);
		} finally {
			loading = false;
		}
	}

	async function sendCodeToNewEmail() {
		error = '';
		if (!newEmail) {
			error = m.onboarding_error_email_missing();
			return;
		}
		if (newEmail.toLowerCase() === currentEmail.toLowerCase()) {
			error = m.settings_error_email_unchanged();
			return;
		}
		loading = true;
		try {
			const { error: updateError } = await supabase.auth.updateUser(
				{ email: newEmail },
				{ emailRedirectTo: `${window.location.origin}/settings` }
			);
			if (updateError) {
				error = errMsg(updateError);
				return;
			}
			otpSent = true;
		} catch (err) {
			error = errMsg(err);
		} finally {
			loading = false;
		}
	}

	async function confirmEmailChange() {
		error = '';
		if (!otp) {
			error = m.settings_error_email_otp_required();
			return;
		}
		loading = true;
		try {
			const { error: verifyError } = await supabase.auth.verifyOtp({
				email: newEmail,
				token: otp,
				type: 'email_change'
			});
			if (verifyError) {
				error = errMsg(verifyError);
				return;
			}
			step = 'done';
			onsuccess?.();
		} catch (err) {
			error = errMsg(err);
		} finally {
			loading = false;
		}
	}

	async function applyPasswordChange() {
		error = '';
		if (newPassword !== confirmPassword) {
			error = m.settings_error_password_mismatch();
			return;
		}
		const rule = validatePassword(newPassword);
		if (rule) {
			error = pwMessages[rule];
			return;
		}
		loading = true;
		try {
			const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
			if (updateError) {
				error = errMsg(updateError);
				return;
			}
			step = 'done';
			onsuccess?.();
		} catch (err) {
			error = errMsg(err);
		} finally {
			loading = false;
		}
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>{title}</Dialog.Title>
		</Dialog.Header>

		<div class="space-y-4">
			{#if step === 'security'}
				<Dialog.Description>{m.security_check_description()}</Dialog.Description>
				<form
					onsubmit={(e) => {
						e.preventDefault();
						verifyPassword();
					}}
					class="space-y-3"
				>
					<FormField label={m.current_password_label()} htmlFor="current_password">
						<Input
							id="current_password"
							type="password"
							bind:value={currentPassword}
							disabled={loading}
							autocomplete="current-password"
							autofocus
						/>
					</FormField>
					{#if error}
						<Alert variant="error">{error}</Alert>
					{/if}
					<Button type="submit" class="w-full" disabled={loading || !currentPassword}>
						{#if loading}
							<Spinner size="sm" class="mr-2" />
							{m.saving()}
						{:else}
							{m.security_check_verify()}
						{/if}
					</Button>
					<a
						href="/forgot-password"
						class="block text-center text-sm text-muted-foreground hover:text-foreground"
					>
						{m.forgot_password_link()}
					</a>
				</form>
			{:else if step === 'emailForm'}
				<form
					onsubmit={(e) => {
						e.preventDefault();
						confirmEmailChange();
					}}
					class="space-y-3"
				>
					<FormField label={m.settings_new_email_label()} htmlFor="new_email">
						<Input
							id="new_email"
							type="email"
							bind:value={newEmail}
							disabled={loading || otpSent}
							autocomplete="email"
						/>
					</FormField>
					{#if !otpSent}
						<Button
							type="button"
							variant="outline"
							class="w-full"
							disabled={loading || !newEmail}
							onclick={sendCodeToNewEmail}
						>
							{#if loading}
								<Spinner size="sm" class="mr-2" />
							{/if}
							{m.settings_send_email_otp()}
						</Button>
					{/if}
					{#if otpSent}
						<Alert variant="success">{m.settings_email_otp_sent()}</Alert>
						<FormField label={m.settings_email_otp_label()} htmlFor="otp">
							<Input
								id="otp"
								inputmode="numeric"
								autocomplete="one-time-code"
								bind:value={otp}
								disabled={loading}
							/>
						</FormField>
						<Button type="submit" class="w-full" disabled={loading || !otp}>
							{#if loading}
								<Spinner size="sm" class="mr-2" />
								{m.saving()}
							{:else}
								{m.change_email()}
							{/if}
						</Button>
					{/if}
					{#if error}
						<Alert variant="error">{error}</Alert>
					{/if}
				</form>
			{:else if step === 'passwordForm'}
				<form
					onsubmit={(e) => {
						e.preventDefault();
						applyPasswordChange();
					}}
					class="space-y-3"
				>
					<FormField label={m.new_password_label()} htmlFor="new_password">
						<Input
							id="new_password"
							type="password"
							bind:value={newPassword}
							disabled={loading}
							autocomplete="new-password"
						/>
					</FormField>
					<FormField label={m.confirm_password_label()} htmlFor="confirm_password">
						<Input
							id="confirm_password"
							type="password"
							bind:value={confirmPassword}
							disabled={loading}
							autocomplete="new-password"
						/>
					</FormField>
					{#if error}
						<Alert variant="error">{error}</Alert>
					{/if}
					<Button
						type="submit"
						class="w-full"
						disabled={loading || !newPassword || !confirmPassword}
					>
						{#if loading}
							<Spinner size="sm" class="mr-2" />
							{m.saving()}
						{:else}
							{m.change_password_title()}
						{/if}
					</Button>
				</form>
			{:else if step === 'done'}
				<Alert variant="success">
					{mode === 'email' ? m.settings_email_confirmation_sent() : m.settings_password_saved()}
				</Alert>
				<Button class="w-full" onclick={() => (open = false)}>
					{m.close()}
				</Button>
			{/if}
		</div>
	</Dialog.Content>
</Dialog.Root>

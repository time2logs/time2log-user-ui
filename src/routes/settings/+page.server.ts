import { redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import * as m from '$lib/paraglide/messages.js';
import { validateImageMagicBytes } from '$lib/server/avatarValidation';
import { checkRateLimit, rateKey } from '$lib/server/rateLimiter';

const WINDOW_10MIN = 10 * 60 * 1000;
const WINDOW_1HOUR = 60 * 60 * 1000;

export const load: PageServerLoad = async ({ locals }) => {
	const session = await locals.safeGetSession();

	if (!session) {
		throw redirect(302, '/login');
	}

	const userId = session.user.id;
	const {
		data: { user }
	} = await locals.supabase.auth.getUser();
	const email = user?.email ?? session.user.email;

	const profileResult = await locals.supabase
		.from('profiles')
		.select('*')
		.eq('id', userId)
		.single();

	const profile = profileResult.error ? null : profileResult.data;

	return { profile, email };
};

export const actions: Actions = {
	updateProfile: async ({ request, locals }) => {
		const session = await locals.safeGetSession();
		if (!session) throw redirect(302, '/login');

		const profileLimit = checkRateLimit(rateKey('settings:profile', session.user.id), 10, WINDOW_1HOUR);
		if (!profileLimit.allowed) {
			return fail(429, {
				profileError: m.rate_limited({ seconds: profileLimit.retryAfterSeconds.toString() })
			});
		}

		const formData = await request.formData();
		const firstName = formData.get('first_name')?.toString().trim() ?? '';
		const lastName = formData.get('last_name')?.toString().trim() ?? '';
		const avatarFile = formData.get('avatar') as File | null;

		if (!firstName || !lastName) {
			return fail(400, { profileError: m.settings_error_name_required() });
		}

		let avatarExt: string | null = null;
		if (avatarFile && avatarFile.size > 0) {
			if (avatarFile.size > 512 * 1024) {
				return fail(400, { profileError: m.settings_error_file_too_large() });
			}
			avatarExt = await validateImageMagicBytes(avatarFile);
			if (!avatarExt) {
				return fail(400, { profileError: m.settings_error_file_type() });
			}
		}

		const { error: profileError } = await locals.supabase
			.from('profiles')
			.update({ first_name: firstName, last_name: lastName })
			.eq('id', session.user.id);

		if (profileError) {
			console.error('[Settings] Failed to update profile:', profileError.message);
			return fail(500, {
				profileError: 'Ein Serverfehler ist aufgetreten. Bitte versuche es erneut.'
			});
		}

		if (avatarFile && avatarFile.size > 0 && avatarExt) {
			const filePath = `${session.user.id}/avatar-${Date.now()}.${avatarExt}`;

			const { error: uploadError } = await locals.supabase.storage
				.from('avatars')
				.upload(filePath, avatarFile);

			if (!uploadError) {
				const { data: publicUrlData } = locals.supabase.storage
					.from('avatars')
					.getPublicUrl(filePath);

				if (publicUrlData) {
					await locals.supabase
						.from('profiles')
						.update({ avatar_url: publicUrlData.publicUrl })
						.eq('id', session.user.id);
				}
			}
		}

		return { profileSuccess: true };
	},

	sendEmailOtp: async ({ locals }) => {
		const session = await locals.safeGetSession();
		if (!session) throw redirect(302, '/login');

		const otpLimit = checkRateLimit(rateKey('settings:emailOtp', session.user.id), 3, WINDOW_10MIN);
		if (!otpLimit.allowed) {
			return fail(429, {
				emailError: m.rate_limited({ seconds: otpLimit.retryAfterSeconds.toString() })
			});
		}

		const { error } = await locals.supabase.auth.reauthenticate();
		if (error) {
			console.error('[Settings] Failed to send email OTP:', error.message);
			return fail(500, {
				emailError: 'Ein Serverfehler ist aufgetreten. Bitte versuche es erneut.'
			});
		}

		return { emailOtpSent: true };
	},

	updateEmail: async ({ request, locals, url }) => {
		const session = await locals.safeGetSession();
		if (!session) throw redirect(302, '/login');

		const emailChangeLimit = checkRateLimit(
			rateKey('settings:updateEmail', session.user.id),
			5,
			WINDOW_1HOUR
		);
		if (!emailChangeLimit.allowed) {
			return fail(429, {
				emailError: m.rate_limited({ seconds: emailChangeLimit.retryAfterSeconds.toString() })
			});
		}

		const formData = await request.formData();
		const currentEmail = formData.get('current_email')?.toString().trim() ?? '';
		const email = formData.get('email')?.toString().trim() ?? '';
		const otp = formData.get('otp')?.toString().trim() ?? '';
		const {
			data: { user }
		} = await locals.supabase.auth.getUser();
		const currentUserEmail = user?.email ?? session.user.email ?? '';

		if (!currentEmail || currentEmail.toLowerCase() !== currentUserEmail.toLowerCase()) {
			return fail(400, { emailError: m.settings_error_current_email_required() });
		}

		if (!otp) {
			return fail(400, { emailError: m.settings_error_email_otp_required() });
		}

		if (!email) {
			return fail(400, { emailError: m.onboarding_error_email_missing() });
		}

		if (email.toLowerCase() === currentUserEmail.toLowerCase()) {
			return fail(400, { emailError: m.settings_error_email_unchanged() });
		}

		const { error } = await locals.supabase.auth.updateUser(
			{ email },
			{ nonce: otp, emailRedirectTo: `${url.origin}/settings` }
		);
		if (error) {
			console.error('[Settings] Failed to update email:', error.message);
			return fail(500, {
				emailError: 'Ein Serverfehler ist aufgetreten. Bitte versuche es erneut.'
			});
		}

		return { emailSuccess: true };
	},

	updatePassword: async ({ request, locals }) => {
		const session = await locals.safeGetSession();
		if (!session) throw redirect(302, '/login');

		const pwLimit = checkRateLimit(rateKey('settings:updatePassword', session.user.id), 5, WINDOW_1HOUR);
		if (!pwLimit.allowed) {
			return fail(429, {
				passwordError: m.rate_limited({ seconds: pwLimit.retryAfterSeconds.toString() })
			});
		}

		const formData = await request.formData();
		const password = formData.get('password')?.toString() ?? '';
		const confirmPassword = formData.get('confirm_password')?.toString() ?? '';

		if (password !== confirmPassword) {
			return fail(400, { passwordError: m.settings_error_password_mismatch() });
		}

		if (!password || password.length < 8) {
			return fail(400, { passwordError: m.onboarding_error_password_length() });
		}

		if (!/[A-Z]/.test(password)) {
			return fail(400, { passwordError: m.onboarding_error_password_uppercase() });
		}

		if (!/[0-9]/.test(password)) {
			return fail(400, { passwordError: m.onboarding_error_password_number() });
		}

		if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(password)) {
			return fail(400, { passwordError: m.onboarding_error_password_special() });
		}

		const { error } = await locals.supabase.auth.updateUser({ password });
		if (error) {
			console.error('[Settings] Failed to update password:', error.message);
			return fail(500, {
				passwordError: 'Ein Serverfehler ist aufgetreten. Bitte versuche es erneut.'
			});
		}

		return { passwordSuccess: true };
	}
};

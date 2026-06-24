import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import * as m from '$lib/paraglide/messages.js';
import { getRateLimitSeconds } from '$lib/rateLimitError';
import {
	checkRateLimit,
	getClientId,
	hashId,
	rateKey
} from '$lib/server/rateLimiter';

const WINDOW_1MIN = 60 * 1000;
const WINDOW_15MIN = 15 * 60 * 1000;

export const load: PageServerLoad = async () => {
	return {};
};

export const actions: Actions = {
	sendResetLink: async (event) => {
		const { request, locals, url } = event;
		const formData = await request.formData();
		const email = formData.get('email')?.toString().trim() ?? '';

		if (!email) {
			return fail(400, { error: m.forgot_password_error_email_missing() });
		}

		// Rate limit by email and by client to stop reset-mail flooding.
		const clientIp = getClientId(event);
		const emailHash = hashId(email);
		const cooldownLimit = checkRateLimit(rateKey('resetpw:email:cooldown', emailHash), 1, WINDOW_1MIN);
		const emailLimit = checkRateLimit(rateKey('resetpw:email', emailHash), 5, WINDOW_15MIN);
		const ipLimit = checkRateLimit(rateKey('resetpw:ip', clientIp), 10, WINDOW_15MIN);
		if (!cooldownLimit.allowed || !emailLimit.allowed || !ipLimit.allowed) {
			const seconds = Math.max(
				cooldownLimit.retryAfterSeconds,
				emailLimit.retryAfterSeconds,
				ipLimit.retryAfterSeconds
			);
			return fail(429, { error: m.rate_limited({ seconds: seconds.toString() }) });
		}

		const { error } = await locals.supabase.auth.resetPasswordForEmail(email, {
			redirectTo: `${url.origin}/reset-password`
		});

		if (error) {
			const seconds = getRateLimitSeconds(error);
			if (seconds) return fail(429, { error: m.rate_limited({ seconds }) });

			console.error('[ForgotPassword] resetPasswordForEmail failed:', error);
			return fail(500, { error: 'Ein Serverfehler ist aufgetreten. Bitte versuche es erneut.' });
		}

		return { success: true };
	}
};

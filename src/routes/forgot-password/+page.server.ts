import { fail } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import type { Actions, PageServerLoad } from './$types';
import * as m from '$lib/paraglide/messages.js';
import { getRateLimitSeconds } from '$lib/rateLimitError';
import { checkRateLimit, getClientId, hashId, rateKey } from '$lib/server/rateLimiter';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY } from '$env/static/public';

const WINDOW_1MIN = 60 * 1000;
const WINDOW_15MIN = 15 * 60 * 1000;

const passwordResetClient = createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
	db: { schema: 'app' },
	auth: {
		autoRefreshToken: false,
		detectSessionInUrl: false,
		flowType: 'implicit',
		persistSession: false
	}
});

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
		const cooldownLimit = checkRateLimit(
			rateKey('resetpw:email:cooldown', emailHash),
			1,
			WINDOW_1MIN
		);
		if (!cooldownLimit.allowed) {
			return fail(429, {
				error: m.rate_limited({ seconds: cooldownLimit.retryAfterSeconds.toString() })
			});
		}

		const emailLimit = checkRateLimit(rateKey('resetpw:email', emailHash), 5, WINDOW_15MIN);
		if (!emailLimit.allowed) {
			return fail(429, {
				error: m.rate_limited({ seconds: emailLimit.retryAfterSeconds.toString() })
			});
		}

		const ipLimit = checkRateLimit(rateKey('resetpw:ip', clientIp), 10, WINDOW_15MIN);
		if (!ipLimit.allowed) {
			return fail(429, {
				error: m.rate_limited({ seconds: ipLimit.retryAfterSeconds.toString() })
			});
		}

		const { error } = await passwordResetClient.auth.resetPasswordForEmail(email, {
			redirectTo: `${url.origin}/reset-password`
		});

		if (error) {
			const seconds = getRateLimitSeconds(error);
			if (seconds) return fail(429, { error: m.rate_limited({ seconds }) });

			console.error('[ForgotPassword] resetPasswordForEmail failed:', error);
			return fail(500, { error: m.error_server() });
		}

		return { success: true };
	}
};

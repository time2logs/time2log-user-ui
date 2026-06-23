import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import * as m from '$lib/paraglide/messages.js';

export const load: PageServerLoad = async () => {
	return {};
};

export const actions: Actions = {
	sendResetLink: async ({ request, locals, url }) => {
		const formData = await request.formData();
		const email = formData.get('email')?.toString().trim() ?? '';

		if (!email) {
			return fail(400, { error: m.forgot_password_error_email_missing() });
		}

		const { error } = await locals.supabase.auth.resetPasswordForEmail(email, {
			redirectTo: `${url.origin}/reset-password`
		});

		if (error) {
			console.error('[ForgotPassword] resetPasswordForEmail failed:', error);
			return fail(500, { error: 'Ein Serverfehler ist aufgetreten. Bitte versuche es erneut.' });
		}

		return { success: true };
	}
};

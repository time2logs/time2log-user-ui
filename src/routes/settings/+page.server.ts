import { redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import * as m from '$lib/paraglide/messages.js';
import { validateImageMagicBytes } from '$lib/server/avatarValidation';
import { checkRateLimit, rateKey } from '$lib/server/rateLimiter';

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

		const profileLimit = checkRateLimit(
			rateKey('settings:profile', session.user.id),
			10,
			WINDOW_1HOUR
		);
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
			return fail(500, { profileError: m.error_server() });
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
					const { error: avatarUrlError } = await locals.supabase
						.from('profiles')
						.update({ avatar_url: publicUrlData.publicUrl })
						.eq('id', session.user.id);
					if (avatarUrlError) {
						console.error('Failed to link avatar URL to profile:', avatarUrlError);
					}
				}
			}
		}

		return { profileSuccess: true };
	}
};

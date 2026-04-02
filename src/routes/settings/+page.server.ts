import { redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import * as m from '$lib/paraglide/messages.js';

export const load: PageServerLoad = async ({ locals }) => {
	const session = await locals.safeGetSession();

	if (!session) {
		throw redirect(302, '/login');
	}

	const userId = session.user.id;
	const email = session.user.email;

	const profileResult = await locals.supabase
		.from('profiles')
		.select('*')
		.eq('id', userId)
		.single();

	const profile = profileResult.error ? null : profileResult.data;

	type UserLocation = {
		user_id: string;
		location: string;
		is_default: boolean;
		created_at: string;
	};

	let locations: UserLocation[] = [];
	let defaultLocation: string | null = null;

	try {
		const locationsResult = await locals.supabase
			.from('user_locations')
			.select('*')
			.eq('user_id', userId)
			.order('created_at', { ascending: false });

		if (!locationsResult.error && locationsResult.data) {
			locations = locationsResult.data as UserLocation[];
			defaultLocation = locations.find((l) => l.is_default)?.location ?? null;
		}
	} catch (e) {
		console.warn('user_locations table not available:', e);
	}

	return { profile, email, defaultLocation, pastLocations: locations };
};

export const actions: Actions = {
	updateProfile: async ({ request, locals }) => {
		const session = await locals.safeGetSession();
		if (!session) throw redirect(302, '/login');

		const formData = await request.formData();
		const firstName = formData.get('first_name')?.toString().trim() ?? '';
		const lastName = formData.get('last_name')?.toString().trim() ?? '';
		const avatarFile = formData.get('avatar') as File | null;

		if (!firstName || !lastName) {
			return fail(400, { profileError: m.settings_error_name_required() });
		}

		if (avatarFile && avatarFile.size > 0) {
			if (avatarFile.size > 512 * 1024) {
				return fail(400, { profileError: m.settings_error_file_too_large() });
			}
			if (!avatarFile.type.startsWith('image/')) {
				return fail(400, { profileError: m.settings_error_file_type() });
			}
		}

		const { error: profileError } = await locals.supabase
			.from('profiles')
			.update({ first_name: firstName, last_name: lastName })
			.eq('id', session.user.id);

		if (profileError) {
			return fail(500, { profileError: profileError.message });
		}

		if (avatarFile && avatarFile.size > 0) {
			const fileExt = avatarFile.name.split('.').pop() || 'jpg';
			const filePath = `${session.user.id}/avatar-${Date.now()}.${fileExt}`;

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

	updateEmail: async ({ request, locals }) => {
		const session = await locals.safeGetSession();
		if (!session) throw redirect(302, '/login');

		const formData = await request.formData();
		const email = formData.get('email')?.toString().trim() ?? '';

		if (!email) {
			return fail(400, { emailError: m.onboarding_error_email_missing() });
		}

		if (email === session.user.email) {
			return fail(400, { emailError: m.settings_error_email_unchanged() });
		}

		const { error } = await locals.supabase.auth.updateUser({ email });
		if (error) {
			return fail(500, { emailError: error.message });
		}

		return { emailSuccess: true };
	},

	updatePassword: async ({ request, locals }) => {
		const session = await locals.safeGetSession();
		if (!session) throw redirect(302, '/login');

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
			return fail(500, { passwordError: error.message });
		}

		return { passwordSuccess: true };
	}
};

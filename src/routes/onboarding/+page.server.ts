import { redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import type { InviteDetails } from '$lib/types';
import * as m from '$lib/paraglide/messages.js';

export const load: PageServerLoad = async ({
	url,
	locals
}): Promise<{
	token: string | null;
	inviteDetails: InviteDetails | null;
	inviteError: string | null;
}> => {
	const session = await locals.safeGetSession();
	const token = url.searchParams.get('invite_token');

	// If already logged in and onboarding completed, redirect to dashboard
	if (session) {
		const { data: profile } = await locals.supabase
			.from('profiles')
			.select('id, onboarding_status')
			.eq('id', session.user.id)
			.single();

		if (profile?.onboarding_status === 'completed') {
			throw redirect(303, '/dashboard');
		}
	}

	// If no token, can't proceed with onboarding
	if (!token) {
		return {
			token: null,
			inviteDetails: null,
			inviteError: m.onboarding_no_invite_token()
		};
	}

	// Validate token via service role client (bypasses RLS, no auth needed)
	const { data: inviteDetailsRaw, error: inviteError } = await locals.supabaseServiceRole.rpc(
		'get_invite_details',
		{ invite_token: token }
	);

	const inviteDetails: InviteDetails | null = inviteDetailsRaw
		? {
				organization_name: inviteDetailsRaw.organization_name,
				email: inviteDetailsRaw.email,
				role: inviteDetailsRaw.role
			}
		: null;

	if (inviteError) {
		return {
			token,
			inviteDetails: null,
			inviteError: inviteError.message
		};
	}

	return {
		token,
		inviteDetails, // { organization_name, email, role }
		inviteError: null
	};
};

export const actions: Actions = {
	complete: async ({ request, locals }) => {
		const formData = await request.formData();
		const firstName = formData.get('first_name')?.toString().trim() ?? '';
		const lastName = formData.get('last_name')?.toString().trim() ?? '';
		const password = formData.get('password')?.toString() ?? '';
		const token = formData.get('invite_token')?.toString() ?? '';
		const email = formData.get('email')?.toString().trim() ?? '';
		const avatarFile = formData.get('avatar') as File | null;

		if (avatarFile && avatarFile.size > 0) {
			if (avatarFile.size > 5 * 1024 * 1024) {
				return fail(400, {
					error: 'File size exceeds 5MB limit. Please choose a smaller image.',
					values: { firstName, lastName }
				});
			}
			if (!avatarFile.type.startsWith('image/')) {
				return fail(400, {
					error: 'Unsupported file type. Please use JPEG, PNG, or WEBP.',
					values: { firstName, lastName }
				});
			}
		}

		// Validate required fields
		if (!firstName || !lastName) {
			return fail(400, {
				error: m.onboarding_error_name_required(),
				values: { firstName, lastName }
			});
		}

		if (!password || password.length < 8) {
			return fail(400, {
				error: m.onboarding_error_password_length(),
				values: { firstName, lastName }
			});
		}

		const hasUppercase = /[A-Z]/.test(password);
		const hasNumber = /[0-9]/.test(password);
		const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password);

		if (!hasUppercase) {
			return fail(400, {
				error: m.onboarding_error_password_uppercase(),
				values: { firstName, lastName }
			});
		}

		if (!hasNumber) {
			return fail(400, {
				error: m.onboarding_error_password_number(),
				values: { firstName, lastName }
			});
		}

		if (!hasSpecialChar) {
			return fail(400, {
				error: m.onboarding_error_password_special(),
				values: { firstName, lastName }
			});
		}

		if (!token) {
			return fail(400, {
				error: m.onboarding_error_token_missing(),
				values: { firstName, lastName }
			});
		}

		if (!email) {
			return fail(400, {
				error: m.onboarding_error_email_missing(),
				values: { firstName, lastName }
			});
		}

		// 1. Create the auth user via service role (bypasses email confirmation)
		const { data: newUser, error: createError } =
			await locals.supabaseServiceRole.auth.admin.createUser({
				email,
				password,
				email_confirm: true,
				user_metadata: {
					first_name: firstName,
					last_name: lastName
				}
			});

		if (createError) {
			return fail(400, {
				error: createError.message,
				values: { firstName, lastName }
			});
		}

		// 2. Accept invite via RPC
		//    The accept_invite RPC uses auth.uid(), so we need to call it as the authenticated user.
		//    Sign in as the user first to establish a session, then use supabase client to call accept_invite.
		const { error: signInError } = await locals.supabase.auth.signInWithPassword({
			email,
			password
		});

		if (signInError) {
			const { error: deleteError } = await locals.supabaseServiceRole.auth.admin.deleteUser(
				newUser.user.id
			);
			if (deleteError) {
				console.error('Failed to cleanup user after sign-in error:', deleteError);
			}
			return fail(500, {
				error: m.onboarding_error_signin_failed() + signInError.message,
				values: { firstName, lastName }
			});
		}

		// 3. Now the supabase client has the user's session — call accept_invite
		//    If this fails, clean up the created user to avoid orphaned accounts
		const { error: acceptError } = await locals.supabase.rpc('accept_invite', {
			invite_token: token
		});

		if (acceptError) {
			const { error: deleteError } = await locals.supabaseServiceRole.auth.admin.deleteUser(
				newUser.user.id
			);
			if (deleteError) {
				console.error('Failed to cleanup user after accept_invite error:', deleteError);
			}
			return fail(400, {
				error: acceptError.message,
				values: { firstName, lastName }
			});
		}

		// 4. Upload avatar if provided
		if (avatarFile && avatarFile.size > 0) {
			const fileExt = avatarFile.name.split('.').pop() || 'jpg';
			const filePath = `${newUser.user.id}/avatar-${Date.now()}.${fileExt}`;

			const { error: uploadError } = await locals.supabase.storage
				.from('avatars')
				.upload(filePath, avatarFile);

			if (uploadError) {
				console.error('Avatar upload failed:', uploadError);
				// We don't fail the whole onboarding process if just the avatar fails
			} else {
				const { data: publicUrlData } = locals.supabase.storage
					.from('avatars')
					.getPublicUrl(filePath);

				if (publicUrlData) {
					await locals.supabase
						.from('profiles')
						.update({ avatar_url: publicUrlData.publicUrl })
						.eq('id', newUser.user.id);
				}
			}
		}

		throw redirect(303, '/dashboard');
	}
};

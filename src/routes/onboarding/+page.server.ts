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
			if (avatarFile.size > 512 * 1024) {
				return fail(400, {
					error: 'File size exceeds 0.5MB limit. Please choose a smaller image.',
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
		const hasSpecialChar = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(password);

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

		// 1. User per Email in auth.users suchen
		const {
			data: { users },
			error: listError
		} = await locals.supabaseServiceRole.auth.admin.listUsers();

		if (listError) {
			return fail(500, {
				error: listError.message,
				values: { firstName, lastName }
			});
		}

		const existingUser = users.find((u) => u.email === email);

		if (!existingUser) {
			return fail(400, {
				error: 'Kein Benutzer mit dieser E-Mail-Adresse gefunden.',
				values: { firstName, lastName }
			});
		}

		// 2. Onboarding-Status prüfen — falls bereits abgeschlossen, abbrechen
		const { data: profile, error: profileError } = await locals.supabaseServiceRole
			.schema('app')
			.from('profiles')
			.select('onboarding_status')
			.eq('id', existingUser.id)
			.maybeSingle();

		if (profileError) {
			return fail(500, {
				error: profileError.message,
				values: { firstName, lastName }
			});
		}

		if (profile?.onboarding_status === 'completed') {
			return fail(400, {
				error:
					'Dieser Benutzer hat das Onboarding bereits abgeschlossen. Bitte melde dich direkt an.',
				values: { firstName, lastName }
			});
		}

		// 3. Passwort + Metadaten setzen
		const { error: updateError } = await locals.supabaseServiceRole.auth.admin.updateUserById(
			existingUser.id,
			{
				password,
				user_metadata: {
					first_name: firstName,
					last_name: lastName
				}
			}
		);

		if (updateError) {
			return fail(500, {
				error: updateError.message,
				values: { firstName, lastName }
			});
		}

		// 4. Einloggen
		const { error: signInError } = await locals.supabase.auth.signInWithPassword({
			email,
			password
		});

		if (signInError) {
			return fail(500, {
				error: m.onboarding_error_signin_failed() + signInError.message,
				values: { firstName, lastName }
			});
		}

		// 5. Invite akzeptieren
		const { error: acceptError } = await locals.supabase.rpc('accept_invite', {
			invite_token: token
		});

		if (acceptError) {
			return fail(400, {
				error: acceptError.message,
				values: { firstName, lastName }
			});
		}

		// Profil anlegen / aktualisieren
		const { error: statusError } = await locals.supabase.from('profiles').upsert(
			{
				id: existingUser.id,
				first_name: firstName,
				last_name: lastName,
				onboarding_status: 'completed'
			},
			{ onConflict: 'id' }
		);

		if (statusError) {
			console.error('Failed to upsert profile:', statusError);
			// Kein hard fail — User ist bereits eingeloggt und Invite akzeptiert
		}

		// 6. Avatar upload
		if (avatarFile && avatarFile.size > 0) {
			const fileExt = avatarFile.name.split('.').pop() || 'jpg';
			const filePath = `${existingUser.id}/avatar-${Date.now()}.${fileExt}`;

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
						.eq('id', existingUser.id);
				}
			} else {
				console.error('Avatar upload failed:', uploadError);
			}
		}

		throw redirect(303, '/dashboard');
	}
};

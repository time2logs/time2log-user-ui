import { redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import type { InviteDetails } from '$lib/types';
import * as m from '$lib/paraglide/messages.js';
import { getRateLimitSeconds } from '$lib/rateLimitError';
import { validateImageMagicBytes } from '$lib/server/avatarValidation';
import { isSupabaseAuthSecretError } from '$lib/server/onboarding';
import { checkRateLimit, getClientId, hashId, rateKey } from '$lib/server/rateLimiter';
import { validatePassword } from '$lib/passwordValidation';

const WINDOW_15MIN = 15 * 60 * 1000;
const WINDOW_1HOUR = 60 * 60 * 1000;

type ResolvedInviteUser =
	| { ok: true; user: { id: string; email?: string } }
	| {
			ok: false;
			reason: 'invite_invalid' | 'email_mismatch' | 'auth_misconfigured';
	  };

export const load: PageServerLoad = async (
	event
): Promise<{
	token: string | null;
	inviteDetails: InviteDetails | null;
	inviteError: string | null;
}> => {
	const { url, locals } = event;
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

	const loadIpLimit = checkRateLimit(
		rateKey('onboard:load:ip', getClientId(event)),
		30,
		WINDOW_15MIN
	);
	if (!loadIpLimit.allowed) {
		return {
			token,
			inviteDetails: null,
			inviteError: m.rate_limited({ seconds: loadIpLimit.retryAfterSeconds.toString() })
		};
	}

	const loadTokenLimit = checkRateLimit(
		rateKey('onboard:load:token', hashId(token)),
		20,
		WINDOW_15MIN
	);
	if (!loadTokenLimit.allowed) {
		return {
			token,
			inviteDetails: null,
			inviteError: m.rate_limited({ seconds: loadTokenLimit.retryAfterSeconds.toString() })
		};
	}

	// Validate token via service role client (bypasses RLS, no auth needed)
	const { data: inviteDetailsRaw, error: inviteError } = await locals.supabaseSecret.rpc(
		'get_invite_details',
		{ invite_token: token }
	);

	const inviteDetails: InviteDetails | null = inviteDetailsRaw
		? {
				organization_name: inviteDetailsRaw.organization_name,
				email: inviteDetailsRaw.email,
				role: inviteDetailsRaw.role,
				current_semester: inviteDetailsRaw.current_semester ?? null
			}
		: null;

	if (inviteError) {
		return {
			token,
			inviteDetails: null,
			inviteError: inviteError.message
		};
	}

	if (!inviteDetails) {
		return {
			token,
			inviteDetails: null,
			inviteError: m.onboarding_invalid_invite()
		};
	}

	return {
		token,
		inviteDetails, // { organization_name, email, role }
		inviteError: null
	};
};

export const actions: Actions = {
	complete: async ({ request, locals, getClientAddress }) => {
		const formData = await request.formData();
		const firstName = formData.get('first_name')?.toString().trim() ?? '';
		const lastName = formData.get('last_name')?.toString().trim() ?? '';
		const password = formData.get('password')?.toString() ?? '';
		const token = formData.get('invite_token')?.toString() ?? '';
		const email = formData.get('email')?.toString().trim() ?? '';
		const avatarFile = formData.get('avatar') as File | null;

		let avatarExt: string | null = null;
		if (avatarFile && avatarFile.size > 0) {
			if (avatarFile.size > 512 * 1024) {
				return fail(400, {
					error: m.settings_error_file_too_large(),
					values: { firstName, lastName }
				});
			}
			avatarExt = await validateImageMagicBytes(avatarFile);
			if (!avatarExt) {
				return fail(400, {
					error: m.settings_error_file_type(),
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

		const pwError = validatePassword(password);
		if (pwError) {
			const pwMessages = {
				length: m.onboarding_error_password_length(),
				uppercase: m.onboarding_error_password_uppercase(),
				number: m.onboarding_error_password_number(),
				special: m.onboarding_error_password_special()
			};
			return fail(400, {
				error: pwMessages[pwError],
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

		// Rate limit completion attempts to stop token probing / account-provisioning spam.
		const completeIpLimit = checkRateLimit(
			rateKey('onboard:complete:ip', getClientId({ getClientAddress })),
			10,
			WINDOW_1HOUR
		);
		if (!completeIpLimit.allowed) {
			return fail(429, {
				error: m.rate_limited({ seconds: completeIpLimit.retryAfterSeconds.toString() }),
				values: { firstName, lastName }
			});
		}

		const completeTokenLimit = checkRateLimit(
			rateKey('onboard:complete:token', hashId(token)),
			5,
			WINDOW_1HOUR
		);
		if (!completeTokenLimit.allowed) {
			return fail(429, {
				error: m.rate_limited({ seconds: completeTokenLimit.retryAfterSeconds.toString() }),
				values: { firstName, lastName }
			});
		}

		const resolved = await resolveInvitedUser(locals, token, email.toLowerCase());

		if (resolved.ok === false) {
			if (resolved.reason === 'auth_misconfigured') {
				return fail(500, {
					error: m.onboarding_error_auth_secret_mismatch(),
					values: { firstName, lastName }
				});
			}
			return fail(400, {
				error: m.error_user_not_found(),
				values: { firstName, lastName }
			});
		}
		const existingUser = resolved.user;

		// 2. Onboarding-Status prüfen — falls bereits abgeschlossen, abbrechen
		const { data: profile, error: profileError } = await locals.supabaseSecret
			.schema('app')
			.from('profiles')
			.select('onboarding_status')
			.eq('id', existingUser.id)
			.maybeSingle();

		const profileData = profile as {
			onboarding_status?: string;
		} | null;

		if (profileError) {
			console.error('[Onboarding] Failed to check profile status:', profileError.message);
			return fail(500, {
				error: m.error_server(),
				values: { firstName, lastName }
			});
		}

		if (profileData?.onboarding_status === 'completed') {
			return fail(400, {
				error: m.error_onboarding_completed(),
				values: { firstName, lastName }
			});
		}

		// 3. Passwort + Metadaten setzen
		const { error: updateError } = await locals.supabaseSecret.auth.admin.updateUserById(
			existingUser.id,
			{
				password,
				email_confirm: true,
				user_metadata: {
					first_name: firstName,
					last_name: lastName
				}
			}
		);

		if (updateError) {
			const seconds = getRateLimitSeconds(updateError);
			if (seconds) {
				return fail(429, {
					error: m.rate_limited({ seconds }),
					values: { firstName, lastName }
				});
			}

			console.error('[Onboarding] Failed to update user:', updateError.message);
			return fail(500, {
				error: m.error_server(),
				values: { firstName, lastName }
			});
		}

		// 4. Einloggen
		const { error: signInError } = await locals.supabase.auth.signInWithPassword({
			email,
			password
		});

		if (signInError) {
			const seconds = getRateLimitSeconds(signInError);
			if (seconds) {
				return fail(429, {
					error: m.rate_limited({ seconds }),
					values: { firstName, lastName }
				});
			}

			console.error('[Onboarding] Sign-in failed:', signInError.message);
			return fail(500, {
				error: `${m.onboarding_error_signin_failed()}${signInError.message}`,
				values: { firstName, lastName }
			});
		}

		// 5. Invite akzeptieren
		const { error: acceptError } = await locals.supabase.rpc('accept_invite', {
			invite_token: token
		});

		if (acceptError) {
			console.error('[Onboarding] Failed to accept invite:', acceptError.message);
			return fail(400, {
				error: m.error_accept_invite(),
				values: { firstName, lastName }
			});
		}

		// Profil anlegen / aktualisieren.
		// onboarding_status wird hier NICHT gesetzt: accept_invite (SECURITY DEFINER)
		// hat das Profil bereits auf 'completed' gesetzt. Ein erneutes Setzen ueber den
		// user-gebundenen Client wuerde am Guard guard_profile_privileged_columns
		// scheitern (42501 "onboarding_status cannot be set by the user").
		const { error: statusError } = await locals.supabase.from('profiles').upsert(
			{
				id: existingUser.id,
				first_name: firstName,
				last_name: lastName
			},
			{ onConflict: 'id' }
		);

		if (statusError) {
			console.error('Failed to upsert profile:', statusError);
			return fail(500, {
				error: m.onboarding_error_profile_save(),
				values: { firstName, lastName }
			});
		}

		// 6. Avatar upload
		if (avatarFile && avatarFile.size > 0 && avatarExt) {
			const filePath = `${existingUser.id}/avatar-${Date.now()}.${avatarExt}`;

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
						.eq('id', existingUser.id);
					if (avatarUrlError) {
						console.error('Failed to link avatar URL to profile:', avatarUrlError);
					}
				}
			} else {
				console.error('Avatar upload failed:', uploadError);
			}
		}

		throw redirect(303, '/dashboard');
	}
};

type FindUserByEmailResult =
	| { ok: true; user: { id: string; email?: string } }
	| { ok: false; reason: 'auth_misconfigured' | 'not_found' };

async function findUserByEmail(locals: App.Locals, email: string): Promise<FindUserByEmailResult> {
	const normalizedEmail = email.toLowerCase();

	const {
		data: { users },
		error: listUsersError
	} = await locals.supabaseSecret.auth.admin.listUsers();
	if (listUsersError) {
		console.error('[Onboarding] Failed to list users:', listUsersError.message);
		if (isSupabaseAuthSecretError(listUsersError.message)) {
			return { ok: false, reason: 'auth_misconfigured' };
		}
		return { ok: false, reason: 'not_found' };
	}

	const typedUsers = (users ?? []) as Array<{ id: string; email?: string | null }>;
	const match = typedUsers.find((u) => u.email?.toLowerCase() === normalizedEmail);
	if (match?.id) {
		return { ok: true, user: { id: match.id, email: match.email ?? undefined } };
	}
	return { ok: false, reason: 'not_found' };
}

async function resolveInvitedUser(
	locals: App.Locals,
	token: string,
	email: string
): Promise<ResolvedInviteUser> {
	const normalizedEmail = email.toLowerCase();
	const { data: inviteDetailsRaw, error: inviteError } = await locals.supabaseSecret.rpc(
		'get_invite_details',
		{ invite_token: token }
	);

	if (inviteError || !inviteDetailsRaw?.email) {
		if (inviteError) {
			console.error('[Onboarding] Failed validating invite token:', inviteError.message);
		}
		return { ok: false, reason: 'invite_invalid' };
	}

	const inviteEmail = inviteDetailsRaw.email.toLowerCase();
	if (inviteEmail !== normalizedEmail) {
		console.error('[Onboarding] Invite email mismatch for token:', token);
		return { ok: false, reason: 'email_mismatch' };
	}

	const found = await findUserByEmail(locals, normalizedEmail);
	if (found.ok) {
		return { ok: true, user: found.user };
	}
	if (found.ok === false && found.reason === 'auth_misconfigured') {
		return { ok: false, reason: 'auth_misconfigured' };
	}

	const { data: createdUserData, error: createUserError } =
		await locals.supabaseSecret.auth.admin.createUser({
			email: normalizedEmail,
			email_confirm: true
		});

	if (createUserError || !createdUserData.user?.id) {
		if (createUserError) {
			console.error('[Onboarding] Failed to provision invited auth user:', createUserError.message);
			if (isSupabaseAuthSecretError(createUserError.message)) {
				return { ok: false, reason: 'auth_misconfigured' };
			}
			if (/already registered|already been registered/i.test(createUserError.message)) {
				const retry = await findUserByEmail(locals, normalizedEmail);
				if (retry.ok) {
					return { ok: true, user: retry.user };
				}
				if (retry.ok === false && retry.reason === 'auth_misconfigured') {
					return { ok: false, reason: 'auth_misconfigured' };
				}
			}
		}
		return { ok: false, reason: 'invite_invalid' };
	}

	return { ok: true, user: { id: createdUserData.user.id, email: normalizedEmail } };
}

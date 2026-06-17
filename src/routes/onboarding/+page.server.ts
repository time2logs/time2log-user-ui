import { redirect, fail } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import type { PageServerLoad, Actions } from './$types';
import type { InviteDetails } from '$lib/types';
import * as m from '$lib/paraglide/messages.js';
import { validateImageMagicBytes } from '$lib/server/avatarValidation';
import {
	hashOtp,
	isSmsEnabled,
	isSupabaseAuthSecretError,
	normalizeSwissPhone
} from '$lib/server/onboarding';
import { sendSwisscomVerificationSms } from '$lib/server/swisscomSms';
import { randomInt } from 'node:crypto';

type ResolvedInviteUser =
	| { ok: true; user: { id: string; email?: string } }
	| {
			ok: false;
			reason: 'invite_invalid' | 'email_mismatch' | 'auth_misconfigured';
	  };

function debugOnboarding(step: string, details: Record<string, unknown> = {}) {
	if (env.DEBUG_ONBOARDING !== '1' && env.NODE_ENV === 'production') return;
	console.info(`[Onboarding][${step}]`, details);
}

function errorDetails(error: unknown): Record<string, unknown> {
	if (!error || typeof error !== 'object') return { error };
	const maybeError = error as {
		name?: unknown;
		message?: unknown;
		status?: unknown;
		code?: unknown;
	};
	return {
		name: maybeError.name,
		message: maybeError.message,
		status: maybeError.status,
		code: maybeError.code
	};
}

export const load: PageServerLoad = async ({
	url,
	locals
}): Promise<{
	token: string | null;
	inviteDetails: InviteDetails | null;
	inviteError: string | null;
	useSms: boolean;
}> => {
	const session = await locals.safeGetSession();
	const token = url.searchParams.get('invite_token');
	const useSms = isSmsEnabled();

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
			inviteError: m.onboarding_no_invite_token(),
			useSms
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
				role: inviteDetailsRaw.role
			}
		: null;

	if (inviteError) {
		return {
			token,
			inviteDetails: null,
			inviteError: inviteError.message,
			useSms
		};
	}

	if (!inviteDetails) {
		return {
			token,
			inviteDetails: null,
			inviteError: m.onboarding_invalid_invite(),
			useSms
		};
	}

	return {
		token,
		inviteDetails, // { organization_name, email, role }
		inviteError: null,
		useSms
	};
};

export const actions: Actions = {
	sendPhoneCode: async ({ request, locals }) => {
		if (!isSmsEnabled()) {
			return fail(404, { error: 'SMS verification is disabled.' });
		}

		const formData = await request.formData();
		const token = formData.get('invite_token')?.toString() ?? '';
		const email = formData.get('email')?.toString().trim().toLowerCase() ?? '';
		const phoneNumberRaw = formData.get('phone_number')?.toString().trim() ?? '';

		if (!token || !email) {
			return fail(400, {
				error: m.onboarding_error_token_missing()
			});
		}

		const phoneNumber = normalizeSwissPhone(phoneNumberRaw);
		if (!phoneNumber) {
			return fail(400, {
				error: m.onboarding_phone_invalid()
			});
		}

		const resolved = await resolveInvitedUser(locals, token, email);
		if (resolved.ok === false) {
			if (resolved.reason === 'auth_misconfigured') {
				return fail(500, { error: m.onboarding_error_auth_secret_mismatch() });
			}
			return fail(400, { error: 'Kein Benutzer mit dieser E-Mail-Adresse gefunden.' });
		}
		const existingUser = resolved.user;

		const { data: profileData, error: profileError } = await locals.supabaseSecret
			.schema('app')
			.from('profiles')
			.select('last_time_sent')
			.eq('id', existingUser.id)
			.maybeSingle();

		if (profileError) {
			console.error('[Onboarding] Failed reading profile before SMS send:', profileError.message);
			return fail(500, { error: m.onboarding_phone_send_failed() });
		}

		if (!profileData) {
			return fail(400, { error: m.onboarding_phone_profile_missing() });
		}

		const now = Date.now();
		if (profileData.last_time_sent) {
			const remainingSeconds = Math.ceil(
				(30_000 - (now - new Date(profileData.last_time_sent).getTime())) / 1000
			);
			if (remainingSeconds > 0) {
				return fail(429, {
					error: m.onboarding_phone_cooldown({ seconds: remainingSeconds.toString() }),
					cooldownSeconds: remainingSeconds
				});
			}
		}

		const oneHourAgo = new Date(now - 60 * 60 * 1000).toISOString();
		const { count: sendsInLastHour, error: eventsError } = await locals.supabaseSecret
			.schema('admin')
			.from('sms_verification_events')
			.select('id', { count: 'exact', head: true })
			.eq('user_id', existingUser.id)
			.eq('status', 'sent')
			.gte('sent_at', oneHourAgo);

		if (eventsError) {
			console.error('[Onboarding] Failed counting SMS sends:', eventsError.message);
			return fail(500, { error: m.onboarding_phone_send_failed() });
		}

		if ((sendsInLastHour ?? 0) >= 3) {
			return fail(429, { error: m.onboarding_phone_hour_limit() });
		}

		const code = randomInt(100000, 1000000).toString();
		const codeHash = hashOtp(code);
		const expiresAt = new Date(now + 10 * 60 * 1000).toISOString();
		try {
			const smsResult = await sendSwisscomVerificationSms({ to: phoneNumber, code });

			const { error: profileUpdateError } = await locals.supabaseSecret
				.schema('app')
				.from('profiles')
				.update({
					phone_number: phoneNumber,
					phone_verified: false,
					phone_verified_at: null,
					phone_verification_code_hash: codeHash,
					phone_verification_code_expires_at: expiresAt,
					last_time_sent: new Date(now).toISOString()
				})
				.eq('id', existingUser.id);
			if (profileUpdateError) {
				throw new Error(profileUpdateError.message);
			}

			const { error: eventInsertError } = await locals.supabaseSecret
				.schema('admin')
				.from('sms_verification_events')
				.insert({
					user_id: existingUser.id,
					phone_number: phoneNumber,
					status: 'sent',
					provider_message_id: smsResult.messageId
				});
			if (eventInsertError) {
				console.error('[Onboarding] Failed inserting SMS event:', eventInsertError.message);
			}
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Unknown SMS error';
			console.error('[Onboarding] SMS send failed:', message);

			await locals.supabaseSecret.schema('admin').from('sms_verification_events').insert({
				user_id: existingUser.id,
				phone_number: phoneNumber,
				status: 'failed',
				error_message: message
			});

			return fail(500, { error: m.onboarding_phone_send_failed() });
		}

		return { phoneSent: true };
	},
	verifyPhoneCode: async ({ request, locals }) => {
		if (!isSmsEnabled()) {
			return fail(404, { error: 'SMS verification is disabled.' });
		}

		const formData = await request.formData();
		const token = formData.get('invite_token')?.toString() ?? '';
		const email = formData.get('email')?.toString().trim().toLowerCase() ?? '';
		const code = formData.get('phone_code')?.toString().trim() ?? '';

		if (!token) {
			return fail(400, { error: m.onboarding_error_token_missing() });
		}
		if (!email) {
			return fail(400, { error: m.onboarding_error_email_missing() });
		}
		if (!/^\d{6}$/.test(code)) {
			return fail(400, { error: m.onboarding_phone_code_invalid() });
		}

		const resolved = await resolveInvitedUser(locals, token, email);
		if (resolved.ok === false) {
			if (resolved.reason === 'auth_misconfigured') {
				return fail(500, { error: m.onboarding_error_auth_secret_mismatch() });
			}
			return fail(400, { error: 'Kein Benutzer mit dieser E-Mail-Adresse gefunden.' });
		}
		const existingUser = resolved.user;

		const { data: profileData, error: profileError } = await locals.supabaseSecret
			.schema('app')
			.from('profiles')
			.select('phone_verification_code_hash, phone_verification_code_expires_at')
			.eq('id', existingUser.id)
			.maybeSingle();

		if (profileError) {
			console.error('[Onboarding] Failed reading verification code:', profileError.message);
			return fail(500, { error: m.onboarding_phone_verify_failed() });
		}
		if (
			!profileData?.phone_verification_code_hash ||
			!profileData.phone_verification_code_expires_at
		) {
			return fail(400, { error: m.onboarding_phone_code_missing() });
		}
		if (new Date(profileData.phone_verification_code_expires_at).getTime() < Date.now()) {
			return fail(400, { error: m.onboarding_phone_code_expired() });
		}
		if (hashOtp(code) !== profileData.phone_verification_code_hash) {
			return fail(400, { error: m.onboarding_phone_code_invalid() });
		}

		const { error: verifyError } = await locals.supabaseSecret
			.schema('app')
			.from('profiles')
			.update({
				phone_verified: true,
				phone_verified_at: new Date().toISOString(),
				phone_verification_code_hash: null,
				phone_verification_code_expires_at: null
			})
			.eq('id', existingUser.id);

		if (verifyError) {
			console.error('[Onboarding] Failed marking phone as verified:', verifyError.message);
			return fail(500, { error: m.onboarding_phone_verify_failed() });
		}

		return { phoneVerified: true };
	},
	complete: async ({ request, locals }) => {
		const formData = await request.formData();
		const firstName = formData.get('first_name')?.toString().trim() ?? '';
		const lastName = formData.get('last_name')?.toString().trim() ?? '';
		const password = formData.get('password')?.toString() ?? '';
		const token = formData.get('invite_token')?.toString() ?? '';
		const email = formData.get('email')?.toString().trim() ?? '';
		const phoneNumber = formData.get('phone_number')?.toString().trim() ?? '';
		const avatarFile = formData.get('avatar') as File | null;
		const useSms = isSmsEnabled();

		debugOnboarding('complete:start', {
			email: email.toLowerCase(),
			useSms,
			hasToken: Boolean(token),
			hasPhoneNumber: Boolean(phoneNumber),
			hasAvatar: Boolean(avatarFile && avatarFile.size > 0),
			avatarSize: avatarFile?.size ?? 0
		});

		let avatarExt: string | null = null;
		if (avatarFile && avatarFile.size > 0) {
			if (avatarFile.size > 512 * 1024) {
				return fail(400, {
					error: 'File size exceeds 0.5MB limit. Please choose a smaller image.',
					values: { firstName, lastName }
				});
			}
			avatarExt = await validateImageMagicBytes(avatarFile);
			if (!avatarExt) {
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
		if (useSms && !phoneNumber) {
			return fail(400, {
				error: m.onboarding_phone_required(),
				values: { firstName, lastName }
			});
		}

		debugOnboarding('complete:resolve-invited-user:start', { email: email.toLowerCase() });
		const resolved = await resolveInvitedUser(locals, token, email.toLowerCase());

		if (resolved.ok === false) {
			debugOnboarding('complete:resolve-invited-user:failed', { reason: resolved.reason });
			if (resolved.reason === 'auth_misconfigured') {
				return fail(500, {
					error: m.onboarding_error_auth_secret_mismatch(),
					values: { firstName, lastName }
				});
			}
			return fail(400, {
				error: 'Kein Benutzer mit dieser E-Mail-Adresse gefunden.',
				values: { firstName, lastName }
			});
		}
		const existingUser = resolved.user;
		debugOnboarding('complete:resolve-invited-user:success', {
			userId: existingUser.id,
			email: existingUser.email
		});

		let normalizedPhoneNumber: string | null = null;
		if (useSms) {
			normalizedPhoneNumber = normalizeSwissPhone(phoneNumber);
			if (!normalizedPhoneNumber) {
				return fail(400, {
					error: m.onboarding_phone_invalid(),
					values: { firstName, lastName }
				});
			}
		}

		// 2. Onboarding-Status prüfen — falls bereits abgeschlossen, abbrechen
		debugOnboarding('complete:profile-check:start', {
			userId: existingUser.id,
			select: useSms ? 'with-phone-verification' : 'without-phone-verification'
		});
		const { data: profile, error: profileError } = await locals.supabaseSecret
			.schema('app')
			.from('profiles')
			.select(useSms ? 'onboarding_status, phone_verified, phone_number' : 'onboarding_status')
			.eq('id', existingUser.id)
			.maybeSingle();

		if (profileError) {
			console.error('[Onboarding] Failed to check profile status:', profileError.message);
			debugOnboarding('complete:profile-check:error', errorDetails(profileError));
			return fail(500, {
				error: 'Ein Serverfehler ist aufgetreten. Bitte versuche es erneut.',
				values: { firstName, lastName }
			});
		}

		debugOnboarding('complete:profile-check:success', {
			onboardingStatus: profile?.onboarding_status,
			phoneVerified: useSms ? profile?.phone_verified : undefined,
			hasPhoneNumber: useSms ? Boolean(profile?.phone_number) : undefined
		});

		if (profile?.onboarding_status === 'completed') {
			return fail(400, {
				error:
					'Dieser Benutzer hat das Onboarding bereits abgeschlossen. Bitte melde dich direkt an.',
				values: { firstName, lastName }
			});
		}

		if (useSms && (!profile?.phone_verified || profile.phone_number !== normalizedPhoneNumber)) {
			return fail(400, {
				error: m.onboarding_phone_not_verified(),
				values: { firstName, lastName }
			});
		}

		// 3. Passwort + Metadaten setzen
		debugOnboarding('complete:update-auth-user:start', { userId: existingUser.id });
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
			console.error('[Onboarding] Failed to update user:', updateError.message);
			debugOnboarding('complete:update-auth-user:error', errorDetails(updateError));
			return fail(500, {
				error: 'Ein Serverfehler ist aufgetreten. Bitte versuche es erneut.',
				values: { firstName, lastName }
			});
		}
		debugOnboarding('complete:update-auth-user:success', { userId: existingUser.id });

		// 4. Einloggen
		debugOnboarding('complete:sign-in:start', { email });
		const { error: signInError } = await locals.supabase.auth.signInWithPassword({
			email,
			password
		});

		if (signInError) {
			console.error('[Onboarding] Sign-in failed:', signInError.message);
			debugOnboarding('complete:sign-in:error', errorDetails(signInError));
			return fail(500, {
				error: `${m.onboarding_error_signin_failed()}${signInError.message}`,
				values: { firstName, lastName }
			});
		}
		debugOnboarding('complete:sign-in:success', { email });

		// 5. Invite akzeptieren
		debugOnboarding('complete:accept-invite:start', { userId: existingUser.id });
		const { error: acceptError } = await locals.supabase.rpc('accept_invite', {
			invite_token: token
		});

		if (acceptError) {
			console.error('[Onboarding] Failed to accept invite:', acceptError.message);
			debugOnboarding('complete:accept-invite:error', errorDetails(acceptError));
			return fail(400, {
				error: 'Einladung konnte nicht angenommen werden. Bitte versuche es erneut.',
				values: { firstName, lastName }
			});
		}
		debugOnboarding('complete:accept-invite:success', { userId: existingUser.id });

		// Profil anlegen / aktualisieren
		debugOnboarding('complete:profile-upsert:start', { userId: existingUser.id, useSms });
		const { error: statusError } = await locals.supabase.from('profiles').upsert(
			{
				id: existingUser.id,
				first_name: firstName,
				last_name: lastName,
				...(useSms && normalizedPhoneNumber ? { phone_number: normalizedPhoneNumber } : {}),
				onboarding_status: 'completed'
			},
			{ onConflict: 'id' }
		);

		if (statusError) {
			console.error('Failed to upsert profile:', statusError);
			debugOnboarding('complete:profile-upsert:error', errorDetails(statusError));
			// Kein hard fail — User ist bereits eingeloggt und Invite akzeptiert
		} else {
			debugOnboarding('complete:profile-upsert:success', { userId: existingUser.id });
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

type FindUserByEmailResult =
	| { ok: true; user: { id: string; email?: string } }
	| { ok: false; reason: 'auth_misconfigured' | 'not_found' };

async function findUserByEmail(locals: App.Locals, email: string): Promise<FindUserByEmailResult> {
	const normalizedEmail = email.toLowerCase();
	const { data: authUser, error: authUserError } = await locals.supabaseSecret
		.schema('auth')
		.from('users')
		.select('id, email')
		.ilike('email', normalizedEmail)
		.maybeSingle();

	if (!authUserError && authUser?.id) {
		return { ok: true, user: { id: authUser.id, email: authUser.email ?? undefined } };
	}

	if (authUserError) {
		console.error('[Onboarding] Failed to query auth.users by email:', authUserError.message);
	}

	// Compatibility fallback for environments where querying auth schema via PostgREST is restricted.
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

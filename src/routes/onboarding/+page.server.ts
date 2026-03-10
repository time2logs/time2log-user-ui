import { redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import type { InviteDetails } from '$lib/types';

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
			inviteError: 'Kein Einladungstoken vorhanden.'
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

		// Validate required fields
		if (!firstName || !lastName) {
			return fail(400, {
				error: 'Vor- und Nachname sind erforderlich.',
				values: { firstName, lastName }
			});
		}

		if (!password || password.length < 8) {
			return fail(400, {
				error: 'Passwort muss mindestens 8 Zeichen lang sein.',
				values: { firstName, lastName }
			});
		}

		const hasUppercase = /[A-Z]/.test(password);
		const hasNumber = /[0-9]/.test(password);
		const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

		if (!hasUppercase) {
			return fail(400, {
				error: 'Passwort muss mindestens einen Großbuchstaben enthalten.',
				values: { firstName, lastName }
			});
		}

		if (!hasNumber) {
			return fail(400, {
				error: 'Passwort muss mindestens eine Ziffer enthalten.',
				values: { firstName, lastName }
			});
		}

		if (!hasSpecialChar) {
			return fail(400, {
				error: 'Passwort muss mindestens ein Sonderzeichen enthalten (!@#$%^&*(), etc.).',
				values: { firstName, lastName }
			});
		}

		if (!token) {
			return fail(400, {
				error: 'Einladungstoken fehlt.',
				values: { firstName, lastName }
			});
		}

		if (!email) {
			return fail(400, {
				error: 'E-Mail-Adresse fehlt.',
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
			await locals.supabaseServiceRole.auth.admin.deleteUser(newUser.user.id);
			return fail(500, {
				error: 'Konto wurde erstellt, aber Anmeldung fehlgeschlagen: ' + signInError.message,
				values: { firstName, lastName }
			});
		}

		// 3. Now the supabase client has the user's session — call accept_invite
		//    If this fails, clean up the created user to avoid orphaned accounts
		const { error: acceptError } = await locals.supabase.rpc('accept_invite', {
			invite_token: token
		});

		if (acceptError) {
			await locals.supabaseServiceRole.auth.admin.deleteUser(newUser.user.id);
			return fail(400, {
				error: acceptError.message,
				values: { firstName, lastName }
			});
		}

		throw redirect(303, '/dashboard');
	}
};

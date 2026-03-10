import { redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ url, locals }) => {
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
	const { data: inviteDetails, error: inviteError } = await locals.supabaseServiceRole.rpc(
		'get_invite_details',
		{ invite_token: token }
	);

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

		// 2. Accept invite via service role — impersonates the new user via RPC
		//    The accept_invite RPC uses auth.uid(), so we need to call it as the new user.
		//    Since we have the service role, we sign in as the user first to get a session,
		//    then use that session's client to call accept_invite.
		const { error: signInError } = await locals.supabase.auth.signInWithPassword({
			email,
			password
		});

		if (signInError) {
			return fail(500, {
				error: 'Konto wurde erstellt, aber Anmeldung fehlgeschlagen: ' + signInError.message,
				values: { firstName, lastName }
			});
		}

		// 3. Now the supabaseAdmin client has the user's session — call accept_invite
		const { error: acceptError } = await locals.supabaseAdmin.rpc('accept_invite', {
			invite_token: token
		});

		if (acceptError) {
			return fail(400, {
				error: acceptError.message,
				values: { firstName, lastName }
			});
		}

		throw redirect(303, '/dashboard');
	}
};

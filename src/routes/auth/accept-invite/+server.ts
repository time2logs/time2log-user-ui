import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/**
 * Legacy invite-email link target. The real onboarding flow lives at /onboarding
 * (`?invite_token=...`); this route just forwards there so old invite links and
 * any Supabase Auth "Redirect URL" pointing here keep working instead of 404-ing.
 */
export const GET: RequestHandler = ({ url }) => {
	const inviteToken =
		url.searchParams.get('invite_token') ?? url.searchParams.get('token') ?? '';
	const target = inviteToken
		? `/onboarding?invite_token=${encodeURIComponent(inviteToken)}`
		: '/onboarding';
	throw redirect(307, target);
};

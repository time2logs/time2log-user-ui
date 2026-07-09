import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ url }) => {
	const inviteToken = url.searchParams.get('invite_token') ?? url.searchParams.get('token') ?? '';
	const target = inviteToken
		? `/onboarding?invite_token=${encodeURIComponent(inviteToken)}`
		: '/onboarding';
	throw redirect(307, target);
};

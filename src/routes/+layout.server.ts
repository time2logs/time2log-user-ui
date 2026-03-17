import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import type { CurriculumNode, TeamMember, Team } from '$lib/types';

type Profile = {
	id: string;
	first_name: string;
	last_name: string;
	onboarding_status: string;
	avatar_url: string | null;
};

export const load: LayoutServerLoad = async ({ locals, url }) => {
	try {
		const session = await locals.safeGetSession();
    const ONBOARDING_ALLOWED_PATHS = ['/onboarding', '/login'];


		if (!session) {
			return { profile: null, teamMember: null, curriculumNodes: [] };
		}

		const userId = session.user.id;

		const [profileResult, teamMemberResult] = await Promise.all([
			locals.supabase.from('profiles').select('*').eq('id', userId).single(),
			locals.supabaseAdmin.from('team_members').select('*').eq('user_id', userId).limit(1)
		]);

		const profile = profileResult.error ? null : profileResult.data;

	// Global onboarding enforcement: incomplete users can only access allowed paths
	const isAllowedPath =
		url.pathname === '/onboarding' ||
		url.pathname.startsWith('/onboarding/') ||
		url.pathname === '/login' ||
		url.pathname.startsWith('/login/');
	if (profile && profile.onboarding_status !== 'completed' && !isAllowedPath) {
		throw redirect(303, '/onboarding');
	}

	const teamMember =
		teamMemberResult.data && teamMemberResult.data.length > 0 ? teamMemberResult.data[0] : null;

		if (!teamMember) {
			return { profile, teamMember: null, curriculumNodes: [] };
		}

		const { data: team, error: teamError } = await locals.supabaseAdmin
			.from('teams')
			.select('organization_id, profession_id')
			.eq('id', teamMember.team_id)
			.single<Pick<Team, 'organization_id' | 'profession_id'>>();

		if (teamError || !team) {
			console.error('Team query error:', teamError);
			return { profile, teamMember: null, curriculumNodes: [] };
		}

		// Enrich teamMember with organization and profession info
		const enrichedTeamMember = {
			...teamMember,
			organization_id: team.organization_id,
			profession_id: team.profession_id
		};

		const { data: nodes, error: nodesError } = await locals.supabase
			.from('curriculum_nodes')
			.select('*')
			.eq('profession_id', team.profession_id)
			.order('key');

		if (nodesError) {
			console.error('Curriculum nodes query error:', nodesError);
			return { profile, teamMember: enrichedTeamMember, curriculumNodes: [] };
		}

		return {
			profile,
			teamMember: enrichedTeamMember,
			curriculumNodes: (nodes as CurriculumNode[]) ?? []
		};
	} catch (error) {
		console.error('Layout load error:', error);
		return { profile: null, teamMember: null, curriculumNodes: [] };
	}
};

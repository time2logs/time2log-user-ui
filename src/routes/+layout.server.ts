import { redirect, isRedirect, isHttpError } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import type { CurriculumNode, Team } from '$lib/types';

export const load: LayoutServerLoad = async ({ locals, url }) => {
	try {
		const session = await locals.safeGetSession();

		if (!session) {
			const isPublicPath =
				url.pathname === '/' || url.pathname === '/login' || url.pathname.startsWith('/login/');
			if (!isPublicPath) {
				throw redirect(303, '/login');
			}
			return {
				profile: null,
				teamMember: null,
				curriculumNodes: [],
				organizationName: null,
				professionLabel: null
			};
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
			return {
				profile,
				teamMember: null,
				curriculumNodes: [],
				organizationName: null,
				professionLabel: null
			};
		}

		const { data: team, error: teamError } = await locals.supabaseAdmin
			.from('teams')
			.select('organization_id, profession_id')
			.eq('id', teamMember.team_id)
			.single<Pick<Team, 'organization_id' | 'profession_id'>>();

		if (teamError || !team) {
			console.error('Team query error:', teamError);
			return {
				profile,
				teamMember: null,
				curriculumNodes: [],
				organizationName: null,
				professionLabel: null
			};
		}

		// Enrich teamMember with organization and profession info
		const enrichedTeamMember = {
			...teamMember,
			organization_id: team.organization_id,
			profession_id: team.profession_id
		};

		const [nodesResult, orgResult, professionResult] = await Promise.all([
			locals.supabase
				.from('curriculum_nodes')
				.select('*')
				.eq('profession_id', team.profession_id)
				.order('key'),
			locals.supabaseAdmin
				.from('organizations')
				.select('name')
				.eq('id', team.organization_id)
				.single(),
			locals.supabaseAdmin.from('professions').select('label').eq('id', team.profession_id).single()
		]);

		if (nodesResult.error) {
			console.error('Curriculum nodes query error:', nodesResult.error);
			return {
				profile,
				teamMember: enrichedTeamMember,
				curriculumNodes: [],
				organizationName: null,
				professionLabel: null
			};
		}

		return {
			profile,
			teamMember: enrichedTeamMember,
			curriculumNodes: (nodesResult.data as CurriculumNode[]) ?? [],
			organizationName: orgResult.data?.name ?? null,
			professionLabel: professionResult.data?.label ?? null
		};
	} catch (error) {
		// Re-throw SvelteKit redirects and HTTP errors — catching these would silently bypass auth enforcement
		if (isRedirect(error) || isHttpError(error)) throw error;
		console.error('Layout load error:', error);
		return {
			profile: null,
			teamMember: null,
			curriculumNodes: [],
			organizationName: null,
			professionLabel: null
		};
	}
};

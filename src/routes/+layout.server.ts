import { redirect, isRedirect, isHttpError } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import type { CurriculumNode, CurriculumNodeSummary, Team } from '$lib/types';

export const load: LayoutServerLoad = async ({ locals, url }) => {
	try {
		const session = await locals.safeGetSession();

		if (!session) {
			const isPublicPath =
				url.pathname === '/' ||
				url.pathname === '/login' ||
				url.pathname.startsWith('/login/') ||
				url.pathname === '/impressum' ||
				url.pathname.startsWith('/impressum/') ||
				url.pathname === '/privacy' ||
				url.pathname.startsWith('/privacy/') ||
				url.pathname === '/onboarding' ||
				url.pathname.startsWith('/onboarding/');
			if (!isPublicPath) {
				throw redirect(303, '/login');
			}
			return {
				profile: null,
				teamMember: null,
				curriculumNodes: [],
				curriculumNodeSummaries: [],
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
				curriculumNodeSummaries: [],
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
				curriculumNodeSummaries: [],
				organizationName: null,
				professionLabel: null
			};
		}

		const enrichedTeamMember = {
			...teamMember,
			organization_id: team.organization_id,
			profession_id: team.profession_id
		};

		const [nodesResult, summaryResult, orgResult, professionResult] = await Promise.all([
			locals.supabaseAdmin
				.from('curriculum_nodes')
				.select('*')
				.eq('organization_id', team.organization_id)
				.eq('profession_id', team.profession_id)
				.eq('is_active', true)
				.order('sort_order')
				.order('key'),
			locals.supabaseAdmin
				.from('curriculum_nodes')
				.select('id, key, label, is_active')
				.eq('organization_id', team.organization_id)
				.eq('profession_id', team.profession_id)
				.order('sort_order')
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
				curriculumNodeSummaries: [],
				organizationName: null,
				professionLabel: null
			};
		}

		if (summaryResult.error) {
			console.error('Curriculum node summary query error:', summaryResult.error);
		}

		return {
			profile,
			teamMember: enrichedTeamMember,
			curriculumNodes: (nodesResult.data as CurriculumNode[]) ?? [],
			curriculumNodeSummaries: (summaryResult.data as CurriculumNodeSummary[] | null) ?? [],
			organizationName: orgResult.data?.name ?? null,
			professionLabel: professionResult.data?.label ?? null
		};
	} catch (error) {
		if (isRedirect(error) || isHttpError(error)) throw error;
		console.error('Layout load error:', error);
		return {
			profile: null,
			teamMember: null,
			curriculumNodes: [],
			curriculumNodeSummaries: [],
			organizationName: null,
			professionLabel: null
		};
	}
};

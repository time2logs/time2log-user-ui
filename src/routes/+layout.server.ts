import type { LayoutServerLoad } from './$types';
import type { CurriculumNode, TeamMember, Team } from '$lib/types';

type Profile = {
	id: number;
	first_name: string;
	last_name: string;
};

export const load: LayoutServerLoad = async ({ locals }) => {
	try {
		const session = await locals.safeGetSession();

		if (!session) {
			return { profile: null, teamMember: null, curriculumNodes: [] };
		}

		const userId = session.user.id;

		const [profileResult, teamMemberResult] = await Promise.all([
			locals.supabase.from('profiles').select<'profiles', Profile>().eq('id', userId).single(),
			locals.supabaseAdmin.from('team_members').select('*').eq('user_id', userId).limit(1)
		]);

		const profile = profileResult.error ? null : profileResult.data;

		const teamMember =
			teamMemberResult.data && teamMemberResult.data.length > 0 ? teamMemberResult.data[0] : null;

		if (!teamMember) {
			return { profile, teamMember: null, curriculumNodes: [] };
		}

		const { data: team, error: teamError } = await locals.supabaseAdmin
			.from('teams')
			.select('profession_id')
			.eq('id', teamMember.team_id)
			.single<Pick<Team, 'profession_id'>>();

		if (teamError || !team) {
			console.error('Team query error:', teamError);
			return { profile, curriculumNodes: [] };
		}

		const { data: nodes, error: nodesError } = await locals.supabase
			.from('curriculum_nodes')
			.select('*')
			.eq('profession_id', team.profession_id)
			.order('key');

		if (nodesError) {
			console.error('Curriculum nodes query error:', nodesError);
			return { profile, curriculumNodes: [] };
		}

		return {
			profile,
			teamMember,
			curriculumNodes: (nodes as CurriculumNode[]) ?? []
		};
	} catch (error) {
		console.error('Layout load error:', error);
		return { profile: null, teamMember: null, curriculumNodes: [] };
	}
};

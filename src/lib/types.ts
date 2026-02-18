export type CurriculumNode = {
	id: string;
	organization_id: string;
	profession_id: string;
	parent_id: string | null;
	node_type: 'activity' | 'category';
	key: string;
	name: string;
};

export type CurriculumTreeNode = CurriculumNode & {
	children: CurriculumTreeNode[];
};

export type TeamMember = {
	team_id: string;
	user_id: string;
	team_role: string;
};

export type Team = {
	id: string;
	organization_id: string;
	profession_id: string;
	name: string;
};

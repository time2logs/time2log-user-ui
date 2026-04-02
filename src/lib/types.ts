export type CurriculumNode = {
	id: string;
	organization_id: string;
	profession_id: string;
	parent_id: string | null;
	node_type: 'activity' | 'category';
	key: string;
	label: string;
	description: string | null;
	sort_order: number;
	meta: Record<string, unknown>;
	is_active: boolean;
	created_at: string;
	updated_at: string;
};

export type CurriculumTreeNode = CurriculumNode & {
	children: CurriculumTreeNode[];
};

export type TeamMember = {
	team_id: string;
	user_id: string;
	team_role: string;
	organization_id: string;
	profession_id: string;
};

export type Team = {
	id: string;
	organization_id: string;
	profession_id: string;
	name: string;
	team_role?: string;
};

export type ActivityRecord = {
	id: string;
	organization_id: string;
	profession_id: string;
	user_id: string;
	team_id: string | null;
	curriculum_activity_id: string;
	entry_date: string;
	hours: number;
	notes: string | null;
	rating: number | null;
	location: string;
	created_at: string;
	updated_at: string;
	activity_name: string;
	activity_key: string;
	activity_label: string;
};

export type AbsenceType = 'sick' | 'vacation' | 'military' | 'uk' | 'berufsschule' | 'custom';

export type AbsenceRecord = {
	id: string;
	user_id: string;
	team_id: string | null;
	organization_id: string;
	absence_type_id: AbsenceType;
	start_date: string;
	end_date: string;
	is_recurring: boolean;
	rrule: string | null;
	notes: string | null;
	created_at: string;
	updated_at: string;
	absence_type_label: string;
};

export type InviteDetails = {
	organization_name: string;
	email: string;
	role: string;
};

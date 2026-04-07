import { describe, expect, it } from 'vitest';
import type { CurriculumNode } from './types';
import { buildTree } from './curriculumTree';

function makeNode(overrides: Partial<CurriculumNode> & { id: string; key: string }): CurriculumNode {
	return {
		organization_id: 'org-1',
		profession_id: 'prof-1',
		parent_id: null,
		node_type: 'category',
		label: overrides.key,
		description: null,
		sort_order: 0,
		meta: {},
		is_active: true,
		created_at: '2024-01-01T00:00:00Z',
		updated_at: '2024-01-01T00:00:00Z',
		...overrides
	};
}

describe('buildTree', () => {
	it('returns an empty array for an empty node list', () => {
		expect(buildTree([])).toEqual([]);
	});

	it('a single root node has no children', () => {
		const nodes = [makeNode({ id: 'a', key: 'a' })];
		const tree = buildTree(nodes);
		expect(tree).toHaveLength(1);
		expect(tree[0].id).toBe('a');
		expect(tree[0].children).toEqual([]);
	});

	it('attaches child nodes under their parent', () => {
		const nodes = [
			makeNode({ id: 'parent', key: 'parent' }),
			makeNode({ id: 'child', key: 'child', parent_id: 'parent' })
		];
		const tree = buildTree(nodes);
		expect(tree).toHaveLength(1);
		expect(tree[0].children).toHaveLength(1);
		expect(tree[0].children[0].id).toBe('child');
	});

	it('treats nodes with an unknown parent_id as roots', () => {
		const nodes = [makeNode({ id: 'orphan', key: 'orphan', parent_id: 'nonexistent' })];
		const tree = buildTree(nodes);
		expect(tree).toHaveLength(1);
		expect(tree[0].id).toBe('orphan');
	});

	it('builds multi-level hierarchies correctly', () => {
		const nodes = [
			makeNode({ id: 'root', key: 'root' }),
			makeNode({ id: 'mid', key: 'mid', parent_id: 'root' }),
			makeNode({ id: 'leaf', key: 'leaf', parent_id: 'mid' })
		];
		const tree = buildTree(nodes);
		expect(tree[0].children[0].children[0].id).toBe('leaf');
	});

	it('sorts root nodes by key (lexicographic with numeric collation)', () => {
		const nodes = [
			makeNode({ id: 'c', key: 'c' }),
			makeNode({ id: 'a', key: 'a' }),
			makeNode({ id: 'b', key: 'b' })
		];
		const ids = buildTree(nodes).map((n) => n.id);
		expect(ids).toEqual(['a', 'b', 'c']);
	});

	it('sorts children by key within each parent', () => {
		const nodes = [
			makeNode({ id: 'parent', key: 'parent' }),
			makeNode({ id: 'c2', key: 'c2', parent_id: 'parent' }),
			makeNode({ id: 'c1', key: 'c1', parent_id: 'parent' })
		];
		const childIds = buildTree(nodes)[0].children.map((n) => n.id);
		expect(childIds).toEqual(['c1', 'c2']);
	});

	it('uses numeric collation so "10" sorts after "9"', () => {
		const nodes = [
			makeNode({ id: 'n10', key: '10' }),
			makeNode({ id: 'n9', key: '9' }),
			makeNode({ id: 'n2', key: '2' })
		];
		const keys = buildTree(nodes).map((n) => n.key);
		expect(keys).toEqual(['2', '9', '10']);
	});

	it('supports multiple root-level nodes each with children', () => {
		const nodes = [
			makeNode({ id: 'root1', key: 'root1' }),
			makeNode({ id: 'root2', key: 'root2' }),
			makeNode({ id: 'child1', key: 'child1', parent_id: 'root1' }),
			makeNode({ id: 'child2', key: 'child2', parent_id: 'root2' })
		];
		const tree = buildTree(nodes);
		expect(tree).toHaveLength(2);
		expect(tree[0].children[0].id).toBe('child1');
		expect(tree[1].children[0].id).toBe('child2');
	});
});

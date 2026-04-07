import type { CurriculumNode, CurriculumTreeNode } from './types';

export function buildTree(nodes: CurriculumNode[]): CurriculumTreeNode[] {
	const map = new Map<string, CurriculumTreeNode>();
	const roots: CurriculumTreeNode[] = [];

	nodes.forEach((node) => {
		map.set(node.id, { ...node, children: [] });
	});

	nodes.forEach((node) => {
		const treeNode = map.get(node.id)!;
		if (node.parent_id && map.has(node.parent_id)) {
			map.get(node.parent_id)!.children.push(treeNode);
		} else {
			roots.push(treeNode);
		}
	});

	const sortByKey = (a: CurriculumTreeNode, b: CurriculumTreeNode) =>
		a.key.localeCompare(b.key, undefined, { numeric: true });
	const sortTree = (nodes: CurriculumTreeNode[]) => {
		nodes.sort(sortByKey);
		nodes.forEach((n) => sortTree(n.children));
	};
	sortTree(roots);

	return roots;
}

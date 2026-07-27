import type { DepartmentVO } from '@/services/security/departments';

export type DepartmentScope = 'all' | 'group' | 'leaf';

export interface DepartmentTreeStats {
  total: number;
  groups: number;
  leaves: number;
}

const safeChildren = (
  node?: DepartmentVO,
): DepartmentVO[] =>
  Array.isArray(node?.childList) ? node.childList : [];

/** Hide the backend's id=0 virtual root from the management UI. */
export const getDepartmentForest = (
  root?: DepartmentVO,
): DepartmentVO[] => {
  if (!root) return [];

  const virtualRoot =
    Number(root.id) === 0 && !root.deptName;

  return virtualRoot ? safeChildren(root) : [root];
};

const matchesScope = (
  node: DepartmentVO,
  scope: DepartmentScope,
): boolean => {
  const hasChildren = safeChildren(node).length > 0;

  if (scope === 'group') {
    return node.leaf === false || hasChildren;
  }

  if (scope === 'leaf') {
    return node.leaf !== false && !hasChildren;
  }

  return true;
};

const matchesKeyword = (
  node: DepartmentVO,
  keyword: string,
): boolean => {
  const query = keyword.trim().toLocaleLowerCase();
  if (!query) return true;

  return [node.id, node.deptName, node.description]
    .filter((value) => value !== undefined && value !== null)
    .some((value) =>
      String(value).toLocaleLowerCase().includes(query),
    );
};

/** Keep every ancestor of a matching department so hierarchy stays clear. */
export const filterDepartmentTree = (
  nodes: DepartmentVO[],
  keyword: string,
  scope: DepartmentScope,
  path = new Set<string>(),
): DepartmentVO[] =>
  nodes.flatMap((node) => {
    const key = String(node.id);
    if (path.has(key)) return [];

    const nextPath = new Set(path);
    nextPath.add(key);

    const children = filterDepartmentTree(
      safeChildren(node),
      keyword,
      scope,
      nextPath,
    );

    const matched =
      matchesScope(node, scope) &&
      matchesKeyword(node, keyword);

    return matched || children.length > 0
      ? [{ ...node, childList: children }]
      : [];
  });

export const collectDepartmentIds = (
  nodes: DepartmentVO[],
): number[] => {
  const ids: number[] = [];
  const visited = new Set<string>();

  const visit = (items: DepartmentVO[]) => {
    for (const node of items) {
      const key = String(node.id);
      if (visited.has(key)) continue;

      visited.add(key);
      const id = Number(node.id);
      if (Number.isFinite(id)) ids.push(id);
      visit(safeChildren(node));
    }
  };

  visit(nodes);
  return ids;
};

export const findDepartmentById = (
  nodes: DepartmentVO[],
  id?: number,
): DepartmentVO | undefined => {
  if (id === undefined) return undefined;

  const expected = String(id);
  const visited = new Set<string>();
  const queue = [...nodes];

  while (queue.length > 0) {
    const node = queue.shift();
    if (!node) continue;

    const key = String(node.id);
    if (visited.has(key)) continue;
    visited.add(key);

    if (key === expected) return node;
    queue.push(...safeChildren(node));
  }

  return undefined;
};

export const findDepartmentPath = (
  nodes: DepartmentVO[],
  id?: number,
): DepartmentVO[] => {
  if (id === undefined) return [];
  const expected = String(id);

  const visit = (
    items: DepartmentVO[],
    ancestors: DepartmentVO[],
    path: Set<string>,
  ): DepartmentVO[] | undefined => {
    for (const node of items) {
      const key = String(node.id);
      if (path.has(key)) continue;

      const nextAncestors = [...ancestors, node];
      if (key === expected) return nextAncestors;

      const nextPath = new Set(path);
      nextPath.add(key);

      const found = visit(
        safeChildren(node),
        nextAncestors,
        nextPath,
      );
      if (found) return found;
    }

    return undefined;
  };

  return visit(nodes, [], new Set()) ?? [];
};

export const getDepartmentTreeStats = (
  nodes: DepartmentVO[],
): DepartmentTreeStats => {
  const stats: DepartmentTreeStats = {
    total: 0,
    groups: 0,
    leaves: 0,
  };
  const visited = new Set<string>();

  const visit = (items: DepartmentVO[]) => {
    for (const node of items) {
      const key = String(node.id);
      if (visited.has(key)) continue;
      visited.add(key);

      stats.total += 1;
      if (node.leaf === false || safeChildren(node).length > 0) {
        stats.groups += 1;
      } else {
        stats.leaves += 1;
      }

      visit(safeChildren(node));
    }
  };

  visit(nodes);
  return stats;
};

export const getDirectChildren = (
  node?: DepartmentVO,
): DepartmentVO[] => safeChildren(node);

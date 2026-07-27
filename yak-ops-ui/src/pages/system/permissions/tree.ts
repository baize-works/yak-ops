import type {
  PermissionVO,
  TreeId,
} from '@/services/security/permissions';

export type PermissionScope =
  | 'all'
  | 'active'
  | 'inactive'
  | 'declared'
  | 'manual';

export interface PermissionTreeStats {
  total: number;
  active: number;
  inactive: number;
  declared: number;
  manual: number;
}

const safeChildren = (
  node?: PermissionVO,
): PermissionVO[] =>
  Array.isArray(node?.childList) ? node.childList : [];

/** Hide the backend's id=0 virtual root from the management UI. */
export const getPermissionForest = (
  root?: PermissionVO,
): PermissionVO[] => {
  if (!root) return [];

  const virtualRoot =
    Number(root.id) === 0 &&
    !root.permissionName &&
    !root.permissionCode;

  return virtualRoot ? safeChildren(root) : [root];
};

const matchesScope = (
  node: PermissionVO,
  scope: PermissionScope,
): boolean => {
  switch (scope) {
    case 'active':
      return node.active !== false;
    case 'inactive':
      return node.active === false;
    case 'declared':
      return node.declared === true;
    case 'manual':
      return node.declared !== true;
    default:
      return true;
  }
};

const matchesKeyword = (
  node: PermissionVO,
  keyword: string,
): boolean => {
  const query = keyword.trim().toLocaleLowerCase();
  if (!query) return true;

  return [
    node.id,
    node.permissionName,
    node.permissionCode,
    node.description,
  ]
    .filter((value) => value !== undefined && value !== null)
    .some((value) =>
      String(value).toLocaleLowerCase().includes(query),
    );
};

/**
 * Filter nodes locally because the backend exposes one complete tree endpoint.
 * Every ancestor of a matching node is retained so the hierarchy stays clear.
 */
export const filterPermissionTree = (
  nodes: PermissionVO[],
  keyword: string,
  scope: PermissionScope,
  path = new Set<string>(),
): PermissionVO[] =>
  nodes.flatMap((node) => {
    const key = String(node.id);
    if (path.has(key)) return [];

    const nextPath = new Set(path);
    nextPath.add(key);

    const children = filterPermissionTree(
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

export const collectPermissionIds = (
  nodes: PermissionVO[],
): number[] => {
  const ids: number[] = [];
  const visited = new Set<string>();

  const visit = (items: PermissionVO[]) => {
    for (const node of items) {
      const key = String(node.id);
      if (visited.has(key)) continue;

      visited.add(key);
      ids.push(Number(node.id));
      visit(safeChildren(node));
    }
  };

  visit(nodes);
  return ids.filter(Number.isFinite);
};

export const findPermissionById = (
  nodes: PermissionVO[],
  id?: TreeId,
): PermissionVO | undefined => {
  if (id === undefined || id === null) return undefined;

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

export const findPermissionPath = (
  nodes: PermissionVO[],
  id?: TreeId,
): PermissionVO[] => {
  if (id === undefined || id === null) return [];
  const expected = String(id);

  const visit = (
    items: PermissionVO[],
    ancestors: PermissionVO[],
    path: Set<string>,
  ): PermissionVO[] | undefined => {
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

export const getPermissionTreeStats = (
  nodes: PermissionVO[],
): PermissionTreeStats => {
  const stats: PermissionTreeStats = {
    total: 0,
    active: 0,
    inactive: 0,
    declared: 0,
    manual: 0,
  };
  const visited = new Set<string>();

  const visit = (items: PermissionVO[]) => {
    for (const node of items) {
      const key = String(node.id);
      if (visited.has(key)) continue;
      visited.add(key);

      stats.total += 1;
      if (node.active === false) stats.inactive += 1;
      else stats.active += 1;

      if (node.declared === true) stats.declared += 1;
      else stats.manual += 1;

      visit(safeChildren(node));
    }
  };

  visit(nodes);
  return stats;
};

export const getDirectChildren = (
  node?: PermissionVO,
): PermissionVO[] => safeChildren(node);

/**
 * Compatibility helper shared by department management.
 *
 * Search endpoints may return only the matching nodes. This function filters
 * the original tree while retaining every ancestor of a matched node, so the
 * result keeps its hierarchy. String-normalized IDs also support mixed numeric
 * and string identifiers, and the traversal guards against cyclic data.
 */
export const retainMatchedAncestors = <
  T extends {
    id: TreeId;
    children?: T[];
  },
>(
  tree: T[] | null | undefined,
  matches: T[] | null | undefined,
): T[] => {
  const safeArray = (
    value: T[] | null | undefined,
  ): T[] => (Array.isArray(value) ? value : []);

  const matchedIds = new Set<string>();

  const collectMatchedIds = (
    nodes: T[] | null | undefined,
    path: Set<string>,
  ) => {
    for (const node of safeArray(nodes)) {
      const key = String(node.id);
      if (path.has(key)) continue;

      matchedIds.add(key);

      const nextPath = new Set(path);
      nextPath.add(key);
      collectMatchedIds(node.children, nextPath);
    }
  };

  collectMatchedIds(matches, new Set());

  const visit = (
    nodes: T[] | null | undefined,
    path: Set<string>,
  ): T[] =>
    safeArray(nodes).flatMap((node) => {
      const key = String(node.id);
      if (path.has(key)) return [];

      const nextPath = new Set(path);
      nextPath.add(key);

      const children = visit(node.children, nextPath);

      return matchedIds.has(key) || children.length > 0
        ? [{ ...node, children } as T]
        : [];
    });

  return visit(tree, new Set());
};

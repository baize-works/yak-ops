import type { SearchTreeNode } from '@/components/security/TreeSearch';
import type {
  PermissionVO,
  TreeId,
} from '../../../services/security/permissions';

const safeArray = <T>(
  value: T[] | null | undefined,
): T[] => (Array.isArray(value) ? value : []);

export const permissionTreeNodes = (
  items: PermissionVO[] | null | undefined,
  path = new Set<string>(),
): SearchTreeNode[] =>
  safeArray(items).flatMap((item) => {
    const key = String(item.id);

    if (path.has(key)) {
      return [];
    }

    const nextPath = new Set(path);
    nextPath.add(key);

    return [
      {
        key: item.id,
        title: item.name,
        searchText: [
          item.name,
          item.code,
          item.type,
        ]
          .filter(Boolean)
          .join(' '),
        children: permissionTreeNodes(
          item.children,
          nextPath,
        ),
      },
    ];
  });

export const collectTreeIds = <
  T extends {
    id: TreeId;
    children?: T[];
  },
>(
  items: T[] | null | undefined,
): Set<string> => {
  const ids = new Set<string>();

  const visit = (
    nodes: T[] | null | undefined,
    path: Set<string>,
  ) => {
    for (const node of safeArray(nodes)) {
      const id = String(node.id);

      if (path.has(id)) {
        continue;
      }

      ids.add(id);

      const nextPath = new Set(path);
      nextPath.add(id);

      visit(node.children, nextPath);
    }
  };

  visit(items, new Set());

  return ids;
};

export const retainMatchedAncestors = <
  T extends {
    id: TreeId;
    children?: T[];
  },
>(
  tree: T[] | null | undefined,
  matches: T[] | null | undefined,
): T[] => {
  const matchedIds = collectTreeIds(matches);

  const visit = (
    nodes: T[] | null | undefined,
    path: Set<string>,
  ): T[] =>
    safeArray(nodes).flatMap((node) => {
      const id = String(node.id);

      if (path.has(id)) {
        return [];
      }

      const nextPath = new Set(path);
      nextPath.add(id);

      const children = visit(
        node.children,
        nextPath,
      );

      return matchedIds.has(id) ||
        children.length > 0
        ? [{ ...node, children }]
        : [];
    });

  return visit(tree, new Set());
};
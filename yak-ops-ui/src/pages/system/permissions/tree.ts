import type { SearchTreeNode } from '@/components/security/TreeSearch';
import type { PermissionVO, TreeId } from '@/services/security/permissions';

export const permissionTreeNodes = (items: PermissionVO[], path = new Set<string>()): SearchTreeNode[] =>
  items.flatMap((item) => {
    const key = String(item.id);
    if (path.has(key)) return [];
    const nextPath = new Set(path).add(key);
    return [
      {
        key: item.id,
        title: item.name,
        searchText: `${item.name} ${item.code} ${item.type}`,
        children: permissionTreeNodes(item.children ?? [], nextPath),
      },
    ];
  });

export const collectTreeIds = <T extends { id: TreeId; children?: T[] }>(items: T[]): Set<string> => {
  const ids = new Set<string>();
  const visit = (nodes: T[], path: Set<string>) => {
    for (const node of nodes) {
      const id = String(node.id);
      if (path.has(id)) continue;
      ids.add(id);
      visit(node.children ?? [], new Set(path).add(id));
    }
  };
  visit(items, new Set());
  return ids;
};

/** Restrict a full tree to matches returned by search while retaining their ancestor chain. */
export const retainMatchedAncestors = <T extends { id: TreeId; children?: T[] }>(tree: T[], matches: T[]): T[] => {
  const matchedIds = collectTreeIds(matches);
  const visit = (nodes: T[], path: Set<string>): T[] =>
    nodes.flatMap((node) => {
      const id = String(node.id);
      if (path.has(id)) return [];
      const children = visit(node.children ?? [], new Set(path).add(id));
      return matchedIds.has(id) || children.length ? [{ ...node, children }] : [];
    });
  return visit(tree, new Set());
};

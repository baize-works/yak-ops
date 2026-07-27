import type { SearchTreeNode } from '@/components/security/TreeSearch';
import type { DepartmentVO } from '@/services/security/departments';

export const departmentTreeNodes = (items: DepartmentVO[], path = new Set<string>()): SearchTreeNode[] =>
  items.flatMap((item) => {
    const id = String(item.id);
    if (path.has(id)) return [];
    return [
      {
        key: item.id,
        title: item.name,
        searchText: `${item.name} ${item.code ?? ''}`,
        children: departmentTreeNodes(item.children ?? [], new Set(path).add(id)),
      },
    ];
  });

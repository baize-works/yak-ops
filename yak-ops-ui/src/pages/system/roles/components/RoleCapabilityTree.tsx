import { Alert, Empty, Tree } from 'antd';
import type { DataNode } from 'antd/es/tree';
import type { Key, ReactNode } from 'react';
import { useMemo } from 'react';

import type {
  PermissionNodeType,
  PermissionTreeNode,
} from '@/services/security/roles';

interface CapabilityDataNode extends DataNode {
  key: Key;
  nodeType?: PermissionNodeType;
  active?: boolean;
  children?: CapabilityDataNode[];
}

interface CapabilityIndex {
  nodes: Map<number, PermissionTreeNode>;
  parents: Map<number, number>;
  descendants: Map<number, number[]>;
  selectableKeys: Set<number>;
}

interface RoleCapabilityTreeProps {
  tree?: PermissionTreeNode;
  checkedKeys: Key[];
  loading?: boolean;
  readOnly?: boolean;
  onChange?: (keys: Key[]) => void;
}

const nodeKey = (
  node: PermissionTreeNode,
  path: number[],
): number => {
  const id = Number(node.id);
  if (Number.isFinite(id)) return id;

  return Number(`9${path.map((item) => item + 1).join('')}`);
};

const nodeTypeLabel: Record<PermissionNodeType, string> = {
  ROOT: '根节点',
  MENU_GROUP: '菜单目录',
  MENU: '菜单',
  PERMISSION_GROUP: '权限分组',
  ACTION: '按钮',
};

const nodeTypeClass: Record<PermissionNodeType, string> = {
  ROOT: 'border-slate-200 bg-slate-50 text-slate-500',
  MENU_GROUP: 'border-slate-200 bg-slate-50 text-slate-500',
  MENU: 'border-blue-100 bg-blue-50 text-blue-600',
  PERMISSION_GROUP: 'border-slate-200 bg-slate-50 text-slate-500',
  ACTION: 'border-violet-100 bg-violet-50 text-violet-600',
};

const titleOf = (node: PermissionTreeNode): ReactNode => {
  const type = node.nodeType ?? 'ACTION';
  const name =
    node.permissionName || node.permissionCode || '未命名权限';

  return (
    <div
      className={[
        'flex min-w-0 items-center gap-2 py-0.5',
        node.active === false ? 'text-slate-400' : 'text-slate-700',
      ].join(' ')}
      title={node.description}
    >
      <span className="truncate">{name}</span>
      <span
        className={[
          'shrink-0 rounded border px-1.5 py-0.5 text-[10px] leading-4',
          nodeTypeClass[type],
        ].join(' ')}
      >
        {nodeTypeLabel[type]}
      </span>
      {node.permissionCode && type === 'ACTION' && (
        <span className="truncate font-mono text-xs text-slate-400">
          {node.permissionCode}
        </span>
      )}
    </div>
  );
};

const isSelectable = (node?: PermissionTreeNode): boolean =>
  Boolean(
    node &&
      node.active !== false &&
      (node.nodeType === 'MENU' || node.nodeType === 'ACTION'),
  );

const buildTreeData = (
  node: PermissionTreeNode,
  path: number[],
): CapabilityDataNode => {
  const key = nodeKey(node, path);
  const selectable = isSelectable(node);
  const children = Array.isArray(node.childList)
    ? node.childList.map((child, index) =>
        buildTreeData(child, [...path, index]),
      )
    : [];

  return {
    key,
    title: titleOf(node),
    nodeType: node.nodeType,
    active: node.active,
    disabled: node.active === false,
    disableCheckbox: !selectable,
    selectable: false,
    ...(children.length ? { children } : {}),
  };
};

const buildIndex = (tree?: PermissionTreeNode): CapabilityIndex => {
  const nodes = new Map<number, PermissionTreeNode>();
  const parents = new Map<number, number>();
  const descendants = new Map<number, number[]>();
  const selectableKeys = new Set<number>();

  const visit = (
    node: PermissionTreeNode,
    path: number[],
    parentKey?: number,
  ): number[] => {
    const key = nodeKey(node, path);
    nodes.set(key, node);
    if (parentKey !== undefined) parents.set(key, parentKey);
    if (isSelectable(node)) selectableKeys.add(key);

    const childKeys = (node.childList ?? []).flatMap((child, index) =>
      visit(child, [...path, index], key),
    );
    descendants.set(key, childKeys);
    return [key, ...childKeys];
  };

  if (tree) visit(tree, [0]);
  return { nodes, parents, descendants, selectableKeys };
};

const normalizeKeys = (
  keys: Iterable<Key>,
  index: CapabilityIndex,
): Key[] => {
  const result = new Set<number>();

  for (const value of keys) {
    const key = Number(value);
    if (!Number.isFinite(key) || !index.selectableKeys.has(key)) {
      continue;
    }
    result.add(key);

    let parent = index.parents.get(key);
    while (parent !== undefined) {
      const parentNode = index.nodes.get(parent);
      if (parentNode?.nodeType === 'MENU') result.add(parent);
      parent = index.parents.get(parent);
    }
  }

  return Array.from(result);
};

export const collectCapabilityCheckedKeys = (
  tree?: PermissionTreeNode,
): Key[] => {
  const index = buildIndex(tree);
  const keys: Key[] = [];

  index.nodes.forEach((node, key) => {
    if (node.has && index.selectableKeys.has(key)) keys.push(key);
  });

  return normalizeKeys(keys, index);
};

export default function RoleCapabilityTree({
  tree,
  checkedKeys,
  loading = false,
  readOnly = false,
  onChange,
}: RoleCapabilityTreeProps) {
  const index = useMemo(() => buildIndex(tree), [tree]);
  const treeData = useMemo(
    () => (tree ? [buildTreeData(tree, [0])] : []),
    [tree],
  );
  const normalizedCheckedKeys = useMemo(
    () => normalizeKeys(checkedKeys, index),
    [checkedKeys, index],
  );

  if (!loading && treeData.length === 0) {
    return (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description="暂无可配置权限"
      />
    );
  }

  return (
    <div className="space-y-3">
      {!readOnly && (
        <Alert
          type="info"
          showIcon
          message="菜单权限与按钮权限独立"
          description="菜单只控制页面访问；勾选按钮会自动勾选所属菜单和父级目录。取消菜单时，会同时清除该菜单下的按钮权限。"
        />
      )}

      <div className="min-h-48 rounded-lg border border-slate-200 bg-slate-50/40 p-3">
        <Tree<CapabilityDataNode>
          checkable
          checkStrictly
          selectable={false}
          defaultExpandAll
          disabled={readOnly}
          checkedKeys={normalizedCheckedKeys}
          treeData={treeData}
          onCheck={(_, info) => {
            if (readOnly || !onChange) return;

            const key = Number(info.node.key);
            if (!Number.isFinite(key)) return;

            const next = new Set<number>(
              normalizedCheckedKeys.map((value) => Number(value)),
            );
            const node = index.nodes.get(key);

            if (info.checked) {
              if (index.selectableKeys.has(key)) next.add(key);

              let parent = index.parents.get(key);
              while (parent !== undefined) {
                if (index.nodes.get(parent)?.nodeType === 'MENU') {
                  next.add(parent);
                }
                parent = index.parents.get(parent);
              }
            } else {
              next.delete(key);

              if (node?.nodeType === 'MENU') {
                for (const descendant of
                  index.descendants.get(key) ?? []) {
                  next.delete(descendant);
                }
              }
            }

            onChange(normalizeKeys(next, index));
          }}
        />
      </div>
    </div>
  );
}

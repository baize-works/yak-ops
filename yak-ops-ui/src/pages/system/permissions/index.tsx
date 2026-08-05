import {
  CheckCircleOutlined,
  DeleteOutlined,
  FileProtectOutlined,
  ImportOutlined,
  MinusSquareOutlined,
  PlusSquareOutlined,
  ReloadOutlined,
  SearchOutlined,
  StopOutlined,
} from "@ant-design/icons";
import {
  Avatar,
  Button,
  Descriptions,
  Empty,
  Input,
  Modal,
  Space,
  Spin,
  Tag,
  Tooltip,
  Tree,
  Typography,
  message,
} from "antd";
import type { DataNode } from "antd/es/tree";
import type { Key, ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { PermissionGuard } from "@/components/security";
import {
  deletePermission,
  getPermissionTree,
  type PermissionVO,
} from "@/services/security/permissions";

import ImportModal from "./ImportModal";
import {
  collectPermissionIds,
  filterPermissionTree,
  findPermissionById,
  findPermissionPath,
  getDirectChildren,
  getPermissionForest,
  getPermissionTreeStats,
  type PermissionScope,
} from "./tree";

const errorText = (error: unknown, fallback: string): string =>
  error instanceof Error && error.message ? error.message : fallback;

const permissionRequirement = (action: string): string =>
  `security:permission:${action}`;

const permissionName = (permission?: PermissionVO): string =>
  permission?.permissionName || permission?.permissionCode || "未命名权限";

const permissionCode = (permission?: PermissionVO): string =>
  permission?.permissionCode || "未配置权限编码";

const toTreeData = (
  permissions: PermissionVO[],
  path = new Set<string>()
): DataNode[] =>
  permissions.flatMap((permission) => {
    const key = String(permission.id);
    if (path.has(key)) return [];

    const nextPath = new Set(path);
    nextPath.add(key);

    return [
      {
        key: permission.id,
        title: (
          <div className="min-w-0 py-0.5">
            <div className="flex min-w-0 items-center gap-2">
              <span
                className={[
                  "truncate text-sm",
                  permission.active === false
                    ? "text-slate-400"
                    : "font-medium text-slate-700",
                ].join(" ")}
              >
                {permissionName(permission)}
              </span>

              {permission.active === false && (
                <Tag className="!m-0 !border-slate-200 !bg-slate-100 !text-[10px] !leading-4 !text-slate-500">
                  停用
                </Tag>
              )}
            </div>

            <div className="mt-0.5 truncate text-xs text-slate-400">
              {permissionCode(permission)}
            </div>
          </div>
        ),
        children: toTreeData(getDirectChildren(permission), nextPath),
      },
    ];
  });

const scopeLabel = (label: string, count: number): ReactNode => (
  <span>
    {label}
    <span className="ml-1 text-xs opacity-60">{count}</span>
  </span>
);

const deleteDisabledReason = (
  permission?: PermissionVO
): string | undefined => {
  if (!permission) return "请先选择权限";

  if (permission.declared === true) {
    return "声明式权限由后端注册同步，不能在此手工删除";
  }

  if (permission.leaf === false || getDirectChildren(permission).length > 0) {
    return "该权限包含子节点，请先处理子权限";
  }

  return undefined;
};

export default function PermissionsPage() {
  const requestSequenceRef = useRef(0);

  const [root, setRoot] = useState<PermissionVO>();
  const [selectedId, setSelectedId] = useState<number>();
  const [keyword, setKeyword] = useState("");
  const [scope, setScope] = useState<PermissionScope>("all");
  const [expandedKeys, setExpandedKeys] = useState<Key[]>([]);
  const [loading, setLoading] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const loadTree = useCallback(async () => {
    const sequence = ++requestSequenceRef.current;
    setLoading(true);

    try {
      const data = await getPermissionTree();
      if (sequence !== requestSequenceRef.current) return;
      setRoot(data);
    } catch (error) {
      if (sequence !== requestSequenceRef.current) return;
      setRoot(undefined);
      
    } finally {
      if (sequence === requestSequenceRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void loadTree();
  }, [loadTree]);

  const permissionForest = useMemo(() => getPermissionForest(root), [root]);

  const stats = useMemo(
    () => getPermissionTreeStats(permissionForest),
    [permissionForest]
  );

  const visiblePermissions = useMemo(
    () => filterPermissionTree(permissionForest, keyword, scope),
    [keyword, permissionForest, scope]
  );

  const treeData = useMemo(
    () => toTreeData(visiblePermissions),
    [visiblePermissions]
  );

  const selectedPermission = useMemo(
    () => findPermissionById(permissionForest, selectedId),
    [permissionForest, selectedId]
  );

  const selectedPath = useMemo(
    () => findPermissionPath(permissionForest, selectedId),
    [permissionForest, selectedId]
  );

  const selectedChildren = useMemo(
    () => getDirectChildren(selectedPermission),
    [selectedPermission]
  );

  useEffect(() => {
    if (loading) return;

    const visibleSelected = findPermissionById(visiblePermissions, selectedId);

    if (visibleSelected) return;
    setSelectedId(visiblePermissions[0]?.id);
  }, [loading, selectedId, visiblePermissions]);

  useEffect(() => {
    if (keyword.trim() || scope !== "all") {
      setExpandedKeys(collectPermissionIds(visiblePermissions));
      return;
    }

    setExpandedKeys(permissionForest.map((permission) => permission.id));
  }, [keyword, permissionForest, scope, visiblePermissions]);

  const scopeOptions: Array<{
    value: PermissionScope;
    label: ReactNode;
  }> = [
    {
      value: "all",
      label: scopeLabel("全部", stats.total),
    },
    {
      value: "active",
      label: scopeLabel("启用", stats.active),
    },
    {
      value: "inactive",
      label: scopeLabel("停用", stats.inactive),
    },
    {
      value: "declared",
      label: scopeLabel("声明式", stats.declared),
    },
    {
      value: "manual",
      label: scopeLabel("手工导入", stats.manual),
    },
  ];

  const removePermission = useCallback(
    (permission: PermissionVO) => {
      const disabledReason = deleteDisabledReason(permission);
      if (disabledReason) {
        message.warning(disabledReason);
        return;
      }

      Modal.confirm({
        title: "删除权限",
        width: 480,
        centered: true,
        okText: "删除",
        cancelText: "取消",
        okButtonProps: { danger: true },
        content: (
          <div className="space-y-3">
            <div>
              确定删除权限
              <span className="mx-1 font-medium text-slate-900">
                {permissionName(permission)}
              </span>
              吗？
            </div>

            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              删除后，该权限与角色之间的授权关系也会被解除，此操作无法撤销。
            </div>
          </div>
        ),
        onOk: async () => {
          try {
            await deletePermission(permission.id);
            message.success("权限已删除");
            setSelectedId(undefined);
            await loadTree();
          } catch (error) {
            
            throw error;
          }
        },
      });
    },
    [loadTree]
  );

  const disabledReason = deleteDisabledReason(selectedPermission);

  const enabled = selectedPermission?.active !== false;

  return (
    <section
      className="box-border flex min-h-[640px] flex-col overflow-hidden bg-slate-50/50 p-6"
      style={{ height: "calc(100vh - 64px)" }}
      aria-labelledby="permission-title"
    >
      <h1
        id="permission-title"
        className="mb-4 shrink-0 font-semibold"
        style={{ fontSize: 18, color: "#282828" }}
      >
        权限管理
      </h1>

      <div className="mb-4 flex shrink-0 flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-2 overflow-x-auto pb-1 lg:pb-0">
          {scopeOptions.map((option) => {
            const active = scope === option.value;

            return (
              <button
                key={option.value}
                type="button"
                className={[
                  "shrink-0 rounded px-3 py-1 text-sm font-medium leading-5 transition-colors",
                  active
                    ? "bg-[#f2f2f4] text-[#FE2C55]"
                    : "bg-[#f2f4f7] text-[#667085] hover:bg-[#e8eaef]",
                ].join(" ")}
                onClick={() => setScope(option.value)}
              >
                {option.label}
              </button>
            );
          })}
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Input
            allowClear
            value={keyword}
            prefix={<SearchOutlined className="text-slate-400" />}
            placeholder="搜索权限名称、编码、描述或 ID"
            className="w-[360px] max-w-full"
            onChange={(event) => setKeyword(event.target.value)}
          />

          <Tooltip title="刷新权限树">
            <Button
              icon={<ReloadOutlined />}
              loading={loading}
              onClick={() => void loadTree()}
            />
          </Tooltip>

          <PermissionGuard
            mode="one"
            permission={permissionRequirement("import")}
          >
            <Button
              type="primary"
              danger
              onClick={() => setImportOpen(true)}
            >
              导入权限
            </Button>
          </PermissionGuard>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 overflow-hidden rounded-lg border border-slate-200 bg-white lg:grid-cols-[390px_minmax(0,1fr)]">
        <aside className="flex min-h-0 flex-col border-b border-slate-200 lg:border-b-0 lg:border-r">
          <div className="flex h-14 shrink-0 items-center justify-between border-b border-slate-100 px-4">
            <div>
              <div className="font-medium text-slate-800">权限树</div>
              <div className="mt-0.5 text-xs text-slate-400">
                当前显示 {collectPermissionIds(visiblePermissions).length}{" "}
                个节点
              </div>
            </div>

            <Space size={2}>
              <Tooltip title="展开全部">
                <Button
                  type="text"
                  size="small"
                  icon={<PlusSquareOutlined />}
                  onClick={() =>
                    setExpandedKeys(collectPermissionIds(visiblePermissions))
                  }
                />
              </Tooltip>
              <Tooltip title="收起全部">
                <Button
                  type="text"
                  size="small"
                  icon={<MinusSquareOutlined />}
                  onClick={() => setExpandedKeys([])}
                />
              </Tooltip>
            </Space>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-2 py-3">
            <Spin spinning={loading}>
              {!loading && treeData.length === 0 ? (
                <Empty
                  className="mt-16"
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={
                    keyword.trim() || scope !== "all"
                      ? "没有匹配的权限"
                      : "暂无权限数据"
                  }
                />
              ) : (
                <Tree
                  blockNode
                  showLine={{ showLeafIcon: false }}
                  treeData={treeData}
                  selectedKeys={selectedId === undefined ? [] : [selectedId]}
                  expandedKeys={expandedKeys}
                  autoExpandParent={Boolean(keyword.trim() || scope !== "all")}
                  onExpand={(keys) => setExpandedKeys(keys)}
                  onSelect={(keys) => {
                    const value = Number(keys[0]);
                    if (Number.isFinite(value)) {
                      setSelectedId(value);
                    }
                  }}
                />
              )}
            </Spin>
          </div>
        </aside>

        <main className="min-h-0 overflow-y-auto">
          {selectedPermission ? (
            <div className="min-h-full">
              <div className="flex min-h-20 items-center justify-between gap-4 border-b border-slate-100 px-6 py-4">
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar
                    size={46}
                    icon={<FileProtectOutlined />}
                    className="shrink-0 !bg-slate-600"
                  />

                  <div className="min-w-0">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <Typography.Title
                        level={5}
                        className="!mb-0 !text-slate-800"
                      >
                        {permissionName(selectedPermission)}
                      </Typography.Title>

                      <Tag
                        icon={
                          enabled ? <CheckCircleOutlined /> : <StopOutlined />
                        }
                        style={{
                          marginInlineEnd: 0,
                          color: enabled ? "#3f6f9f" : "#8c8c8c",
                          backgroundColor: enabled ? "#f2f6fa" : "#fafafa",
                          borderColor: enabled ? "#c9d8e6" : "#d9d9d9",
                        }}
                      >
                        {enabled ? "已启用" : "已停用"}
                      </Tag>

                      <Tag>
                        {selectedPermission.declared === true
                          ? "声明式权限"
                          : "手工权限"}
                      </Tag>
                    </div>

                    <div className="mt-1 truncate font-mono text-xs text-slate-400">
                      {permissionCode(selectedPermission)}
                    </div>
                  </div>
                </div>

                <PermissionGuard
                  mode="one"
                  permission={permissionRequirement("delete")}
                >
                  <Tooltip title={disabledReason || "删除权限"}>
                    <span>
                      <Button
                        danger
                        type="primary"
                        icon={<DeleteOutlined />}
                        disabled={Boolean(disabledReason)}
                        onClick={() => removePermission(selectedPermission)}
                      >
                        删除
                      </Button>
                    </span>
                  </Tooltip>
                </PermissionGuard>
              </div>

              <div className="space-y-6 p-6">
                <div>
                  <div className="mb-2 text-sm font-medium text-slate-800">
                    权限路径
                  </div>
                  <div className="flex flex-wrap items-center gap-1 rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2 text-sm text-slate-600">
                    {selectedPath.map((permission, index) => (
                      <span
                        key={permission.id}
                        className="flex items-center gap-1"
                      >
                        {index > 0 && <span className="text-slate-300">/</span>}
                        <button
                          type="button"
                          className="rounded px-1 py-0.5 hover:bg-white hover:text-slate-900"
                          onClick={() => setSelectedId(permission.id)}
                        >
                          {permissionName(permission)}
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                <Descriptions
                  bordered
                  size="small"
                  column={{ xs: 1, sm: 2 }}
                  items={[
                    {
                      key: "id",
                      label: "权限 ID",
                      children: selectedPermission.id,
                    },
                    {
                      key: "parentId",
                      label: "父权限 ID",
                      children:
                        selectedPermission.parentId === undefined ||
                        selectedPermission.parentId === null ||
                        selectedPermission.parentId === 0
                          ? "根节点"
                          : selectedPermission.parentId,
                    },
                    {
                      key: "nodeType",
                      label: "节点类型",
                      children:
                        selectedPermission.leaf === false ||
                        selectedChildren.length > 0
                          ? "权限分组"
                          : "叶子权限",
                    },
                    {
                      key: "children",
                      label: "直属子权限",
                      children: `${selectedChildren.length} 个`,
                    },
                    {
                      key: "active",
                      label: "启用状态",
                      children:
                        selectedPermission.active === false ? "停用" : "启用",
                    },
                    {
                      key: "declared",
                      label: "数据来源",
                      children:
                        selectedPermission.declared === true
                          ? "后端声明同步"
                          : "手工导入",
                    },
                  ]}
                />

                <div>
                  <div className="mb-2 text-sm font-medium text-slate-800">
                    权限描述
                  </div>
                  <div className="min-h-20 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-600">
                    {selectedPermission.description || "暂无权限描述"}
                  </div>
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-800">
                      直属子权限
                    </span>
                    <span className="text-xs text-slate-400">
                      {selectedChildren.length} 个
                    </span>
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-white p-3">
                    {selectedChildren.length === 0 ? (
                      <span className="text-sm text-slate-400">
                        当前节点没有子权限
                      </span>
                    ) : (
                      <div className="grid grid-cols-1 gap-2 xl:grid-cols-2">
                        {selectedChildren.map((child) => (
                          <button
                            key={child.id}
                            type="button"
                            className="min-w-0 rounded-lg border border-slate-200 px-3 py-2 text-left transition-colors hover:border-slate-300 hover:bg-slate-50"
                            onClick={() => setSelectedId(child.id)}
                          >
                            <div className="truncate text-sm font-medium text-slate-700">
                              {permissionName(child)}
                            </div>
                            <div className="mt-1 truncate font-mono text-xs text-slate-400">
                              {permissionCode(child)}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {selectedPermission.declared === true && (
                  <div className="rounded-lg border border-blue-100 bg-blue-50/70 px-4 py-3 text-sm leading-6 text-blue-700">
                    该权限由后端声明式注册机制维护。后端同步时可能更新其状态或重新创建记录，因此页面不提供手工删除操作。
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex min-h-full items-center justify-center p-8">
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  keyword.trim() || scope !== "all"
                    ? "没有符合条件的权限"
                    : "请从左侧选择权限节点"
                }
              />
            </div>
          )}
        </main>
      </div>

      <ImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={() => void loadTree()}
      />
    </section>
  );
}

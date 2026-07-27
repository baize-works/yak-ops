import {
  ApartmentOutlined,
  ImportOutlined,
  MinusSquareOutlined,
  PlusSquareOutlined,
  ReloadOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import type { DataNode } from 'antd/es/tree';
import {
  Avatar,
  Button,
  Descriptions,
  Empty,
  Input,
  Space,
  Spin,
  Tag,
  Tooltip,
  Tree,
  Typography,
  message,
} from 'antd';
import type { Key, ReactNode } from 'react';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { PermissionGuard } from '@/components/security';
import {
  type DepartmentVO,
  getDepartmentTree,
} from '@/services/security/departments';

import ImportModal from './ImportModal';
import {
  collectDepartmentIds,
  filterDepartmentTree,
  findDepartmentById,
  findDepartmentPath,
  getDepartmentForest,
  getDepartmentTreeStats,
  getDirectChildren,
  type DepartmentScope,
} from './tree';

const errorText = (error: unknown, fallback: string): string =>
  error instanceof Error && error.message
    ? error.message
    : fallback;

const departmentRequirement = (action: string): string =>
  `security:department:${action}`;

const departmentName = (department?: DepartmentVO): string =>
  department?.deptName || '未命名部门';

const toTreeData = (
  departments: DepartmentVO[],
  path = new Set<string>(),
): DataNode[] =>
  departments.flatMap((department) => {
    const key = String(department.id);
    if (path.has(key)) return [];

    const nextPath = new Set(path);
    nextPath.add(key);
    const children = getDirectChildren(department);

    return [
      {
        key: department.id,
        title: (
          <div className="min-w-0 py-0.5">
            <div className="truncate text-sm font-medium text-slate-700">
              {departmentName(department)}
            </div>
            <div className="mt-0.5 truncate text-xs text-slate-400">
              {department.description ||
                (children.length > 0
                  ? `${children.length} 个直属部门`
                  : `ID ${department.id}`)}
            </div>
          </div>
        ),
        children: toTreeData(children, nextPath),
      },
    ];
  });

const scopeLabel = (
  label: string,
  count: number,
): ReactNode => (
  <span>
    {label}
    <span className="ml-1 text-xs opacity-60">{count}</span>
  </span>
);

export default function DepartmentsPage() {
  const requestSequenceRef = useRef(0);

  const [root, setRoot] = useState<DepartmentVO>();
  const [selectedId, setSelectedId] = useState<number>();
  const [keyword, setKeyword] = useState('');
  const [scope, setScope] =
    useState<DepartmentScope>('all');
  const [expandedKeys, setExpandedKeys] = useState<Key[]>([]);
  const [loading, setLoading] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const loadTree = useCallback(async () => {
    const sequence = ++requestSequenceRef.current;
    setLoading(true);

    try {
      const data = await getDepartmentTree();
      if (sequence !== requestSequenceRef.current) return;
      setRoot(data);
    } catch (error) {
      if (sequence !== requestSequenceRef.current) return;
      setRoot(undefined);
      message.error(errorText(error, '部门树加载失败'));
    } finally {
      if (sequence === requestSequenceRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void loadTree();
  }, [loadTree]);

  const departmentForest = useMemo(
    () => getDepartmentForest(root),
    [root],
  );

  const stats = useMemo(
    () => getDepartmentTreeStats(departmentForest),
    [departmentForest],
  );

  const visibleDepartments = useMemo(
    () =>
      filterDepartmentTree(
        departmentForest,
        keyword,
        scope,
      ),
    [departmentForest, keyword, scope],
  );

  const treeData = useMemo(
    () => toTreeData(visibleDepartments),
    [visibleDepartments],
  );

  const selectedDepartment = useMemo(
    () => findDepartmentById(departmentForest, selectedId),
    [departmentForest, selectedId],
  );

  const selectedPath = useMemo(
    () => findDepartmentPath(departmentForest, selectedId),
    [departmentForest, selectedId],
  );

  const selectedChildren = useMemo(
    () => getDirectChildren(selectedDepartment),
    [selectedDepartment],
  );

  const descendantCount = useMemo(
    () => collectDepartmentIds(selectedChildren).length,
    [selectedChildren],
  );

  useEffect(() => {
    if (loading) return;

    const visibleSelected = findDepartmentById(
      visibleDepartments,
      selectedId,
    );

    if (visibleSelected) return;
    setSelectedId(visibleDepartments[0]?.id);
  }, [loading, selectedId, visibleDepartments]);

  useEffect(() => {
    if (keyword.trim() || scope !== 'all') {
      setExpandedKeys(
        collectDepartmentIds(visibleDepartments),
      );
      return;
    }

    setExpandedKeys(
      departmentForest.map((department) => department.id),
    );
  }, [
    departmentForest,
    keyword,
    scope,
    visibleDepartments,
  ]);

  const scopeOptions: Array<{
    value: DepartmentScope;
    label: ReactNode;
  }> = [
    {
      value: 'all',
      label: scopeLabel('全部', stats.total),
    },
    {
      value: 'group',
      label: scopeLabel('部门分组', stats.groups),
    },
    {
      value: 'leaf',
      label: scopeLabel('末级部门', stats.leaves),
    },
  ];

  return (
    <section
      className="box-border flex min-h-[640px] flex-col overflow-hidden bg-slate-50/50 p-6"
      style={{ height: 'calc(100vh - 64px)' }}
      aria-labelledby="department-title"
    >
      <h1
        id="department-title"
        className="mb-4 shrink-0 font-semibold"
        style={{ fontSize: 18, color: '#282828' }}
      >
        部门管理
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
                  'shrink-0 rounded px-3 py-1 text-sm font-medium leading-5 transition-colors',
                  active
                    ? 'bg-[#f2f2f4] text-[#FE2C55]'
                    : 'bg-[#f2f4f7] text-[#667085] hover:bg-[#e8eaef]',
                ].join(' ')}
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
            placeholder="搜索部门名称、描述或 ID"
            className="w-[360px] max-w-full"
            onChange={(event) => setKeyword(event.target.value)}
          />

          <Tooltip title="刷新部门树">
            <Button
              icon={<ReloadOutlined />}
              loading={loading}
              onClick={() => void loadTree()}
            />
          </Tooltip>

          <PermissionGuard
            mode="one"
            permission={departmentRequirement('import')}
          >
            <Button
              type="primary"
              icon={<ImportOutlined />}
              onClick={() => setImportOpen(true)}
            >
              导入部门
            </Button>
          </PermissionGuard>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 overflow-hidden rounded-lg border border-slate-200 bg-white lg:grid-cols-[390px_minmax(0,1fr)]">
        <aside className="flex min-h-0 flex-col border-b border-slate-200 lg:border-b-0 lg:border-r">
          <div className="flex h-14 shrink-0 items-center justify-between border-b border-slate-100 px-4">
            <div>
              <div className="font-medium text-slate-800">
                部门树
              </div>
              <div className="mt-0.5 text-xs text-slate-400">
                当前显示{' '}
                {collectDepartmentIds(visibleDepartments).length}{' '}
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
                    setExpandedKeys(
                      collectDepartmentIds(visibleDepartments),
                    )
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
                    keyword.trim() || scope !== 'all'
                      ? '没有匹配的部门'
                      : '暂无部门数据'
                  }
                />
              ) : (
                <Tree
                  blockNode
                  showLine={{ showLeafIcon: false }}
                  treeData={treeData}
                  selectedKeys={
                    selectedId === undefined ? [] : [selectedId]
                  }
                  expandedKeys={expandedKeys}
                  autoExpandParent={Boolean(
                    keyword.trim() || scope !== 'all',
                  )}
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
          {selectedDepartment ? (
            <div className="min-h-full">
              <div className="flex min-h-20 items-center gap-3 border-b border-slate-100 px-6 py-4">
                <Avatar
                  size={46}
                  icon={<ApartmentOutlined />}
                  className="shrink-0 !bg-slate-600"
                />

                <div className="min-w-0">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <Typography.Title
                      level={5}
                      className="!mb-0 !text-slate-800"
                    >
                      {departmentName(selectedDepartment)}
                    </Typography.Title>

                    <Tag>
                      {selectedDepartment.leaf === false ||
                      selectedChildren.length > 0
                        ? '部门分组'
                        : '末级部门'}
                    </Tag>
                  </div>

                  <div className="mt-1 text-xs text-slate-400">
                    部门 ID：{selectedDepartment.id}
                  </div>
                </div>
              </div>

              <div className="space-y-6 p-6">
                <div>
                  <div className="mb-2 text-sm font-medium text-slate-800">
                    部门路径
                  </div>
                  <div className="flex flex-wrap items-center gap-1 rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2 text-sm text-slate-600">
                    {selectedPath.map((department, index) => (
                      <span
                        key={department.id}
                        className="flex items-center gap-1"
                      >
                        {index > 0 && (
                          <span className="text-slate-300">/</span>
                        )}
                        <button
                          type="button"
                          className="rounded px-1 py-0.5 hover:bg-white hover:text-slate-900"
                          onClick={() =>
                            setSelectedId(department.id)
                          }
                        >
                          {departmentName(department)}
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
                      key: 'id',
                      label: '部门 ID',
                      children: selectedDepartment.id,
                    },
                    {
                      key: 'parentId',
                      label: '父部门 ID',
                      children:
                        selectedDepartment.parentId === undefined ||
                        selectedDepartment.parentId === null ||
                        selectedDepartment.parentId === 0
                          ? '根部门'
                          : selectedDepartment.parentId,
                    },
                    {
                      key: 'nodeType',
                      label: '节点类型',
                      children:
                        selectedDepartment.leaf === false ||
                        selectedChildren.length > 0
                          ? '部门分组'
                          : '末级部门',
                    },
                    {
                      key: 'children',
                      label: '直属子部门',
                      children: `${selectedChildren.length} 个`,
                    },
                    {
                      key: 'descendants',
                      label: '全部下级部门',
                      children: `${descendantCount} 个`,
                    },
                  ]}
                />

                <div>
                  <div className="mb-2 text-sm font-medium text-slate-800">
                    部门描述
                  </div>
                  <div className="min-h-20 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-600">
                    {selectedDepartment.description ||
                      '暂无部门描述'}
                  </div>
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-800">
                      直属子部门
                    </span>
                    <span className="text-xs text-slate-400">
                      {selectedChildren.length} 个
                    </span>
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-white p-3">
                    {selectedChildren.length === 0 ? (
                      <span className="text-sm text-slate-400">
                        当前节点没有子部门
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
                              {departmentName(child)}
                            </div>
                            <div className="mt-1 truncate text-xs text-slate-400">
                              {child.description || `ID ${child.id}`}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-lg border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm leading-6 text-slate-600">
                  当前后端只开放部门树查询和批量导入接口，因此本页暂不提供单个部门的新增、编辑和删除操作。
                </div>
              </div>
            </div>
          ) : (
            <div className="flex min-h-full items-center justify-center p-8">
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  keyword.trim() || scope !== 'all'
                    ? '没有符合条件的部门'
                    : '请从左侧选择部门节点'
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

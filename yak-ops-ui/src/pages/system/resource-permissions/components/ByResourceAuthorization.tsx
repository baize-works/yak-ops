import {
  ArrowLeftOutlined,
  ArrowRightOutlined,
  DatabaseOutlined,
  ReloadOutlined,
  SearchOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import {
  Avatar,
  Button,
  Empty,
  Input,
  Pagination,
  Segmented,
  Space,
  Spin,
  Tag,
  Typography,
  message,
} from 'antd';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { PermissionGuard } from '@/components/security';
import {
  type ResourceControlLevel,
  type ResourcePermissionResourceSummary,
  type ResourcePermissionUserOption,
  type ResourceShowLevel,
  assignUsersToResource,
  listUsersForResource,
  pageResourcePermissionResources,
} from '@/services/security/resourcePermissions';

import AuthorizationChecklist, {
  type AuthorizationChecklistItem,
} from './AuthorizationChecklist';

interface ByResourceAuthorizationProps {
  viewControlEnabled: boolean;
  onAuthorizationChanged?: () => void;
}

interface PaginationState {
  current: number;
  pageSize: number;
  total: number;
}

const DEFAULT_PAGINATION: PaginationState = {
  current: 1,
  pageSize: 10,
  total: 0,
};

const errorText = (error: unknown, fallback: string): string =>
  error instanceof Error && error.message ? error.message : fallback;

const permission = (action: string): string =>
  `security:resource-permission:${action}`;

const rowId = (
  row: ResourcePermissionResourceSummary,
  level: ResourceShowLevel,
): number => {
  if (level === 1) return row.projectId;
  if (level === 2) return Number(row.resourceTypeId);
  return Number(row.resourceId);
};

const rowName = (
  row: ResourcePermissionResourceSummary,
  level: ResourceShowLevel,
): string => {
  if (level === 1) return row.projectName || `项目 ${row.projectId}`;
  if (level === 2) {
    return row.resourceTypeName || `资源类型 ${row.resourceTypeId}`;
  }
  return row.resourceName || `资源 ${row.resourceId}`;
};

export default function ByResourceAuthorization({
  viewControlEnabled,
  onAuthorizationChanged,
}: ByResourceAuthorizationProps) {
  const pageRequestRef = useRef(0);
  const userRequestRef = useRef(0);

  const [showLevel, setShowLevel] = useState<ResourceShowLevel>(1);
  const [project, setProject] = useState<{ id: number; name: string }>();
  const [resourceType, setResourceType] =
    useState<{ id: number; name: string }>();
  const [rows, setRows] =
    useState<ResourcePermissionResourceSummary[]>([]);
  const [selectedId, setSelectedId] = useState<number>();
  const [pagination, setPagination] =
    useState<PaginationState>(DEFAULT_PAGINATION);
  const [keyword, setKeyword] = useState('');
  const [submittedKeyword, setSubmittedKeyword] = useState('');
  const [pageLoading, setPageLoading] = useState(false);

  const [controlLevel, setControlLevel] =
    useState<ResourceControlLevel>(2);
  const [users, setUsers] =
    useState<ResourcePermissionUserOption[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [partialUserIds, setPartialUserIds] = useState<number[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!viewControlEnabled && controlLevel === 1) {
      setControlLevel(2);
    }
  }, [controlLevel, viewControlEnabled]);

  const selectedRow = useMemo(
    () => rows.find((row) => rowId(row, showLevel) === selectedId),
    [rows, selectedId, showLevel],
  );

  const loadPage = useCallback(async () => {
    const sequence = ++pageRequestRef.current;
    setPageLoading(true);

    try {
      const result = await pageResourcePermissionResources({
        pageNum: pagination.current,
        pageSize: pagination.pageSize,
        showLevel,
        projectId: project?.id,
        resourceTypeId: resourceType?.id,
        name: submittedKeyword || undefined,
      });
      if (sequence !== pageRequestRef.current) return;

      setRows(result.records ?? []);
      setPagination((current) => ({
        ...current,
        total: result.total ?? 0,
      }));
    } catch (error) {
      if (sequence !== pageRequestRef.current) return;
      setRows([]);
      setPagination((current) => ({ ...current, total: 0 }));
      
    } finally {
      if (sequence === pageRequestRef.current) {
        setPageLoading(false);
      }
    }
  }, [
    pagination.current,
    pagination.pageSize,
    project?.id,
    resourceType?.id,
    showLevel,
    submittedKeyword,
  ]);

  useEffect(() => {
    void loadPage();
  }, [loadPage]);

  useEffect(() => {
    if (rows.length === 0) {
      setSelectedId(undefined);
      return;
    }

    if (!rows.some((row) => rowId(row, showLevel) === selectedId)) {
      setSelectedId(rowId(rows[0], showLevel));
    }
  }, [rows, selectedId, showLevel]);

  const loadUsers = useCallback(async () => {
    if (!selectedRow) {
      setUsers([]);
      setSelectedUserIds([]);
      setPartialUserIds([]);
      return;
    }

    const sequence = ++userRequestRef.current;
    setUsersLoading(true);

    try {
      const result = await listUsersForResource({
        projectId: selectedRow.projectId,
        resourceTypeId:
          showLevel >= 2
            ? Number(selectedRow.resourceTypeId)
            : undefined,
        resourceId:
          showLevel === 3
            ? Number(selectedRow.resourceId)
            : undefined,
        controlLevel,
        batch: false,
      });
      if (sequence !== userRequestRef.current) return;

      setUsers(result);
      setSelectedUserIds(
        result
          .filter((user) => user.hasLevel === 2)
          .map((user) => user.userId),
      );
      setPartialUserIds(
        result
          .filter((user) => user.hasLevel === 1)
          .map((user) => user.userId),
      );
    } catch (error) {
      if (sequence !== userRequestRef.current) return;
      setUsers([]);
      setSelectedUserIds([]);
      setPartialUserIds([]);
      
    } finally {
      if (sequence === userRequestRef.current) {
        setUsersLoading(false);
      }
    }
  }, [controlLevel, selectedRow, showLevel]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const userItems = useMemo<AuthorizationChecklistItem[]>(
    () =>
      users.map((user) => ({
        id: user.userId,
        label: user.realName || user.userName || `用户 ${user.userId}`,
        description:
          user.realName && user.userName
            ? `用户名：${user.userName}`
            : `用户 ID：${user.userId}`,
        hasLevel: user.hasLevel,
      })),
    [users],
  );

  const enterNextLevel = (row: ResourcePermissionResourceSummary) => {
    if (showLevel === 1) {
      setProject({ id: row.projectId, name: rowName(row, 1) });
      setResourceType(undefined);
      setShowLevel(2);
    } else if (showLevel === 2 && row.resourceTypeId != null) {
      setResourceType({
        id: Number(row.resourceTypeId),
        name: rowName(row, 2),
      });
      setShowLevel(3);
    }

    setKeyword('');
    setSubmittedKeyword('');
    setPagination((current) => ({ ...current, current: 1 }));
    setSelectedId(undefined);
  };

  const goBack = () => {
    if (showLevel === 3) {
      setResourceType(undefined);
      setShowLevel(2);
    } else if (showLevel === 2) {
      setProject(undefined);
      setShowLevel(1);
    }

    setKeyword('');
    setSubmittedKeyword('');
    setPagination((current) => ({ ...current, current: 1 }));
    setSelectedId(undefined);
  };

  const save = async () => {
    if (!selectedRow || saving) return;
    setSaving(true);

    try {
      await assignUsersToResource({
        projectId: selectedRow.projectId,
        resourceTypeId:
          showLevel >= 2
            ? Number(selectedRow.resourceTypeId)
            : undefined,
        resourceId:
          showLevel === 3
            ? Number(selectedRow.resourceId)
            : undefined,
        userIdList: selectedUserIds,
        excludeUserIdList: partialUserIds,
        controlLevel,
      });
      message.success(
        controlLevel === 2 ? '管理用户已保存' : '查看用户已保存',
      );
      await Promise.all([loadUsers(), loadPage()]);
      onAuthorizationChanged?.();
    } catch (error) {
      
    } finally {
      setSaving(false);
    }
  };

  const levelTitle =
    showLevel === 1
      ? '项目列表'
      : showLevel === 2
        ? `${project?.name ?? '-'} / 资源类型`
        : `${project?.name ?? '-'} / ${resourceType?.name ?? '-'} / 资源`;

  return (
    <div className="grid min-h-0 flex-1 overflow-hidden rounded-lg border border-slate-200 bg-white lg:grid-cols-[430px_minmax(0,1fr)]">
      <aside className="flex min-h-0 flex-col border-b border-slate-200 lg:border-b-0 lg:border-r">
        <div className="shrink-0 border-b border-slate-100 p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="truncate font-medium text-slate-800">
                {levelTitle}
              </div>
              <div className="mt-0.5 text-xs text-slate-400">
                共 {pagination.total} 项
              </div>
            </div>
            <Space size={4}>
              {showLevel > 1 && (
                <Button
                  type="text"
                  icon={<ArrowLeftOutlined />}
                  onClick={goBack}
                />
              )}
              <Button
                type="text"
                icon={<ReloadOutlined />}
                loading={pageLoading}
                onClick={() => void loadPage()}
              />
            </Space>
          </div>

          <Input
            allowClear
            value={keyword}
            prefix={<SearchOutlined className="text-slate-400" />}
            placeholder={
              showLevel === 1
                ? '搜索项目'
                : showLevel === 2
                  ? '搜索资源类型'
                  : '搜索资源名称'
            }
            onChange={(event) => {
              setKeyword(event.target.value);
              if (!event.target.value) {
                setSubmittedKeyword('');
                setPagination((current) => ({
                  ...current,
                  current: 1,
                }));
              }
            }}
            onPressEnter={() => {
              setSubmittedKeyword(keyword.trim());
              setPagination((current) => ({
                ...current,
                current: 1,
              }));
            }}
          />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <Spin spinning={pageLoading}>
            {!pageLoading && rows.length === 0 ? (
              <Empty
                className="my-16"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="当前层级暂无资源"
              />
            ) : (
              <div className="divide-y divide-slate-100">
                {rows.map((row) => {
                  const id = rowId(row, showLevel);
                  const active = selectedId === id;
                  const adminCount = row.adminUserCnt ?? 0;
                  const viewCount = row.viewUserCnt ?? 0;

                  return (
                    <div
                      key={`${showLevel}-${id}`}
                      className={[
                        'flex items-center gap-3 px-4 py-3 transition-colors',
                        active
                          ? 'bg-rose-50/70'
                          : 'hover:bg-slate-50',
                      ].join(' ')}
                    >
                      <button
                        type="button"
                        className="flex min-w-0 flex-1 items-center gap-3 text-left"
                        onClick={() => setSelectedId(id)}
                      >
                        <Avatar
                          icon={<DatabaseOutlined />}
                          className={
                            active ? '!bg-[#FE2C55]' : '!bg-slate-500'
                          }
                        />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium text-slate-700">
                            {rowName(row, showLevel)}
                          </div>
                          <div className="mt-0.5 truncate text-xs text-slate-400">
                            {showLevel === 1 &&
                              (row.projectCode || `项目 ID ${row.projectId}`)}
                            {showLevel === 2 &&
                              `资源类型 ID ${row.resourceTypeId}`}
                            {showLevel === 3 &&
                              `资源 ID ${row.resourceId}`}
                          </div>
                          <Space size={4} className="mt-1" wrap>
                            <Tag className="!mr-0">管理 {adminCount}</Tag>
                            {viewControlEnabled && (
                              <Tag className="!mr-0">查看 {viewCount}</Tag>
                            )}
                          </Space>
                        </div>
                      </button>

                      {showLevel < 3 && (
                        <Button
                          type="text"
                          size="small"
                          icon={<ArrowRightOutlined />}
                          onClick={() => enterNextLevel(row)}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Spin>
        </div>

        <div className="shrink-0 border-t border-slate-100 px-3 py-3">
          <Pagination
            size="small"
            current={pagination.current}
            pageSize={pagination.pageSize}
            total={pagination.total}
            showSizeChanger
            pageSizeOptions={[10, 20, 50]}
            onChange={(current, pageSize) =>
              setPagination((previous) => ({
                ...previous,
                current:
                  pageSize !== previous.pageSize ? 1 : current,
                pageSize,
              }))
            }
          />
        </div>
      </aside>

      <main className="flex min-h-0 flex-col overflow-hidden">
        {selectedRow ? (
          <>
            <div className="flex shrink-0 flex-col gap-4 border-b border-slate-100 px-6 py-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <Avatar
                  size={44}
                  icon={<TeamOutlined />}
                  className="!bg-slate-600"
                />
                <div className="min-w-0">
                  <Typography.Title level={5} className="!mb-0">
                    为 {rowName(selectedRow, showLevel)} 分配用户
                  </Typography.Title>
                  <div className="mt-1 text-xs text-slate-400">
                    {showLevel === 1 && '项目范围内的全部资源'}
                    {showLevel === 2 &&
                      `${project?.name ?? '-'} / 当前资源类型全部资源`}
                    {showLevel === 3 &&
                      `${project?.name ?? '-'} / ${resourceType?.name ?? '-'}`}
                  </div>
                </div>
              </div>

              <Space wrap>
                <Segmented<ResourceControlLevel>
                  value={controlLevel}
                  options={[
                    { label: '管理权限', value: 2 },
                    ...(viewControlEnabled
                      ? [{ label: '查看权限', value: 1 as const }]
                      : []),
                  ]}
                  onChange={setControlLevel}
                />
                <PermissionGuard
                  mode="one"
                  permission={permission('assign')}
                >
                  <Button
                    type="primary"
                    loading={saving}
                    disabled={usersLoading}
                    onClick={() => void save()}
                  >
                    保存授权
                  </Button>
                </PermissionGuard>
              </Space>
            </div>

            <div className="flex min-h-0 flex-1 flex-col p-6">
              <div className="mb-4 flex shrink-0 flex-wrap items-center gap-2">
                <Tag color={controlLevel === 2 ? 'magenta' : 'blue'}>
                  {controlLevel === 2 ? '管理权限' : '查看权限'}
                </Tag>
                {partialUserIds.length > 0 && (
                  <span className="text-xs text-amber-600">
                    部分授权用户会保留其现有下级授权
                  </span>
                )}
              </div>

              <AuthorizationChecklist
                items={userItems}
                selectedIds={selectedUserIds}
                partialIds={partialUserIds}
                loading={usersLoading}
                disabled={saving}
                searchPlaceholder="搜索用户名或真实姓名"
                emptyText="暂无可授权用户"
                onChange={(nextSelected, nextPartial) => {
                  setSelectedUserIds(nextSelected);
                  setPartialUserIds(nextPartial);
                }}
              />
            </div>
          </>
        ) : (
          <div className="flex min-h-full items-center justify-center p-8">
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="请从左侧选择项目、资源类型或资源"
            />
          </div>
        )}
      </main>
    </div>
  );
}

import {
  ArrowLeftOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  SearchOutlined,
  UserOutlined,
} from '@ant-design/icons';
import {
  Avatar,
  Button,
  Empty,
  Input,
  Pagination,
  Segmented,
  Select,
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
  type ResourcePermissionNode,
  type ResourcePermissionUserSummary,
  type ResourceShowLevel,
  assignResourcesToUser,
  listResourcesForUser,
  pageResourcePermissionUsers,
} from '@/services/security/resourcePermissions';

import AuthorizationChecklist, {
  type AuthorizationChecklistItem,
} from './AuthorizationChecklist';

interface ByUserAuthorizationProps {
  viewControlEnabled: boolean;
  onAuthorizationChanged?: () => void;
}

interface PaginationState {
  current: number;
  pageSize: number;
  total: number;
}

type UserSearchField = 'userName' | 'realName' | 'deptName';

const DEFAULT_PAGINATION: PaginationState = {
  current: 1,
  pageSize: 10,
  total: 0,
};

const errorText = (error: unknown, fallback: string): string =>
  error instanceof Error && error.message ? error.message : fallback;

const displayName = (user?: ResourcePermissionUserSummary): string =>
  user?.realName || user?.userName || '未命名用户';

const permission = (action: string): string =>
  `security:resource-permission:${action}`;

export default function ByUserAuthorization({
  viewControlEnabled,
  onAuthorizationChanged,
}: ByUserAuthorizationProps) {
  const userRequestRef = useRef(0);
  const dataRequestRef = useRef(0);

  const [users, setUsers] = useState<ResourcePermissionUserSummary[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number>();
  const [pagination, setPagination] =
    useState<PaginationState>(DEFAULT_PAGINATION);
  const [searchField, setSearchField] =
    useState<UserSearchField>('userName');
  const [keyword, setKeyword] = useState('');
  const [submittedKeyword, setSubmittedKeyword] = useState('');
  const [usersLoading, setUsersLoading] = useState(false);

  const [controlLevel, setControlLevel] =
    useState<ResourceControlLevel>(2);
  const [showLevel, setShowLevel] = useState<ResourceShowLevel>(1);
  const [project, setProject] = useState<{ id: number; name: string }>();
  const [resourceType, setResourceType] =
    useState<{ id: number; name: string }>();
  const [nodes, setNodes] = useState<ResourcePermissionNode[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [partialIds, setPartialIds] = useState<number[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const selectedUser = useMemo(
    () => users.find((user) => user.userId === selectedUserId),
    [selectedUserId, users],
  );

  useEffect(() => {
    if (!viewControlEnabled && controlLevel === 1) {
      setControlLevel(2);
    }
  }, [controlLevel, viewControlEnabled]);

  const loadUsers = useCallback(async () => {
    const sequence = ++userRequestRef.current;
    setUsersLoading(true);

    const search: Record<string, string | undefined> = {};
    if (submittedKeyword) search[searchField] = submittedKeyword;

    try {
      const result = await pageResourcePermissionUsers({
        pageNum: pagination.current,
        pageSize: pagination.pageSize,
        userName: search.userName,
        realName: search.realName,
        deptName: search.deptName,
      });
      if (sequence !== userRequestRef.current) return;

      setUsers(result.records ?? []);
      setPagination((current) => ({
        ...current,
        total: result.total ?? 0,
      }));
    } catch (error) {
      if (sequence !== userRequestRef.current) return;
      setUsers([]);
      setPagination((current) => ({ ...current, total: 0 }));
      
    } finally {
      if (sequence === userRequestRef.current) {
        setUsersLoading(false);
      }
    }
  }, [
    pagination.current,
    pagination.pageSize,
    searchField,
    submittedKeyword,
  ]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    if (users.length === 0) {
      setSelectedUserId(undefined);
      return;
    }

    if (!users.some((user) => user.userId === selectedUserId)) {
      setSelectedUserId(users[0].userId);
    }
  }, [selectedUserId, users]);

  const loadPermissionData = useCallback(async () => {
    if (selectedUserId === undefined) {
      setNodes([]);
      setSelectedIds([]);
      setPartialIds([]);
      return;
    }

    const sequence = ++dataRequestRef.current;
    setDataLoading(true);

    try {
      const result = await listResourcesForUser({
        userId: selectedUserId,
        projectId: project?.id,
        resourceTypeId: resourceType?.id,
        showLevel,
        controlLevel,
        batch: false,
      });
      if (sequence !== dataRequestRef.current) return;

      setNodes(result);
      setSelectedIds(
        result
          .filter((node) => node.hasLevel === 2)
          .map((node) => node.id),
      );
      setPartialIds(
        result
          .filter((node) => node.hasLevel === 1)
          .map((node) => node.id),
      );
    } catch (error) {
      if (sequence !== dataRequestRef.current) return;
      setNodes([]);
      setSelectedIds([]);
      setPartialIds([]);
      
    } finally {
      if (sequence === dataRequestRef.current) {
        setDataLoading(false);
      }
    }
  }, [
    controlLevel,
    project?.id,
    resourceType?.id,
    selectedUserId,
    showLevel,
  ]);

  useEffect(() => {
    void loadPermissionData();
  }, [loadPermissionData]);

  const resetHierarchy = useCallback(() => {
    setShowLevel(1);
    setProject(undefined);
    setResourceType(undefined);
  }, []);

  useEffect(() => {
    resetHierarchy();
  }, [resetHierarchy, selectedUserId]);

  const checklistItems = useMemo<AuthorizationChecklistItem[]>(
    () =>
      nodes.map((node) => ({
        id: node.id,
        label: node.name || `ID ${node.id}`,
        description:
          showLevel === 1
            ? '项目范围'
            : showLevel === 2
              ? `所属项目：${project?.name ?? '-'}`
              : `所属资源类型：${resourceType?.name ?? '-'}`,
        hasLevel: node.hasLevel,
      })),
    [nodes, project?.name, resourceType?.name, showLevel],
  );

  const drill = (item: AuthorizationChecklistItem) => {
    if (showLevel === 1) {
      setProject({ id: item.id, name: item.label });
      setResourceType(undefined);
      setShowLevel(2);
      return;
    }

    if (showLevel === 2) {
      setResourceType({ id: item.id, name: item.label });
      setShowLevel(3);
    }
  };

  const goBack = () => {
    if (showLevel === 3) {
      setResourceType(undefined);
      setShowLevel(2);
      return;
    }

    if (showLevel === 2) {
      setProject(undefined);
      setShowLevel(1);
    }
  };

  const save = async () => {
    if (selectedUserId === undefined || saving) return;
    setSaving(true);

    try {
      await assignResourcesToUser({
        userId: selectedUserId,
        projectId: project?.id,
        resourceTypeId: resourceType?.id,
        idList: selectedIds,
        excludeIdList: partialIds,
        controlLevel,
      });
      message.success(
        controlLevel === 2 ? '管理权限已保存' : '查看权限已保存',
      );
      await Promise.all([loadPermissionData(), loadUsers()]);
      onAuthorizationChanged?.();
    } catch (error) {
      
    } finally {
      setSaving(false);
    }
  };

  const submitSearch = () => {
    setSubmittedKeyword(keyword.trim());
    setPagination((current) => ({ ...current, current: 1 }));
  };

  return (
    <div className="grid min-h-0 flex-1 overflow-hidden rounded-lg border border-slate-200 bg-white lg:grid-cols-[390px_minmax(0,1fr)]">
      <aside className="flex min-h-0 flex-col border-b border-slate-200 lg:border-b-0 lg:border-r">
        <div className="shrink-0 border-b border-slate-100 p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <div className="font-medium text-slate-800">选择用户</div>
              <div className="mt-0.5 text-xs text-slate-400">
                共 {pagination.total} 个用户
              </div>
            </div>
            <Button
              type="text"
              icon={<ReloadOutlined />}
              loading={usersLoading}
              onClick={() => void loadUsers()}
            />
          </div>

          <div className="flex h-8 overflow-hidden rounded-md bg-slate-100">
            <Select<UserSearchField>
              value={searchField}
              variant="borderless"
              className="h-8 w-[105px] shrink-0"
              options={[
                { label: '用户名', value: 'userName' },
                { label: '真实姓名', value: 'realName' },
                { label: '部门名称', value: 'deptName' },
              ]}
              onChange={(value) => {
                setSearchField(value);
                setKeyword('');
                setSubmittedKeyword('');
              }}
            />
            <div className="my-2 w-px bg-slate-200" />
            <Input
              allowClear
              value={keyword}
              variant="borderless"
              prefix={<SearchOutlined className="text-slate-400" />}
              placeholder="搜索用户"
              className="min-w-0 flex-1 !bg-transparent"
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
              onPressEnter={submitSearch}
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <Spin spinning={usersLoading}>
            {!usersLoading && users.length === 0 ? (
              <Empty
                className="my-16"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="暂无用户"
              />
            ) : (
              <div className="divide-y divide-slate-100">
                {users.map((user) => {
                  const active = user.userId === selectedUserId;
                  const deptPath = (user.deptList ?? [])
                    .map((dept) => dept.deptName)
                    .filter(Boolean)
                    .join(' / ');

                  return (
                    <button
                      key={user.userId}
                      type="button"
                      className={[
                        'flex w-full items-center gap-3 px-4 py-3 text-left transition-colors',
                        active
                          ? 'bg-rose-50/70'
                          : 'hover:bg-slate-50',
                      ].join(' ')}
                      onClick={() => setSelectedUserId(user.userId)}
                    >
                      <Avatar
                        icon={<UserOutlined />}
                        className={
                          active ? '!bg-[#FE2C55]' : '!bg-slate-500'
                        }
                      />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-slate-700">
                          {displayName(user)}
                        </div>
                        <div className="mt-0.5 truncate text-xs text-slate-400">
                          {user.userName}
                          {deptPath ? ` · ${deptPath}` : ''}
                        </div>
                        <Space size={4} className="mt-1" wrap>
                          <Tag className="!mr-0">
                            管理 {user.adminResourceCnt ?? 0}
                          </Tag>
                          {viewControlEnabled && (
                            <Tag className="!mr-0">
                              查看 {user.viewResourceCnt ?? 0}
                            </Tag>
                          )}
                        </Space>
                      </div>
                    </button>
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
        {selectedUser ? (
          <>
            <div className="flex shrink-0 flex-col gap-4 border-b border-slate-100 px-6 py-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <Avatar
                  size={44}
                  icon={<SafetyCertificateOutlined />}
                  className="!bg-slate-600"
                />
                <div className="min-w-0">
                  <Typography.Title level={5} className="!mb-0">
                    为 {displayName(selectedUser)} 分配资源权限
                  </Typography.Title>
                  <div className="mt-1 text-xs text-slate-400">
                    {showLevel === 1 && '项目级授权'}
                    {showLevel === 2 && `${project?.name} / 资源类型授权`}
                    {showLevel === 3 &&
                      `${project?.name} / ${resourceType?.name} / 资源授权`}
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
                    disabled={dataLoading}
                    onClick={() => void save()}
                  >
                    保存授权
                  </Button>
                </PermissionGuard>
              </Space>
            </div>

            <div className="flex min-h-0 flex-1 flex-col p-6">
              <div className="mb-4 flex shrink-0 items-center gap-2">
                {showLevel > 1 && (
                  <Button
                    type="text"
                    icon={<ArrowLeftOutlined />}
                    onClick={goBack}
                  >
                    返回上一级
                  </Button>
                )}
                <Tag color={controlLevel === 2 ? 'magenta' : 'blue'}>
                  {controlLevel === 2 ? '管理权限' : '查看权限'}
                </Tag>
                {partialIds.length > 0 && (
                  <span className="text-xs text-amber-600">
                    部分授权节点会保留其现有下级授权
                  </span>
                )}
              </div>

              <AuthorizationChecklist
                items={checklistItems}
                selectedIds={selectedIds}
                partialIds={partialIds}
                loading={dataLoading}
                disabled={saving}
                searchPlaceholder={
                  showLevel === 1
                    ? '搜索项目'
                    : showLevel === 2
                      ? '搜索资源类型'
                      : '搜索资源'
                }
                emptyText="当前层级暂无可授权数据"
                onChange={(nextSelected, nextPartial) => {
                  setSelectedIds(nextSelected);
                  setPartialIds(nextPartial);
                }}
                onDrill={showLevel < 3 ? drill : undefined}
              />
            </div>
          </>
        ) : (
          <div className="flex min-h-full items-center justify-center p-8">
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="请从左侧选择用户"
            />
          </div>
        )}
      </main>
    </div>
  );
}

import {
  DeleteOutlined,
  DownOutlined,
  EditOutlined,
  EyeOutlined,
  PlusOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  SearchOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import type { TableColumnsType } from 'antd';
import {
  Avatar,
  Button,
  Checkbox,
  Descriptions,
  Drawer,
  Dropdown,
  Empty,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Spin,
  Tag,
  Tooltip,
  Typography,
  message,
  type MenuProps,
} from 'antd';
import dayjs from 'dayjs';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Key,
} from 'react';

import {
  SecurityPagination,
  SecurityQueryTable,
} from '@/components/security';
import { SECURITY_PERMISSIONS } from '@/constants/securityPermissions';
import { usePermissionAccess } from '@/hooks/usePermissionAccess';
import {
  assignUsersToRole,
  checkRoleBeforeDelete,
  createRole,
  deleteRole,
  getPermissionTree,
  getRoleDetail,
  getRoleUserAssignments,
  pageRoles,
  updateRole,
  type PermissionTreeNode,
  type RoleAssignmentInfo,
  type RoleInput,
  type SystemRole,
} from '@/services/security/roles';

import RoleCapabilityTree, {
  collectCapabilityCheckedKeys,
} from './components/RoleCapabilityTree';

interface RolePaginationState {
  current: number;
  pageSize: number;
  total: number;
}

interface RoleFilterValues {
  id?: number;
  roleName?: string;
  roleCode?: string;
  description?: string;
}

type RoleSearchField =
  | 'roleName'
  | 'roleCode'
  | 'description'
  | 'id';

const DEFAULT_PAGINATION: RolePaginationState = {
  current: 1,
  pageSize: 10,
  total: 0,
};

const SEARCH_FIELD_OPTIONS: Array<{
  label: string;
  value: RoleSearchField;
}> = [
  { label: '角色名称', value: 'roleName' },
  { label: '角色编码', value: 'roleCode' },
  { label: '角色描述', value: 'description' },
  { label: '角色 ID', value: 'id' },
];

const SEARCH_PLACEHOLDERS: Record<RoleSearchField, string> = {
  roleName: '请输入角色名称',
  roleCode: '请输入角色编码',
  description: '请输入角色描述',
  id: '请输入角色 ID',
};

const cleanText = (value?: string): string =>
  value?.trim() ?? '';

const errorText = (error: unknown, fallback: string): string =>
  error instanceof Error && error.message
    ? error.message
    : fallback;

const formatDateTime = (value?: string): string => {
  if (!value) return '-';
  const date = dayjs(value);
  return date.isValid()
    ? date.format('YYYY-MM-DD HH:mm:ss')
    : value;
};

const checkedKeysToIds = (keys: Key[]): number[] =>
  Array.from(
    new Set(
      keys
        .map((key) => Number(key))
        .filter(Number.isFinite),
    ),
  );

interface RoleFilterBarProps {
  total: number;
  onSearch: (values: RoleFilterValues) => void;
  onRefresh: () => void;
  onCreate: () => void;
}

function RoleFilterBar({
  total,
  onSearch,
  onRefresh,
  onCreate,
}: RoleFilterBarProps) {
  const { can } = usePermissionAccess();
  const [field, setField] =
    useState<RoleSearchField>('roleName');
  const [keyword, setKeyword] = useState('');

  const buildFilters = (
    nextKeyword = keyword,
    nextField = field,
  ): RoleFilterValues => {
    const value = cleanText(nextKeyword);
    if (!value) return {};
    if (nextField === 'id') {
      const id = Number(value);
      return Number.isInteger(id) && id > 0 ? { id } : {};
    }
    return { [nextField]: value } as RoleFilterValues;
  };

  return (
    <div className="mb-4 flex min-w-0 flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex min-w-0 items-center gap-2">
        <div className="rounded bg-[#f2f2f4] px-3 py-1 text-sm font-medium leading-5 text-[#FE2C55]">
          全部角色
          <span className="ml-1 text-xs text-slate-400">
            {total}
          </span>
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <div className="flex h-8 w-[360px] max-w-full overflow-hidden rounded-md bg-[#f2f2f4]">
          <Select<RoleSearchField>
            value={field}
            options={SEARCH_FIELD_OPTIONS}
            variant="borderless"
            popupMatchSelectWidth={120}
            className="h-8 w-[104px] shrink-0 [&_.ant-select-selector]:!h-8 [&_.ant-select-selector]:!bg-transparent [&_.ant-select-selector]:!px-3 [&_.ant-select-selection-item]:!leading-[30px]"
            onChange={(nextField) => {
              setField(nextField);
              setKeyword('');
              onSearch({});
            }}
          />
          <div className="my-2 w-px shrink-0 bg-slate-200" />
          <Input
            allowClear
            value={keyword}
            variant="borderless"
            inputMode={field === 'id' ? 'numeric' : 'text'}
            placeholder={SEARCH_PLACEHOLDERS[field]}
            suffix={
              <SearchOutlined
                className="cursor-pointer text-slate-400 hover:text-slate-700"
                onClick={() => onSearch(buildFilters())}
              />
            }
            className="min-w-0 flex-1 !h-8 !bg-transparent !py-0 !shadow-none [&_.ant-input]:!bg-transparent"
            onChange={(event) => {
              const value = event.target.value;
              setKeyword(value);
              if (!value) onSearch({});
            }}
            onPressEnter={() => onSearch(buildFilters())}
          />
        </div>

        <Tooltip title="刷新列表">
          <Button icon={<ReloadOutlined />} onClick={onRefresh} />
        </Tooltip>

        {can(SECURITY_PERMISSIONS.role.create) && (
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={onCreate}
          >
            新增角色
          </Button>
        )}
      </div>
    </div>
  );
}

interface RoleFormValues {
  roleName: string;
  description?: string;
}

interface RoleEditorDrawerProps {
  open: boolean;
  role?: SystemRole;
  onClose: () => void;
  onSuccess: () => void;
}

function RoleEditorDrawer({
  open,
  role,
  onClose,
  onSuccess,
}: RoleEditorDrawerProps) {
  const [form] = Form.useForm<RoleFormValues>();
  const [detail, setDetail] = useState<SystemRole>();
  const [tree, setTree] = useState<PermissionTreeNode>();
  const [checkedKeys, setCheckedKeys] = useState<Key[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;

    let active = true;
    setDetail(undefined);
    setTree(undefined);
    setCheckedKeys([]);
    form.resetFields();
    form.setFieldsValue({ roleName: '', description: '' });
    setLoading(true);

    const load = async () => {
      try {
        const value = role
          ? await getRoleDetail(role.id)
          : undefined;
        const permissionTree = value?.permissionTreeVO
          ?? await getPermissionTree();
        if (!active) return;

        setDetail(value);
        setTree(permissionTree);
        setCheckedKeys(
          collectCapabilityCheckedKeys(permissionTree),
        );
        if (value) {
          form.setFieldsValue({
            roleName: value.roleName,
            description: value.description ?? '',
          });
        }
      } catch (error) {
        if (active) {
          
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [form, open, role]);

  const save = async (values: RoleFormValues) => {
    if (saving || loading) return;
    setSaving(true);

    try {
      const body: RoleInput = {
        roleName: cleanText(values.roleName),
        description: cleanText(values.description),
        permissionIdList: checkedKeysToIds(checkedKeys),
      };

      if (role) {
        await updateRole({
          ...body,
          id: detail?.id ?? role.id,
        });
      } else {
        await createRole(body);
      }

      message.success(role ? '角色已更新' : '角色已创建');
      onClose();
      onSuccess();
    } catch (error) {
      
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer
      open={open}
      title={role ? '编辑角色' : '新增角色'}
      width={720}
      forceRender
      maskClosable={false}
      keyboard={!saving}
      closable={!saving}
      onClose={onClose}
      extra={
        <Space>
          <Button disabled={saving} onClick={onClose}>
            取消
          </Button>
          <Button
            type="primary"
            loading={saving}
            disabled={loading}
            onClick={() => form.submit()}
          >
            {role ? '更新' : '保存'}
          </Button>
        </Space>
      }
    >
      <Form<RoleFormValues>
        form={form}
        layout="vertical"
        preserve={false}
        disabled={saving}
        onFinish={(values) => void save(values)}
      >
        <Form.Item
          name="roleName"
          label="角色名称"
          rules={[
            {
              required: true,
              whitespace: true,
              message: '请输入角色名称',
            },
          ]}
        >
          <Input
            placeholder="请输入角色名称"
            maxLength={64}
            showCount
          />
        </Form.Item>

        <Form.Item name="description" label="角色描述">
          <Input.TextArea
            placeholder="请输入角色职责或适用范围"
            maxLength={500}
            showCount
            autoSize={{ minRows: 3, maxRows: 6 }}
          />
        </Form.Item>

        <Form.Item label="菜单与按钮权限">
          <Spin spinning={loading}>
            <RoleCapabilityTree
              tree={tree}
              checkedKeys={checkedKeys}
              loading={loading}
              onChange={setCheckedKeys}
            />
          </Spin>
        </Form.Item>
      </Form>
    </Drawer>
  );
}

interface RoleDetailDrawerProps {
  open: boolean;
  role?: SystemRole;
  onClose: () => void;
}

function RoleDetailDrawer({
  open,
  role,
  onClose,
}: RoleDetailDrawerProps) {
  const [detail, setDetail] = useState<SystemRole>();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !role) return;
    let active = true;
    setDetail(role);
    setLoading(true);

    void getRoleDetail(role.id)
      .then((value) => {
        if (active) setDetail(value);
      })
      .catch((error) => {
        if (active) {
          
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [open, role]);

  const users = Array.isArray(detail?.authedUsers)
    ? detail.authedUsers
    : [];

  return (
    <Drawer
      open={open}
      title="角色详情"
      width={720}
      onClose={onClose}
    >
      <Spin spinning={loading}>
        {detail && (
          <div className="space-y-5">
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
              <Avatar
                size={48}
                icon={<SafetyCertificateOutlined />}
                className="shrink-0 !bg-slate-600"
              />
              <div className="min-w-0">
                <Typography.Title
                  level={5}
                  className="!mb-0 !text-slate-800"
                >
                  {detail.roleName}
                </Typography.Title>
                <div className="mt-1 text-xs text-slate-400">
                  {detail.roleCode || '暂无角色编码'} · ID {detail.id}
                </div>
              </div>
            </div>

            <Descriptions
              bordered
              size="small"
              column={1}
              items={[
                {
                  key: 'description',
                  label: '角色描述',
                  children: detail.description || '暂无描述',
                },
                {
                  key: 'createTime',
                  label: '创建时间',
                  children: formatDateTime(detail.createTime),
                },
                {
                  key: 'updateTime',
                  label: '更新时间',
                  children: formatDateTime(detail.updateTime),
                },
              ]}
            />

            <div>
              <div className="mb-2 font-medium text-slate-800">
                授权用户
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-3">
                {users.length === 0 ? (
                  <span className="text-sm text-slate-400">
                    暂无授权用户
                  </span>
                ) : (
                  <Space size={[6, 8]} wrap>
                    {users.map((userName) => (
                      <Tag key={userName}>{userName}</Tag>
                    ))}
                  </Space>
                )}
              </div>
            </div>

            <div>
              <div className="mb-2 font-medium text-slate-800">
                菜单与按钮权限
              </div>
              <RoleCapabilityTree
                tree={detail.permissionTreeVO}
                checkedKeys={collectCapabilityCheckedKeys(
                  detail.permissionTreeVO,
                )}
                readOnly
              />
            </div>
          </div>
        )}
      </Spin>
    </Drawer>
  );
}

interface RoleUserAssignmentDrawerProps {
  open: boolean;
  role?: SystemRole;
  onClose: () => void;
  onSuccess: () => void;
}

function RoleUserAssignmentDrawer({
  open,
  role,
  onClose,
  onSuccess,
}: RoleUserAssignmentDrawerProps) {
  const [assignments, setAssignments] = useState<
    RoleAssignmentInfo[]
  >([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !role) return;
    let active = true;
    setAssignments([]);
    setSelectedIds([]);
    setKeyword('');
    setLoading(true);

    void getRoleUserAssignments(role.id)
      .then((values) => {
        if (!active) return;
        const data = Array.isArray(values) ? values : [];
        setAssignments(data);
        setSelectedIds(
          data
            .filter((item) => item.has)
            .map((item) => Number(item.id))
            .filter(Number.isFinite),
        );
      })
      .catch((error) => {
        if (active) {
          
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [open, role]);

  const visibleAssignments = useMemo(() => {
    const value = keyword.trim().toLowerCase();
    if (!value) return assignments;
    return assignments.filter((item) =>
      item.name.toLowerCase().includes(value),
    );
  }, [assignments, keyword]);

  const save = async () => {
    if (!role || loading || saving) return;
    setSaving(true);
    try {
      await assignUsersToRole(role.id, selectedIds);
      message.success('角色用户已更新');
      onClose();
      onSuccess();
    } catch (error) {
      
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer
      open={open}
      title="分配用户"
      width={560}
      maskClosable={false}
      onClose={onClose}
      extra={
        <Space>
          <Button disabled={saving} onClick={onClose}>
            取消
          </Button>
          <Button
            type="primary"
            loading={saving}
            disabled={loading || !role}
            onClick={() => void save()}
          >
            保存
          </Button>
        </Space>
      }
    >
      <Input
        allowClear
        value={keyword}
        prefix={<SearchOutlined className="text-slate-400" />}
        placeholder="搜索用户名或姓名"
        className="mb-4"
        onChange={(event) => setKeyword(event.target.value)}
      />

      <Spin spinning={loading}>
        {!loading && visibleAssignments.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="暂无可分配用户"
          />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {visibleAssignments.map((item) => {
              const userId = Number(item.id);
              const checked = selectedIds.includes(userId);
              return (
                <Checkbox
                  key={item.id}
                  checked={checked}
                  disabled={saving}
                  className="m-0 flex min-h-12 items-center rounded-lg border border-slate-200 bg-white px-4 py-3"
                  onChange={(event) => {
                    setSelectedIds((current) =>
                      event.target.checked
                        ? Array.from(new Set([...current, userId]))
                        : current.filter((id) => id !== userId),
                    );
                  }}
                >
                  <span className="ml-1 text-sm">{item.name}</span>
                </Checkbox>
              );
            })}
          </div>
        )}
      </Spin>
    </Drawer>
  );
}

interface RoleRowActionsProps {
  role: SystemRole;
  onDetail: (role: SystemRole) => void;
  onEdit: (role: SystemRole) => void;
  onAssignUsers: (role: SystemRole) => void;
  onDelete: (role: SystemRole) => void;
}

function RoleRowActions({
  role,
  onDetail,
  onEdit,
  onAssignUsers,
  onDelete,
}: RoleRowActionsProps) {
  const { can, canAny } = usePermissionAccess();
  const canUpdate = can(SECURITY_PERMISSIONS.role.update);
  const canAssign = can(SECURITY_PERMISSIONS.role.assign);
  const canDelete = can(SECURITY_PERMISSIONS.role.delete);
  const hasMore = canAny([
    SECURITY_PERMISSIONS.role.assign,
    SECURITY_PERMISSIONS.role.delete,
  ]);

  const items: MenuProps['items'] = [
    ...(canAssign
      ? [
          {
            key: 'assignUsers',
            icon: <TeamOutlined />,
            label: '分配用户',
          },
        ]
      : []),
    ...(canAssign && canDelete ? [{ type: 'divider' as const }] : []),
    ...(canDelete
      ? [
          {
            key: 'delete',
            icon: <DeleteOutlined />,
            label: '删除角色',
            danger: true,
          },
        ]
      : []),
  ];

  return (
    <Space size={2}>
      <Button
        type="link"
        size="small"
        icon={<EyeOutlined />}
        className="!px-1.5 !text-slate-600 hover:!text-slate-900"
        onClick={() => onDetail(role)}
      >
        详情
      </Button>

      {canUpdate && (
        <Button
          type="link"
          size="small"
          icon={<EditOutlined />}
          className="!px-1.5 !text-slate-600 hover:!text-slate-900"
          onClick={() => onEdit(role)}
        >
          编辑
        </Button>
      )}

      {hasMore && (
        <Dropdown
          trigger={['click']}
          placement="bottomRight"
          menu={{
            items,
            onClick: ({ key }) => {
              if (key === 'assignUsers') onAssignUsers(role);
              if (key === 'delete') onDelete(role);
            },
          }}
        >
          <Button
            type="link"
            size="small"
            className="!px-1.5 !text-slate-600 hover:!text-slate-900"
          >
            更多
            <DownOutlined className="ml-1 text-[10px]" />
          </Button>
        </Dropdown>
      )}
    </Space>
  );
}

export default function RolesPage() {
  const requestSequenceRef = useRef(0);
  const [roles, setRoles] = useState<SystemRole[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] =
    useState<RoleFilterValues>({});
  const [pagination, setPagination] =
    useState<RolePaginationState>(DEFAULT_PAGINATION);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<SystemRole>();
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailRole, setDetailRole] = useState<SystemRole>();
  const [assignmentOpen, setAssignmentOpen] = useState(false);
  const [assignmentRole, setAssignmentRole] =
    useState<SystemRole>();

  const loadRoles = useCallback(async () => {
    const sequence = ++requestSequenceRef.current;
    setLoading(true);
    try {
      const result = await pageRoles({
        pageNum: pagination.current,
        pageSize: pagination.pageSize,
        ...filters,
      });
      if (sequence !== requestSequenceRef.current) return;
      setRoles(result.records ?? []);
      setPagination((current) => ({
        ...current,
        total: result.total ?? 0,
      }));
    } catch {
      if (sequence !== requestSequenceRef.current) return;
      setRoles([]);
      setPagination((current) => ({ ...current, total: 0 }));
    } finally {
      if (sequence === requestSequenceRef.current) {
        setLoading(false);
      }
    }
  }, [filters, pagination.current, pagination.pageSize]);

  useEffect(() => {
    void loadRoles();
  }, [loadRoles]);

  const reload = useCallback(() => {
    void loadRoles();
  }, [loadRoles]);

  const confirmDelete = useCallback(
    async (role: SystemRole) => {
      try {
        const check = await checkRoleBeforeDelete(role.id);
        const users = Array.isArray(check?.userNameList)
          ? check.userNameList
          : [];

        Modal.confirm({
          title: '删除角色',
          width: 480,
          centered: true,
          okText: '删除',
          cancelText: '取消',
          okButtonProps: { danger: true },
          content: (
            <div className="space-y-3">
              <div>
                确定删除角色
                <span className="mx-1 font-medium text-slate-900">
                  {role.roleName}
                </span>
                吗？
              </div>
              {users.length > 0 && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  当前角色已关联 {users.length} 个用户，删除后会同步解除关联。
                </div>
              )}
            </div>
          ),
          onOk: async () => {
            await deleteRole(role.id);
            message.success('角色已删除');
            reload();
          },
        });
      } catch (error) {
        
      }
    },
    [reload],
  );

  const columns = useMemo<TableColumnsType<SystemRole>>(
    () => [
      {
        title: '角色',
        dataIndex: 'roleName',
        key: 'roleName',
        width: 300,
        render: (_, role) => (
          <div className="flex min-w-0 items-center gap-3">
            <Avatar
              size={40}
              icon={<SafetyCertificateOutlined />}
              className="shrink-0 !bg-slate-600"
            />
            <div className="min-w-0">
              <Typography.Text
                strong
                ellipsis
                className="max-w-52 !text-slate-800"
              >
                {role.roleName}
              </Typography.Text>
              <div className="mt-1 truncate text-xs text-slate-500">
                {role.roleCode || '暂无编码'} · ID {role.id}
              </div>
            </div>
          </div>
        ),
      },
      {
        title: '角色描述',
        dataIndex: 'description',
        key: 'description',
        width: 280,
        render: (value?: string) => (
          <Typography.Paragraph
            ellipsis={{ rows: 2, tooltip: value }}
            className="!mb-0 !text-sm !text-slate-600"
          >
            {value || '暂无描述'}
          </Typography.Paragraph>
        ),
      },
      {
        title: '授权用户',
        key: 'authedUsers',
        width: 240,
        render: (_, role) => (
          <div>
            <div className="text-sm font-medium text-slate-700">
              {role.authedUserCnt ?? role.authedUsers?.length ?? 0} 人
            </div>
            <div className="mt-1 text-xs text-slate-400">
              {role.authedUsers?.slice(0, 2).join('、') || '暂无授权用户'}
            </div>
          </div>
        ),
      },
      {
        title: '最近更新',
        key: 'updateTime',
        width: 220,
        render: (_, role) => (
          <div>
            <div className="text-sm text-slate-700">
              {formatDateTime(role.updateTime || role.createTime)}
            </div>
            <div className="mt-1 text-xs text-slate-400">
              {role.lastReviser
                ? `修改人：${role.lastReviser}`
                : `创建于 ${formatDateTime(role.createTime)}`}
            </div>
          </div>
        ),
      },
      {
        title: '操作',
        key: 'action',
        fixed: 'right',
        width: 190,
        align: 'center',
        render: (_, role) => (
          <RoleRowActions
            role={role}
            onDetail={(value) => {
              setDetailRole(value);
              setDetailOpen(true);
            }}
            onEdit={(value) => {
              setEditingRole(value);
              setEditorOpen(true);
            }}
            onAssignUsers={(value) => {
              setAssignmentRole(value);
              setAssignmentOpen(true);
            }}
            onDelete={(value) => void confirmDelete(value)}
          />
        ),
      },
    ],
    [confirmDelete],
  );

  return (
    <section
      className="box-border flex flex-col bg-slate-50/50 p-6"
      style={{
        minHeight: 'calc(100vh - 64px)',
        overflow: 'hidden',
      }}
    >
      <div className="shrink-0">
        <h1
          className="mb-4 font-semibold"
          style={{ fontSize: 18, color: '#282828' }}
        >
          角色管理
        </h1>

        <RoleFilterBar
          total={pagination.total}
          onSearch={(values) => {
            setFilters(values);
            setPagination((current) => ({
              ...current,
              current: 1,
            }));
          }}
          onRefresh={reload}
          onCreate={() => {
            setEditingRole(undefined);
            setEditorOpen(true);
          }}
        />

        <SecurityQueryTable<SystemRole>
          rowKey="id"
          columns={columns}
          dataSource={roles}
          loading={loading}
          pagination={false}
          bordered
          scroll={{ x: 'max-content' }}
        />
      </div>

      <div className="min-h-6 flex-1" />

      <SecurityPagination
        current={pagination.current}
        pageSize={pagination.pageSize}
        total={pagination.total}
        disabled={loading}
        onChange={(current, pageSize) => {
          setPagination((previous) => ({
            ...previous,
            current: previous.pageSize === pageSize ? current : 1,
            pageSize,
          }));
        }}
      />

      <RoleEditorDrawer
        open={editorOpen}
        role={editingRole}
        onClose={() => {
          setEditorOpen(false);
          setEditingRole(undefined);
        }}
        onSuccess={reload}
      />

      <RoleDetailDrawer
        open={detailOpen}
        role={detailRole}
        onClose={() => {
          setDetailOpen(false);
          setDetailRole(undefined);
        }}
      />

      <RoleUserAssignmentDrawer
        open={assignmentOpen}
        role={assignmentRole}
        onClose={() => {
          setAssignmentOpen(false);
          setAssignmentRole(undefined);
        }}
        onSuccess={reload}
      />
    </section>
  );
}

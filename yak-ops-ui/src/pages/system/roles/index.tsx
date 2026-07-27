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
  Tree,
  Typography,
  message,
  type MenuProps,
} from 'antd';
import dayjs from 'dayjs';
import {
  forwardRef,
  type Key,
  type ReactNode,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  PermissionGuard,
  SecurityPagination,
  SecurityQueryTable,
} from '@/components/security';
import {
  type PermissionTreeNode,
  type RoleAssignmentInfo,
  type RoleInput,
  type SystemRole,
  assignUsersToRole,
  checkRoleBeforeDelete,
  createRole,
  deleteRole,
  getPermissionTree,
  getRoleDetail,
  getRoleUserAssignments,
  pageRoles,
  updateRole,
} from '@/services/security/roles';

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

interface PermissionTreeDataNode {
  key: Key;
  title: ReactNode;
  children?: PermissionTreeDataNode[];
  disabled?: boolean;
  disableCheckbox?: boolean;
}

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

const rolePermission = (action: string): string =>
  `security:role:${action}`;

const cleanText = (value?: string): string =>
  value?.trim() ?? '';

const errorText = (error: unknown, fallback: string): string =>
  error instanceof Error && error.message
    ? error.message
    : fallback;

const formatDateTime = (value?: string): string => {
  if (!value) {
    return '-';
  }

  const date = dayjs(value);

  return date.isValid()
    ? date.format('YYYY-MM-DD HH:mm:ss')
    : value;
};

const permissionNodeKey = (
  node: PermissionTreeNode,
  path: number[],
): Key => {
  const id = Number(node.id);

  return Number.isFinite(id)
    ? id
    : `permission-${path.join('-')}`;
};

const createPermissionTreeNode = (
  node: PermissionTreeNode,
  path: number[],
): PermissionTreeDataNode => {
  const children = Array.isArray(node.childList)
    ? node.childList.map((child, index) =>
        createPermissionTreeNode(child, [...path, index]),
      )
    : [];

  return {
    key: permissionNodeKey(node, path),
    disabled: node.active === false,
    disableCheckbox: node.active === false,
    title: (
      <span
        className={
          node.active === false
            ? 'text-slate-400'
            : 'text-slate-700'
        }
        title={node.description}
      >
        {node.permissionName || node.permissionCode || '未命名权限'}
        {node.permissionCode &&
          node.permissionCode !== node.permissionName && (
            <span className="ml-2 text-xs text-slate-400">
              {node.permissionCode}
            </span>
          )}
      </span>
    ),
    ...(children.length > 0 ? { children } : {}),
  };
};

const createPermissionTreeData = (
  tree?: PermissionTreeNode,
): PermissionTreeDataNode[] => {
  if (!tree) {
    return [];
  }

  const hasRootIdentity =
    Number.isFinite(Number(tree.id)) ||
    Boolean(tree.permissionName) ||
    Boolean(tree.permissionCode);

  if (!hasRootIdentity) {
    return Array.isArray(tree.childList)
      ? tree.childList.map((node, index) =>
          createPermissionTreeNode(node, [index]),
        )
      : [];
  }

  return [createPermissionTreeNode(tree, [0])];
};

const collectCheckedPermissionKeys = (
  tree?: PermissionTreeNode,
): Key[] => {
  if (!tree) {
    return [];
  }

  const keys: Key[] = [];

  const visit = (node: PermissionTreeNode) => {
    const id = Number(node.id);

    if (node.has && Number.isFinite(id)) {
      keys.push(id);
    }

    node.childList?.forEach(visit);
  };

  visit(tree);

  return keys;
};

const checkedKeysToIds = (keys: Key[]): number[] =>
  Array.from(
    new Set(
      keys
        .map((key) => Number(key))
        .filter(Number.isFinite),
    ),
  );

const unwrapCheckedKeys = (
  value:
    | Key[]
    | {
        checked: Key[];
        halfChecked: Key[];
      },
): Key[] => (Array.isArray(value) ? value : value.checked);

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
  const [searchField, setSearchField] =
    useState<RoleSearchField>('roleName');
  const [keyword, setKeyword] = useState('');

  const createFilters = (
    nextKeyword = keyword,
    nextSearchField = searchField,
  ): RoleFilterValues => {
    const normalized = cleanText(nextKeyword);

    if (!normalized) {
      return {};
    }

    if (nextSearchField === 'id') {
      const id = Number(normalized);

      return Number.isInteger(id) && id > 0
        ? { id }
        : {};
    }

    return {
      [nextSearchField]: normalized,
    } as RoleFilterValues;
  };

  const submit = () => {
    onSearch(createFilters());
  };

  const changeSearchField = (field: RoleSearchField) => {
    setSearchField(field);
    setKeyword('');
    onSearch({});
  };

  return (
    <div className="mb-4 flex min-w-0 flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex min-w-0 items-center gap-2 overflow-x-auto pb-1 lg:pb-0">
        <div className="cursor-default rounded bg-[#f2f2f4] px-3 py-1 text-sm font-medium leading-5 text-[#FE2C55]">
          全部角色
          <span className="ml-1 text-xs text-slate-400">
            {total}
          </span>
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <div className="flex h-8 w-[360px] max-w-full overflow-hidden rounded-md bg-[#f2f2f4]">
          <Select<RoleSearchField>
            value={searchField}
            options={SEARCH_FIELD_OPTIONS}
            variant="borderless"
            popupMatchSelectWidth={120}
            className={[
              'h-8 w-[104px] shrink-0',
              '[&_.ant-select-selector]:!h-8',
              '[&_.ant-select-selector]:!px-3',
              '[&_.ant-select-selector]:!bg-transparent',
              '[&_.ant-select-selection-item]:!leading-[30px]',
            ].join(' ')}
            onChange={changeSearchField}
          />

          <div className="my-2 w-px shrink-0 bg-slate-200" />

          <Input
            allowClear
            value={keyword}
            variant="borderless"
            inputMode={searchField === 'id' ? 'numeric' : 'text'}
            placeholder={SEARCH_PLACEHOLDERS[searchField]}
            suffix={
              <SearchOutlined
                className="cursor-pointer text-slate-400 transition-colors hover:text-slate-700"
                onClick={submit}
              />
            }
            className="min-w-0 flex-1 !h-8 !bg-transparent !py-0 !shadow-none [&_.ant-input]:!bg-transparent"
            onChange={(event) => {
              const nextKeyword = event.target.value;
              setKeyword(nextKeyword);

              if (!nextKeyword) {
                onSearch({});
              }
            }}
            onPressEnter={submit}
          />
        </div>

        <Tooltip title="刷新列表">
          <Button
            icon={<ReloadOutlined />}
            onClick={onRefresh}
          />
        </Tooltip>

        <PermissionGuard
          mode="one"
          permission={rolePermission('create')}
        >
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={onCreate}
          >
            新增角色
          </Button>
        </PermissionGuard>
      </div>
    </div>
  );
}

interface RoleFormValues {
  roleName: string;
  description?: string;
}

interface RoleEditorDrawerRef {
  openCreate: () => Promise<void>;
  openEdit: (role: SystemRole) => Promise<void>;
}

interface RoleEditorDrawerProps {
  onSuccess: () => void;
}

const RoleEditorDrawer = forwardRef<
  RoleEditorDrawerRef,
  RoleEditorDrawerProps
>(({ onSuccess }, ref) => {
  const [form] = Form.useForm<RoleFormValues>();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SystemRole>();
  const [permissionTree, setPermissionTree] =
    useState<PermissionTreeNode>();
  const [checkedKeys, setCheckedKeys] = useState<Key[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const close = useCallback(() => {
    if (saving) {
      return;
    }

    setOpen(false);
    setEditing(undefined);
    setPermissionTree(undefined);
    setCheckedKeys([]);
    form.resetFields();
  }, [form, saving]);

  const openCreate = useCallback(async () => {
    setEditing(undefined);
    setPermissionTree(undefined);
    setCheckedKeys([]);
    form.resetFields();
    form.setFieldsValue({
      roleName: '',
      description: '',
    });
    setOpen(true);
    setLoading(true);

    try {
      setPermissionTree(await getPermissionTree());
    } catch (error) {
      message.error(errorText(error, '权限树加载失败'));
    } finally {
      setLoading(false);
    }
  }, [form]);

  const openEdit = useCallback(
    async (row: SystemRole) => {
      setEditing(row);
      setPermissionTree(undefined);
      setCheckedKeys([]);
      form.resetFields();
      setOpen(true);
      setLoading(true);

      try {
        const detail = await getRoleDetail(row.id);

        setEditing(detail);
        setPermissionTree(detail.permissionTreeVO);
        setCheckedKeys(
          collectCheckedPermissionKeys(
            detail.permissionTreeVO,
          ),
        );
        form.setFieldsValue({
          roleName: detail.roleName,
          description: detail.description ?? '',
        });
      } catch (error) {
        message.error(errorText(error, '角色详情加载失败'));
      } finally {
        setLoading(false);
      }
    },
    [form],
  );

  useImperativeHandle(
    ref,
    () => ({ openCreate, openEdit }),
    [openCreate, openEdit],
  );

  const save = async (values: RoleFormValues) => {
    if (saving || loading) {
      return;
    }

    setSaving(true);

    try {
      const body: RoleInput = {
        roleName: cleanText(values.roleName),
        description: cleanText(values.description),
        permissionIdList: checkedKeysToIds(checkedKeys),
      };

      if (editing) {
        await updateRole({
          ...body,
          id: editing.id,
        });
      } else {
        await createRole(body);
      }

      message.success(
        editing ? '角色已更新' : '角色已创建',
      );
      close();
      onSuccess();
    } catch (error) {
      message.error(
        errorText(
          error,
          editing ? '角色更新失败' : '角色创建失败',
        ),
      );
    } finally {
      setSaving(false);
    }
  };

  const treeData = useMemo(
    () => createPermissionTreeData(permissionTree),
    [permissionTree],
  );

  return (
    <Drawer
      open={open}
      title={editing ? '编辑角色' : '新增角色'}
      width={620}
      forceRender
      maskClosable={false}
      keyboard={!saving}
      onClose={close}
      extra={
        <div className="flex items-center gap-2">
          <Button disabled={saving} onClick={close}>
            取消
          </Button>
          <Button
            type="primary"
            loading={saving}
            disabled={loading}
            onClick={() => form.submit()}
          >
            {editing ? '更新' : '保存'}
          </Button>
        </div>
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

        <Form.Item label="权限配置">
          <div className="min-h-48 rounded-lg border border-slate-200 bg-slate-50/40 p-3">
            <Spin spinning={loading}>
              {!loading && treeData.length === 0 ? (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="暂无可配置权限"
                />
              ) : (
                <Tree
                  checkable
                  selectable={false}
                  defaultExpandAll
                  checkedKeys={checkedKeys}
                  treeData={treeData}
                  onCheck={(value) =>
                    setCheckedKeys(unwrapCheckedKeys(value))
                  }
                />
              )}
            </Spin>
          </div>
        </Form.Item>
      </Form>
    </Drawer>
  );
});

RoleEditorDrawer.displayName = 'RoleEditorDrawer';

interface RoleDetailDrawerRef {
  open: (role: SystemRole) => Promise<void>;
}

const RoleDetailDrawer = forwardRef<RoleDetailDrawerRef>(
  (_, ref) => {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [role, setRole] = useState<SystemRole>();

    const show = useCallback(async (row: SystemRole) => {
      setRole(row);
      setOpen(true);
      setLoading(true);

      try {
        setRole(await getRoleDetail(row.id));
      } catch (error) {
        message.error(errorText(error, '角色详情加载失败'));
      } finally {
        setLoading(false);
      }
    }, []);

    useImperativeHandle(ref, () => ({ open: show }), [show]);

    const treeData = useMemo(
      () => createPermissionTreeData(role?.permissionTreeVO),
      [role?.permissionTreeVO],
    );
    const checkedKeys = useMemo(
      () =>
        collectCheckedPermissionKeys(
          role?.permissionTreeVO,
        ),
      [role?.permissionTreeVO],
    );
    const users = Array.isArray(role?.authedUsers)
      ? role.authedUsers
      : [];

    return (
      <Drawer
        open={open}
        title="角色详情"
        width={620}
        onClose={() => setOpen(false)}
      >
        <Spin spinning={loading}>
          {role && (
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
                    {role.roleName}
                  </Typography.Title>
                  <div className="mt-1 text-xs text-slate-400">
                    {role.roleCode || '暂无角色编码'} · ID {role.id}
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
                    children: role.description || '暂无描述',
                  },
                  {
                    key: 'lastReviser',
                    label: '最后修改人',
                    children: role.lastReviser || '-',
                  },
                  {
                    key: 'createTime',
                    label: '创建时间',
                    children: formatDateTime(role.createTime),
                  },
                  {
                    key: 'updateTime',
                    label: '更新时间',
                    children: formatDateTime(role.updateTime),
                  },
                ]}
              />

              <div>
                <div className="mb-2 font-medium text-slate-800">
                  已授权用户
                  <span className="ml-2 text-xs font-normal text-slate-400">
                    {role.authedUserCnt ?? users.length} 人
                  </span>
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
                  权限明细
                </div>
                <div className="min-h-40 rounded-lg border border-slate-200 bg-slate-50/40 p-3">
                  {treeData.length === 0 ? (
                    <Empty
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      description="暂无权限"
                    />
                  ) : (
                    <Tree
                      checkable
                      selectable={false}
                      defaultExpandAll
                      disabled
                      checkedKeys={checkedKeys}
                      treeData={treeData}
                    />
                  )}
                </div>
              </div>
            </div>
          )}
        </Spin>
      </Drawer>
    );
  },
);

RoleDetailDrawer.displayName = 'RoleDetailDrawer';

interface RoleUserAssignmentDrawerRef {
  open: (role: SystemRole) => Promise<void>;
}

interface RoleUserAssignmentDrawerProps {
  onSuccess: () => void;
}

const RoleUserAssignmentDrawer = forwardRef<
  RoleUserAssignmentDrawerRef,
  RoleUserAssignmentDrawerProps
>(({ onSuccess }, ref) => {
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState<SystemRole>();
  const [assignments, setAssignments] = useState<
    RoleAssignmentInfo[]
  >([]);
  const [selectedUserIds, setSelectedUserIds] =
    useState<number[]>([]);
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const close = useCallback(() => {
    if (saving) {
      return;
    }

    setOpen(false);
    setTarget(undefined);
    setAssignments([]);
    setSelectedUserIds([]);
    setKeyword('');
  }, [saving]);

  const show = useCallback(async (role: SystemRole) => {
    setTarget(role);
    setAssignments([]);
    setSelectedUserIds([]);
    setKeyword('');
    setOpen(true);
    setLoading(true);

    try {
      const data = await getRoleUserAssignments(role.id);
      const values = Array.isArray(data) ? data : [];

      setAssignments(values);
      setSelectedUserIds(
        values
          .filter((item) => item.has)
          .map((item) => Number(item.id))
          .filter(Number.isFinite),
      );
    } catch (error) {
      message.error(
        errorText(error, '用户分配信息加载失败'),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useImperativeHandle(ref, () => ({ open: show }), [show]);

  const visibleAssignments = useMemo(() => {
    const normalized = keyword.trim().toLowerCase();

    if (!normalized) {
      return assignments;
    }

    return assignments.filter((item) =>
      item.name.toLowerCase().includes(normalized),
    );
  }, [assignments, keyword]);

  const save = async () => {
    if (!target || saving || loading) {
      return;
    }

    setSaving(true);

    try {
      await assignUsersToRole(target.id, selectedUserIds);
      message.success('角色用户已更新');
      close();
      onSuccess();
    } catch (error) {
      message.error(errorText(error, '用户分配失败'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer
      open={open}
      title="分配用户"
      width={560}
      forceRender
      maskClosable={false}
      keyboard={!saving}
      onClose={close}
      extra={
        <div className="flex items-center gap-2">
          <Button disabled={saving} onClick={close}>
            取消
          </Button>
          <Button
            type="primary"
            loading={saving}
            disabled={loading || !target}
            onClick={() => void save()}
          >
            保存
          </Button>
        </div>
      }
    >
      {target && (
        <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
          <div className="text-xs text-slate-500">当前角色</div>
          <div className="mt-1 font-medium text-slate-900">
            {target.roleName}
          </div>
          <div className="mt-0.5 text-xs text-slate-400">
            {target.roleCode || `ID ${target.id}`}
          </div>
        </div>
      )}

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
            description={
              assignments.length === 0
                ? '暂无可分配用户'
                : '没有匹配的用户'
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {visibleAssignments.map((item) => {
              const userId = Number(item.id);
              const checked = selectedUserIds.includes(userId);

              return (
                <Checkbox
                  key={item.id}
                  checked={checked}
                  disabled={saving}
                  className={[
                    'm-0 flex min-h-12 items-center rounded-lg border px-4 py-3',
                    'transition-colors duration-200',
                    checked
                      ? 'border-primary bg-primary/5'
                      : 'border-slate-200 bg-white hover:border-slate-300',
                  ].join(' ')}
                  onChange={(event) => {
                    setSelectedUserIds((current) =>
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
});

RoleUserAssignmentDrawer.displayName =
  'RoleUserAssignmentDrawer';

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
  const items: MenuProps['items'] = [
    {
      key: 'assignUsers',
      icon: <TeamOutlined />,
      label: '分配用户',
    },
    { type: 'divider' },
    {
      key: 'delete',
      icon: <DeleteOutlined />,
      label: '删除角色',
      danger: true,
    },
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

      <Button
        type="link"
        size="small"
        icon={<EditOutlined />}
        className="!px-1.5 !text-slate-600 hover:!text-slate-900"
        onClick={() => onEdit(role)}
      >
        编辑
      </Button>

      <Dropdown
        trigger={['click']}
        placement="bottomRight"
        menu={{
          items,
          onClick: ({ key }) => {
            if (key === 'assignUsers') {
              onAssignUsers(role);
            }

            if (key === 'delete') {
              onDelete(role);
            }
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
    </Space>
  );
}

export default function RolesPage() {
  const editorRef = useRef<RoleEditorDrawerRef>(null);
  const detailRef = useRef<RoleDetailDrawerRef>(null);
  const userAssignmentRef =
    useRef<RoleUserAssignmentDrawerRef>(null);
  const requestSequenceRef = useRef(0);

  const [roles, setRoles] = useState<SystemRole[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] =
    useState<RoleFilterValues>({});
  const [pagination, setPagination] =
    useState<RolePaginationState>(DEFAULT_PAGINATION);

  const loadRoles = useCallback(async () => {
    const requestSequence = ++requestSequenceRef.current;
    setLoading(true);

    try {
      const result = await pageRoles({
        pageNum: pagination.current,
        pageSize: pagination.pageSize,
        ...filters,
      });

      if (requestSequence !== requestSequenceRef.current) {
        return;
      }

      setRoles(result.records ?? []);
      setPagination((current) => ({
        ...current,
        total: result.total ?? 0,
      }));
    } catch {
      if (requestSequence !== requestSequenceRef.current) {
        return;
      }

      setRoles([]);
      setPagination((current) => ({
        ...current,
        total: 0,
      }));
    } finally {
      if (requestSequence === requestSequenceRef.current) {
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

  const handleSearch = useCallback((values: RoleFilterValues) => {
    setFilters(values);
    setPagination((current) => ({
      ...current,
      current: 1,
    }));
  }, []);

  const handlePageChange = useCallback(
    (nextCurrent: number, nextPageSize: number) => {
      setPagination((current) => {
        const pageSizeChanged =
          current.pageSize !== nextPageSize;

        return {
          ...current,
          current: pageSizeChanged ? 1 : nextCurrent,
          pageSize: nextPageSize,
        };
      });
    },
    [],
  );

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
                  当前角色已关联 {users.length} 个用户，删除后会同步解除关联：
                  <div className="mt-2 flex flex-wrap gap-1">
                    {users.slice(0, 8).map((userName) => (
                      <Tag key={userName}>{userName}</Tag>
                    ))}
                    {users.length > 8 && (
                      <Tag>+{users.length - 8}</Tag>
                    )}
                  </div>
                </div>
              )}
            </div>
          ),
          onOk: async () => {
            try {
              await deleteRole(role.id);
              message.success('角色已删除');
              reload();
            } catch (error) {
              message.error(errorText(error, '角色删除失败'));
              throw error;
            }
          },
        });
      } catch (error) {
        message.error(errorText(error, '角色删除检查失败'));
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
                {role.roleCode || '暂无编码'}
                <span className="mx-1 text-slate-300">·</span>
                ID {role.id}
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
        dataIndex: 'authedUsers',
        key: 'authedUsers',
        width: 260,
        render: (_, role) => {
          const users = Array.isArray(role.authedUsers)
            ? role.authedUsers
            : [];
          const visibleUsers = users.slice(0, 2);
          const remaining = users.length - visibleUsers.length;

          return (
            <div>
              <div className="text-sm font-medium text-slate-700">
                {role.authedUserCnt ?? users.length} 人
              </div>
              <div className="mt-1 min-h-5">
                {visibleUsers.length === 0 ? (
                  <span className="text-xs text-slate-400">
                    暂无授权用户
                  </span>
                ) : (
                  <Space size={[4, 4]} wrap>
                    {visibleUsers.map((userName) => (
                      <Tag
                        key={userName}
                        className="!m-0 !border-slate-200 !bg-slate-50 !text-slate-600"
                      >
                        {userName}
                      </Tag>
                    ))}
                    {remaining > 0 && (
                      <Tag className="!m-0 !border-slate-200 !bg-slate-50 !text-slate-600">
                        +{remaining}
                      </Tag>
                    )}
                  </Space>
                )}
              </div>
            </div>
          );
        },
      },
      {
        title: '最近更新',
        dataIndex: 'updateTime',
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
        width: 180,
        align: 'center',
        render: (_, role) => (
          <RoleRowActions
            role={role}
            onDetail={(row) => {
              void detailRef.current?.open(row);
            }}
            onEdit={(row) => {
              void editorRef.current?.openEdit(row);
            }}
            onAssignUsers={(row) => {
              void userAssignmentRef.current?.open(row);
            }}
            onDelete={(row) => {
              void confirmDelete(row);
            }}
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
          onSearch={handleSearch}
          onRefresh={reload}
          onCreate={() => {
            void editorRef.current?.openCreate();
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
        onChange={handlePageChange}
      />

      <RoleEditorDrawer
        ref={editorRef}
        onSuccess={reload}
      />
      <RoleDetailDrawer ref={detailRef} />
      <RoleUserAssignmentDrawer
        ref={userAssignmentRef}
        onSuccess={reload}
      />
    </section>
  );
}

import {
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import type { ProColumns } from '@ant-design/pro-components';
import {
  Button,
  Modal,
  Space,
  Switch,
  Tag,
  Typography,
  message,
} from 'antd';
import dayjs from 'dayjs';
import {
  useCallback,
  useEffect,
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
  type ConfigStatus,
  type SystemConfig,
  deleteConfig,
  listConfigGroups,
  pageConfigs,
  toggleConfig,
} from '@/services/security/configs';

import ConfigDetailDrawer, {
  type ConfigDetailDrawerRef,
} from './components/ConfigDetailDrawer';
import ConfigEditorModal, {
  type ConfigEditorModalRef,
} from './components/ConfigEditorModal';
import ConfigFilterBar, {
  type ConfigFilterValues,
} from './components/ConfigFilterBar';

interface ConfigPaginationState {
  current: number;
  pageSize: number;
  total: number;
}

const DEFAULT_PAGINATION: ConfigPaginationState = {
  current: 1,
  pageSize: 10,
  total: 0,
};

const CONFIG_STATUS_ENABLED: ConfigStatus = 1;
const CONFIG_STATUS_DISABLED: ConfigStatus = 2;

const configPermission = (action: string): string =>
  `security:config:${action}`;

const errorText = (error: unknown, fallback: string): string =>
  error instanceof Error && error.message
    ? error.message
    : fallback;

const dateText = (value?: string): string =>
  value && dayjs(value).isValid()
    ? dayjs(value).format('YYYY-MM-DD HH:mm:ss')
    : '-';

export default function ConfigsPage() {
  const editorRef = useRef<ConfigEditorModalRef>(null);
  const detailRef = useRef<ConfigDetailDrawerRef>(null);
  const requestSequenceRef = useRef(0);

  const [configs, setConfigs] = useState<SystemConfig[]>([]);
  const [groups, setGroups] = useState<string[]>([]);
  const [filters, setFilters] = useState<ConfigFilterValues>({});
  const [pagination, setPagination] =
    useState<ConfigPaginationState>(DEFAULT_PAGINATION);
  const [loading, setLoading] = useState(false);
  const [switchingIds, setSwitchingIds] = useState<Set<number>>(
    () => new Set(),
  );

  const loadGroups = useCallback(async () => {
    try {
      setGroups(await listConfigGroups());
    } catch {
      setGroups([]);
    }
  }, []);

  const loadConfigs = useCallback(async () => {
    const sequence = ++requestSequenceRef.current;
    setLoading(true);

    try {
      const result = await pageConfigs({
        pageNum: pagination.current,
        pageSize: pagination.pageSize,
        id: filters.id,
        valueGroup: filters.valueGroup,
        valueName: filters.valueName,
        status: filters.status,
        memo: filters.memo,
        operator: filters.operator,
      });

      if (sequence !== requestSequenceRef.current) return;

      setConfigs(result.records ?? []);
      setPagination((current) => ({
        ...current,
        total: result.total ?? 0,
      }));
    } catch (error) {
      if (sequence !== requestSequenceRef.current) return;

      setConfigs([]);
      setPagination((current) => ({
        ...current,
        total: 0,
      }));
      message.error(errorText(error, '系统配置加载失败'));
    } finally {
      if (sequence === requestSequenceRef.current) {
        setLoading(false);
      }
    }
  }, [
    filters,
    pagination.current,
    pagination.pageSize,
  ]);

  useEffect(() => {
    void loadGroups();
  }, [loadGroups]);

  useEffect(() => {
    void loadConfigs();
  }, [loadConfigs]);

  const reload = useCallback(() => {
    void loadConfigs();
  }, [loadConfigs]);

  const reloadAll = useCallback(() => {
    void Promise.all([loadConfigs(), loadGroups()]);
  }, [loadConfigs, loadGroups]);

  const handleSearch = useCallback((values: ConfigFilterValues) => {
    setFilters(values);
    setPagination((current) => ({
      ...current,
      current: 1,
    }));
  }, []);

  const handlePageChange = useCallback(
    (nextCurrent: number, nextPageSize: number) => {
      setPagination((current) => {
        const pageSizeChanged = current.pageSize !== nextPageSize;

        return {
          ...current,
          current: pageSizeChanged ? 1 : nextCurrent,
          pageSize: nextPageSize,
        };
      });
    },
    [],
  );

  const showDetail = useCallback((config: SystemConfig) => {
    detailRef.current?.open(config);
  }, []);

  const showEdit = useCallback((config: SystemConfig) => {
    editorRef.current?.openEdit(config);
  }, []);

  const changeStatus = useCallback(
    async (config: SystemConfig, checked: boolean) => {
      if (switchingIds.has(config.id)) return;

      setSwitchingIds((current) => {
        const next = new Set(current);
        next.add(config.id);
        return next;
      });

      try {
        await toggleConfig(
          config.id,
          checked
            ? CONFIG_STATUS_ENABLED
            : CONFIG_STATUS_DISABLED,
        );
        message.success(
          checked ? '配置已启用' : '配置已停用',
        );
        reload();
      } catch (error) {
        message.error(errorText(error, '配置状态更新失败'));
      } finally {
        setSwitchingIds((current) => {
          const next = new Set(current);
          next.delete(config.id);
          return next;
        });
      }
    },
    [reload, switchingIds],
  );

  const remove = useCallback(
    (config: SystemConfig) => {
      Modal.confirm({
        title: '删除系统配置',
        width: 500,
        centered: true,
        okText: '删除',
        cancelText: '取消',
        okButtonProps: { danger: true },
        content: (
          <div className="space-y-3">
            <div>
              确定删除配置
              <span className="mx-1 font-medium text-slate-900">
                {config.valueGroup}/{config.valueName}
              </span>
              吗？
            </div>
            <div className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm leading-6 text-red-700">
              删除后无法恢复。依赖该配置的业务会读取默认值或出现运行异常，请先确认调用方已停止使用。
            </div>
          </div>
        ),
        onOk: async () => {
          try {
            await deleteConfig(config.id);
            message.success('配置已删除');

            if (configs.length === 1 && pagination.current > 1) {
              setPagination((current) => ({
                ...current,
                current: current.current - 1,
              }));
            } else {
              reload();
            }
            void loadGroups();
          } catch (error) {
            message.error(errorText(error, '配置删除失败'));
            throw error;
          }
        },
      });
    },
    [
      configs.length,
      loadGroups,
      pagination.current,
      reload,
    ],
  );

  const columns = useMemo<ProColumns<SystemConfig>[]>(
    () => [
      {
        title: '配置项',
        dataIndex: 'valueName',
        width: 260,
        render: (_, row) => (
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-2">
              <Typography.Text
                strong
                ellipsis={{ tooltip: row.valueName }}
                className="min-w-0"
              >
                {row.valueName || '未命名配置'}
              </Typography.Text>
              <Tag className="shrink-0 !mr-0">
                {row.valueGroup || '未分组'}
              </Tag>
            </div>
            <div className="mt-1 text-xs text-slate-400">
              ID {row.id}
            </div>
          </div>
        ),
      },
      {
        title: '配置值',
        dataIndex: 'value',
        width: 300,
        render: (_, row) => (
          <Typography.Text
            code
            copyable={{ text: row.value ?? '' }}
            ellipsis={{ tooltip: row.value || '(空字符串)' }}
            className="max-w-[270px]"
          >
            {row.value || '(空字符串)'}
          </Typography.Text>
        ),
      },
      {
        title: '备注',
        dataIndex: 'memo',
        width: 240,
        ellipsis: true,
        renderText: (value) => value || '-',
      },
      {
        title: '状态',
        dataIndex: 'status',
        width: 120,
        align: 'center',
        render: (_, row) => (
          <PermissionGuard
            mode="one"
            permission={configPermission('toggle')}
            behavior="disable"
          >
            <Switch
              checked={row.status === CONFIG_STATUS_ENABLED}
              loading={switchingIds.has(row.id)}
              checkedChildren="启用"
              unCheckedChildren="停用"
              onChange={(checked) =>
                void changeStatus(row, checked)
              }
            />
          </PermissionGuard>
        ),
      },
      {
        title: '最后操作人',
        dataIndex: 'operator',
        width: 140,
        renderText: (value) => value || '-',
      },
      {
        title: '更新时间',
        dataIndex: 'updateTime',
        width: 180,
        renderText: (value) => dateText(value),
      },
      {
        title: '操作',
        valueType: 'option',
        fixed: 'right',
        width: 190,
        render: (_, row) => (
          <Space size={0}>
            <Button
              type="link"
              icon={<EyeOutlined />}
              onClick={() => showDetail(row)}
            >
              详情
            </Button>

            <PermissionGuard
              mode="one"
              permission={configPermission('update')}
            >
              <Button
                type="link"
                icon={<EditOutlined />}
                onClick={() => showEdit(row)}
              >
                编辑
              </Button>
            </PermissionGuard>

            <PermissionGuard
              mode="one"
              permission={configPermission('delete')}
            >
              <Button
                type="link"
                danger
                icon={<DeleteOutlined />}
                onClick={() => remove(row)}
              >
                删除
              </Button>
            </PermissionGuard>
          </Space>
        ),
      },
    ],
    [changeStatus, remove, showDetail, showEdit, switchingIds],
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
          系统配置
        </h1>

        <ConfigFilterBar
          groups={groups}
          loading={loading}
          onSearch={handleSearch}
          onRefresh={reload}
          onCreate={() => editorRef.current?.openCreate()}
        />

        <SecurityQueryTable<SystemConfig>
          rowKey="id"
          columns={columns}
          dataSource={configs}
          loading={loading}
          search={false}
          options={false}
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

      <ConfigEditorModal
        ref={editorRef}
        groups={groups}
        onSuccess={reloadAll}
      />

      <ConfigDetailDrawer ref={detailRef} />
    </section>
  );
}

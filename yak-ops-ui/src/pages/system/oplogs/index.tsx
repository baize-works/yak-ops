import {
  EyeOutlined,
  FileSearchOutlined,
} from '@ant-design/icons';
import type { ProColumns } from '@ant-design/pro-components';
import { history } from '@umijs/max';
import { Button, Space, Tag, Typography, message } from 'antd';
import dayjs from 'dayjs';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  SecurityPagination,
  SecurityQueryTable,
} from '@/components/security';
import {
  getOperationLogOptions,
  type OperationLog,
  type OperationLogOptions,
  pageOperationLogs,
} from '@/services/security/operationLogs';

import OperationLogDetailDrawer, {
  type OperationLogDetailDrawerRef,
} from './components/OperationLogDetailDrawer';
import OperationLogFilterBar, {
  type OperationLogFilterValues,
} from './components/OperationLogFilterBar';

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

const EMPTY_OPTIONS: OperationLogOptions = {
  operateTypes: [],
  operatePages: [],
  operationMethods: [],
  targetTypes: [],
};

const errorText = (error: unknown, fallback: string): string =>
  error instanceof Error && error.message
    ? error.message
    : fallback;

const displayTime = (value?: string): string => {
  if (!value) return '-';
  const time = dayjs(value);
  return time.isValid()
    ? time.format('YYYY-MM-DD HH:mm:ss')
    : value;
};

const methodTag = (method?: string) =>
  method ? <Tag className="!mr-0">{method}</Tag> : null;

export default function OperationLogsPage() {
  const detailRef = useRef<OperationLogDetailDrawerRef>(null);
  const requestSequenceRef = useRef(0);

  const [logs, setLogs] = useState<OperationLog[]>([]);
  const [options, setOptions] =
    useState<OperationLogOptions>(EMPTY_OPTIONS);
  const [filters, setFilters] =
    useState<OperationLogFilterValues>({});
  const [pagination, setPagination] =
    useState<PaginationState>(DEFAULT_PAGINATION);
  const [loading, setLoading] = useState(false);

  const loadOptions = useCallback(async () => {
    try {
      setOptions(await getOperationLogOptions());
    } catch (error) {
      setOptions(EMPTY_OPTIONS);
      message.warning(
        errorText(error, '操作日志筛选选项加载失败'),
      );
    }
  }, []);

  useEffect(() => {
    void loadOptions();
  }, [loadOptions]);

  useEffect(() => {
    const value = new URLSearchParams(
      history.location.search,
    ).get('messageLogId');

    if (!value) return;

    const logId = Number(value);
    if (Number.isSafeInteger(logId) && logId > 0) {
      void detailRef.current?.open(logId);
    }
  }, []);

  const loadLogs = useCallback(async () => {
    const sequence = ++requestSequenceRef.current;
    setLoading(true);

    try {
      const result = await pageOperationLogs({
        pageNum: pagination.current,
        pageSize: pagination.pageSize,
        ...filters,
      });

      if (sequence !== requestSequenceRef.current) return;

      setLogs(result.records ?? []);
      setPagination((current) => ({
        ...current,
        total: result.total ?? 0,
      }));
    } catch (error) {
      if (sequence !== requestSequenceRef.current) return;

      setLogs([]);
      setPagination((current) => ({
        ...current,
        total: 0,
      }));
      message.error(errorText(error, '操作日志查询失败'));
    } finally {
      if (sequence === requestSequenceRef.current) {
        setLoading(false);
      }
    }
  }, [filters, pagination.current, pagination.pageSize]);

  useEffect(() => {
    void loadLogs();
  }, [loadLogs]);

  const reload = useCallback(() => {
    void Promise.all([loadLogs(), loadOptions()]);
  }, [loadLogs, loadOptions]);

  const handleSearch = useCallback(
    (values: OperationLogFilterValues) => {
      setFilters(values);
      setPagination((current) => ({
        ...current,
        current: 1,
      }));
    },
    [],
  );

  const handlePageChange = useCallback(
    (current: number, pageSize: number) => {
      setPagination((previous) => ({
        ...previous,
        current:
          previous.pageSize === pageSize ? current : 1,
        pageSize,
      }));
    },
    [],
  );

  const columns = useMemo<ProColumns<OperationLog>[]>(
    () => [
      {
        title: '日志 ID',
        dataIndex: 'id',
        width: 110,
        copyable: true,
        search: false,
      },
      {
        title: '操作',
        dataIndex: 'operateType',
        width: 190,
        search: false,
        render: (_, row) => (
          <div className="min-w-0">
            <div className="truncate font-medium text-slate-700">
              {row.operateType || '-'}
            </div>
            <div className="mt-1">
              {methodTag(row.operationMethods)}
            </div>
          </div>
        ),
      },
      {
        title: '操作人',
        dataIndex: 'operator',
        width: 180,
        search: false,
        render: (_, row) => (
          <div className="min-w-0">
            <div className="truncate text-slate-700">
              {row.operator || '-'}
            </div>
            <div className="mt-1 truncate font-mono text-xs text-slate-400">
              {row.operatorIp || '-'}
            </div>
          </div>
        ),
      },
      {
        title: '操作页面',
        dataIndex: 'operatePage',
        width: 180,
        ellipsis: true,
        search: false,
        renderText: (value) => value || '-',
      },
      {
        title: '操作对象',
        dataIndex: 'target',
        width: 260,
        search: false,
        render: (_, row) => (
          <div className="min-w-0">
            <Typography.Text
              ellipsis={{ tooltip: row.target }}
              copyable={
                row.target ? { text: row.target } : false
              }
              className="max-w-full"
            >
              {row.target || '-'}
            </Typography.Text>
            <div className="mt-1 text-xs text-slate-400">
              {row.targetType || '未分类'}
            </div>
          </div>
        ),
      },
      {
        title: '操作时间',
        dataIndex: 'createTime',
        width: 175,
        search: false,
        renderText: (value) => displayTime(value),
      },
      {
        title: '操作',
        valueType: 'option',
        width: 90,
        fixed: 'right',
        render: (_, row) => (
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => void detailRef.current?.open(row.id)}
          >
            详情
          </Button>
        ),
      },
    ],
    [],
  );

  return (
    <section
      className="box-border flex flex-col bg-slate-50/50 p-6"
      style={{
        minHeight: 'calc(100vh - 64px)',
        overflow: 'hidden',
      }}
      aria-labelledby="oplog-title"
    >
      <div className="shrink-0">
        <div className="mb-4 flex items-center gap-2">
          <FileSearchOutlined className="text-slate-500" />
          <h1
            id="oplog-title"
            className="m-0 font-semibold"
            style={{ fontSize: 18, color: '#282828' }}
          >
            操作日志
          </h1>
        </div>

        <OperationLogFilterBar
          options={options}
          loading={loading}
          onSearch={handleSearch}
          onRefresh={reload}
        />

        <SecurityQueryTable<OperationLog>
          rowKey="id"
          columns={columns}
          dataSource={logs}
          loading={loading}
          pagination={false}
          search={false}
          options={false}
          toolBarRender={false}
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

      <OperationLogDetailDrawer ref={detailRef} />
    </section>
  );
}

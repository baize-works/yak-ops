import { API_SUCCESS_CODE } from '@/services/http/response';
import { BRAND_THEME } from '@/styles/brand';
import { useLocation } from '@umijs/max';
import {
  Button,
  ConfigProvider,
  Empty,
  Input,
  Pagination,
  Select,
  Spin,
  Table,
  message,
} from 'antd';
import { RefreshCw, Search } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import ExecutionDetailDrawer from '../components/ExecutionDetailDrawer';
import { CheckResultTag, ExecutionStatusTag } from '../components/QualityStatus';
import { dataQualityTableClassName } from '../components/tableStyle';
import { qualityExecutionApi } from '../service';
import type {
  CheckResult,
  ExecutionListItem,
  ExecutionPageView,
  ExecutionStatus,
} from '../types';

const unwrap = <T,>(response: {
  code: number;
  data: T;
  message?: string;
  msg?: string;
}) => {
  if (response.code !== API_SUCCESS_CODE) {
    throw new Error(response.message || response.msg || '请求失败');
  }
  return response.data;
};

const ExecutionPage = () => {
  const location = useLocation();
  const query = useMemo(
    () => new URLSearchParams(location.search),
    [location.search],
  );
  const monitorId = Number(query.get('monitorId')) || undefined;
  const [data, setData] = useState<ExecutionPageView>({
    records: [],
    total: 0,
    current: 1,
    pageSize: 20,
  });
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState<ExecutionStatus>();
  const [result, setResult] = useState<CheckResult>();
  const [loading, setLoading] = useState(false);
  const [executionNo, setExecutionNo] = useState<string>();

  const load = useCallback(
    async (current = data.current, pageSize = data.pageSize) => {
      setLoading(true);
      try {
        setData(
          unwrap(
            await qualityExecutionApi.page({
              current,
              pageSize,
              keyword,
              monitorId,
              executionStatus: status,
              checkResult: result,
            }),
          ),
        );
      } catch (error: any) {
        message.error(error?.message || '执行记录加载失败');
      } finally {
        setLoading(false);
      }
    },
    [data.current, data.pageSize, keyword, monitorId, result, status],
  );

  useEffect(() => void load(1), [status, result, monitorId]);
  useEffect(() => {
    if (
      !data.records.some((item) =>
        ['WAITING', 'RUNNING'].includes(item.executionStatus),
      )
    ) {
      return;
    }
    const timer = window.setInterval(() => load(data.current), 3000);
    return () => window.clearInterval(timer);
  }, [data.current, data.records, load]);

  return (
    <ConfigProvider theme={BRAND_THEME}>
      <div className="flex h-[calc(100vh-64px)] flex-col overflow-hidden bg-white">
        <div className="flex h-12 shrink-0 items-center justify-between border-b border-[#e8e9ec] px-5">
          <h1 className="m-0 text-[20px] font-semibold text-[#161823]">
            运行记录
          </h1>
          <Button icon={<RefreshCw size={14} />} onClick={() => load()}>
            刷新
          </Button>
        </div>
        <div className="flex min-h-0 flex-1 flex-col px-5 py-4">
          <div className="mb-3 flex shrink-0 items-center gap-2">
            <Input
              allowClear
              variant="filled"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              onPressEnter={() => load(1)}
              prefix={<Search size={14} className="text-[#98a2b3]" />}
              placeholder="搜索执行编号、监控名称、数据对象"
              className="max-w-[420px]"
            />
            <Select
              allowClear
              variant="filled"
              value={status}
              placeholder="执行状态"
              className="w-[150px]"
              onChange={setStatus}
              options={[
                { value: 'WAITING', label: '等待中' },
                { value: 'RUNNING', label: '运行中' },
                { value: 'SUCCESS', label: '已完成' },
                { value: 'FAILED', label: '执行失败' },
              ]}
            />
            <Select
              allowClear
              variant="filled"
              value={result}
              placeholder="检查结果"
              className="w-[150px]"
              onChange={setResult}
              options={[
                { value: 'PASSED', label: '通过' },
                { value: 'NOT_PASSED', label: '未通过' },
                { value: 'ERROR', label: '异常' },
                { value: 'RUNNING', label: '运行中' },
              ]}
            />
          </div>
          <div className="min-h-0 flex-1 overflow-auto">
            <Spin spinning={loading}>
              <Table<ExecutionListItem>
                rowKey="executionNo"
                size="small"
                bordered
                pagination={false}
                scroll={{ x: 1340 }}
                className={dataQualityTableClassName()}
                dataSource={data.records}
                locale={{
                  emptyText: (
                    <Empty
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      description="暂无运行记录"
                    />
                  ),
                }}
                onRow={(record) => ({
                  onClick: () => setExecutionNo(record.executionNo),
                  className: 'cursor-pointer',
                })}
                columns={[
                  {
                    title: '执行编号 / 监控名称',
                    width: 280,
                    render: (_, record) => (
                      <div className="min-w-0 py-1">
                        <div className="truncate font-medium text-[#172033]">
                          {record.monitorName}
                        </div>
                        <div className="mt-1 truncate text-[11px] text-[#98a2b3]">
                          ID：{record.executionNo}
                        </div>
                      </div>
                    ),
                  },
                  {
                    title: '数据对象',
                    width: 270,
                    render: (_, record) => (
                      <div className="min-w-0 py-1">
                        <div className="truncate text-[#344054]">
                          {record.objectName}
                        </div>
                        <div className="mt-1 truncate text-[11px] text-[#98a2b3]">
                          数据源：{record.dataSourceName}
                        </div>
                      </div>
                    ),
                  },
                  {
                    title: '执行状态',
                    dataIndex: 'executionStatus',
                    width: 110,
                    render: (value) => <ExecutionStatusTag value={value} />,
                  },
                  {
                    title: '检查结果',
                    dataIndex: 'checkResult',
                    width: 110,
                    render: (value) => <CheckResultTag value={value} />,
                  },
                  {
                    title: '执行概况',
                    width: 230,
                    render: (_, record) => (
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                        <span className="text-[#98a2b3]">通过：</span>
                        <span className="text-[#344054]">{record.passedRules}</span>
                        <span className="text-[#98a2b3]">未通过：</span>
                        <span className="text-[#344054]">{record.failedRules}</span>
                        <span className="text-[#98a2b3]">异常：</span>
                        <span className="text-[#344054]">{record.errorRules}</span>
                        <span className="text-[#98a2b3]">耗时：</span>
                        <span className="text-[#344054]">
                          {record.durationMs === undefined
                            ? '--'
                            : `${record.durationMs} ms`}
                        </span>
                      </div>
                    ),
                  },
                  {
                    title: '触发信息',
                    width: 210,
                    render: (_, record) => (
                      <div className="space-y-1 text-xs">
                        <div className="text-[#344054]">{record.operator}</div>
                        <div className="text-[#98a2b3]">
                          {record.startedAt || record.queuedAt || '--'}
                        </div>
                      </div>
                    ),
                  },
                  {
                    title: '操作',
                    fixed: 'right',
                    width: 90,
                    render: (_, record) => (
                      <Button
                        type="link"
                        size="small"
                        onClick={(event) => {
                          event.stopPropagation();
                          setExecutionNo(record.executionNo);
                        }}
                      >
                        查看
                      </Button>
                    ),
                  },
                ]}
              />
            </Spin>
          </div>
          <div className="mt-3 flex shrink-0 justify-end">
            <Pagination
              size="small"
              current={data.current}
              pageSize={data.pageSize}
              total={data.total}
              showSizeChanger
              onChange={(current, pageSize) => load(current, pageSize)}
            />
          </div>
        </div>
        <ExecutionDetailDrawer
          executionNo={executionNo}
          open={Boolean(executionNo)}
          onClose={() => setExecutionNo(undefined)}
        />
      </div>
    </ConfigProvider>
  );
};

export default ExecutionPage;

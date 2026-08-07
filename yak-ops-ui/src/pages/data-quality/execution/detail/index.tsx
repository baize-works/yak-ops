import { API_SUCCESS_CODE } from '@/services/http/response';
import { BRAND_THEME } from '@/styles/brand';
import { history, useParams } from '@umijs/max';
import {
  Button,
  ConfigProvider,
  Descriptions,
  Empty,
  Input,
  Spin,
  Table,
  Tabs,
  Tag,
  Typography,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  FileText,
  RefreshCw,
  Search,
  ShieldCheck,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckResultTag, ExecutionStatusTag } from '../../components/QualityStatus';
import { dataQualityTableClassName } from '../../components/tableStyle';
import { qualityExecutionWorkspaceApi } from '../service';
import type {
  ExecutionLogLine,
  ExecutionLogView,
  ExecutionWorkspaceListItem,
  ExecutionWorkspaceRuleView,
  ExecutionWorkspaceView,
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

const formatTime = (value?: string) =>
  value ? dayjs(value).format('YYYY-MM-DD HH:mm:ss') : '--';

const formatDuration = (value?: number) =>
  value === undefined || value === null ? '--' : `${value} ms`;

const triggerLabel = (value?: ExecutionWorkspaceView['triggerType']) =>
  value === 'SCHEDULE' ? '调度触发' : '手动触发';

const scopeLabel = (value: ExecutionWorkspaceRuleView['scope']) =>
  value === 'TABLE' ? '表级' : '字段级';

const logLevelClass: Record<ExecutionLogLine['level'], string> = {
  INFO: 'text-[#245bdb]',
  WARN: 'text-[#b54708]',
  ERROR: 'text-[#d92d20]',
};

const ExecutionDetailPage = () => {
  const { executionNo = '' } = useParams<{ executionNo: string }>();
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [detail, setDetail] = useState<ExecutionWorkspaceView>();
  const [logs, setLogs] = useState<ExecutionLogView>();
  const [historyRecords, setHistoryRecords] = useState<
    ExecutionWorkspaceListItem[]
  >([]);
  const [historyKeyword, setHistoryKeyword] = useState('');
  const [historyCollapsed, setHistoryCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState('CURRENT');

  const loadDetail = useCallback(async () => {
    if (!executionNo) return;
    setLoading(true);
    try {
      const [detailResponse, logsResponse] = await Promise.all([
        qualityExecutionWorkspaceApi.detail(executionNo),
        qualityExecutionWorkspaceApi.logs(executionNo),
      ]);
      setDetail(unwrap(detailResponse));
      setLogs(unwrap(logsResponse));
    } catch (error: any) {
      message.error(error?.message || '执行详情加载失败');
    } finally {
      setLoading(false);
    }
  }, [executionNo]);

  useEffect(() => {
    void loadDetail();
  }, [loadDetail]);

  useEffect(() => {
    if (!detail?.monitorId) return;
    setHistoryLoading(true);
    qualityExecutionWorkspaceApi
      .page({ current: 1, pageSize: 50, monitorId: detail.monitorId })
      .then((response) => setHistoryRecords(unwrap(response).records))
      .catch((error) =>
        message.error(error?.message || '历史运行记录加载失败'),
      )
      .finally(() => setHistoryLoading(false));
  }, [detail?.monitorId]);

  useEffect(() => {
    if (!detail || !['WAITING', 'RUNNING'].includes(detail.executionStatus)) {
      return;
    }
    const timer = window.setInterval(() => void loadDetail(), 3000);
    return () => window.clearInterval(timer);
  }, [detail, loadDetail]);

  const filteredHistory = useMemo(() => {
    const keyword = historyKeyword.trim().toLowerCase();
    if (!keyword) return historyRecords;
    return historyRecords.filter(
      (record) =>
        record.executionNo.toLowerCase().includes(keyword) ||
        record.monitorName.toLowerCase().includes(keyword),
    );
  }, [historyKeyword, historyRecords]);

  const issueRules = useMemo(
    () =>
      detail?.rules.filter((rule) =>
        ['NOT_PASSED', 'ERROR'].includes(rule.checkResult),
      ) || [],
    [detail?.rules],
  );

  const ruleColumns = useMemo<ColumnsType<ExecutionWorkspaceRuleView>>(
    () => [
      {
        title: '规则名称 / 模板',
        width: 250,
        render: (_, record) => (
          <div className="min-w-0 py-0.5">
            <div className="truncate font-medium text-[#172033]">
              {record.ruleName}
            </div>
            <div className="mt-1 truncate text-[11px] text-[#98a2b3]">
              {record.templateCode}
            </div>
          </div>
        ),
      },
      {
        title: '关联范围',
        dataIndex: 'scope',
        width: 100,
        render: (value) => (
          <Tag className="!m-0 !border-0 !bg-[#fff0f3] !text-[#fe2c55]">
            {scopeLabel(value)}
          </Tag>
        ),
      },
      { title: '质量维度', dataIndex: 'dimension', width: 110 },
      {
        title: '检查字段',
        dataIndex: 'columnName',
        width: 140,
        render: (value) => value || '整表',
      },
      {
        title: '检查结果',
        dataIndex: 'checkResult',
        width: 110,
        render: (value) => <CheckResultTag value={value} />,
      },
      {
        title: '实际值 / 期望值',
        width: 210,
        render: (_, record) => (
          <div className="space-y-1 text-xs">
            <div>实际：{record.metricValue || '--'}</div>
            <div className="text-[#98a2b3]">
              期望：{record.expectedValue || '--'}
            </div>
          </div>
        ),
      },
      {
        title: '耗时',
        dataIndex: 'durationMs',
        width: 100,
        render: formatDuration,
      },
    ],
    [],
  );

  const historyColumns = useMemo<ColumnsType<ExecutionWorkspaceListItem>>(
    () => [
      {
        title: '校验状态',
        dataIndex: 'executionStatus',
        width: 110,
        render: (value) => <ExecutionStatusTag value={value} />,
      },
      {
        title: '运行时间',
        width: 190,
        render: (_, record) => formatTime(record.startedAt || record.queuedAt),
      },
      {
        title: '质量结果',
        dataIndex: 'checkResult',
        width: 110,
        render: (value) => <CheckResultTag value={value} />,
      },
      {
        title: '规则概况',
        width: 260,
        render: (_, record) =>
          `通过 ${record.passedRules} / 未通过 ${record.failedRules} / 异常 ${record.errorRules}`,
      },
      {
        title: '问题数量',
        width: 110,
        render: (_, record) => record.failedRules + record.errorRules,
      },
      {
        title: '操作',
        width: 90,
        render: (_, record) => (
          <Button
            type="link"
            size="small"
            onClick={() =>
              history.push(`/data-quality/execution/${record.executionNo}`)
            }
          >
            查看
          </Button>
        ),
      },
    ],
    [],
  );

  const renderRuleTable = (
    records: ExecutionWorkspaceRuleView[],
    issueMode = false,
  ) => (
    <Table<ExecutionWorkspaceRuleView>
      rowKey="id"
      size="small"
      bordered
      pagination={false}
      scroll={{ x: 1080 }}
      className={dataQualityTableClassName()}
      dataSource={records}
      columns={ruleColumns}
      expandable={{
        expandedRowRender: (record) => (
          <div className="space-y-3 px-2 py-1">
            {(record.errorMessage || issueMode) && (
              <Typography.Text type="danger">
                {record.errorMessage || '质量指标未满足预期阈值'}
              </Typography.Text>
            )}
            <Typography.Paragraph
              copyable
              className="!mb-0 whitespace-pre-wrap rounded bg-[#f8f9fb] p-3 font-mono text-xs"
            >
              {record.executedSql || '未生成执行 SQL'}
            </Typography.Paragraph>
          </div>
        ),
      }}
    />
  );

  if (!detail && !loading) {
    return (
      <ConfigProvider theme={BRAND_THEME}>
        <div className="flex h-[calc(100vh-64px)] items-center justify-center bg-white">
          <Empty description="执行记录不存在" />
        </div>
      </ConfigProvider>
    );
  }

  return (
    <ConfigProvider theme={BRAND_THEME}>
      <Spin spinning={loading && !detail}>
        <div className="flex h-[calc(100vh-64px)] min-h-[680px] flex-col overflow-hidden bg-white">
          <header className="shrink-0 border-b border-[#e8e9ec] px-4 py-3">
            <button
              type="button"
              className="mb-2 flex cursor-pointer items-center gap-1 border-0 bg-transparent p-0 text-xs text-[#667085] hover:text-[#fe2c55]"
              onClick={() => history.push('/data-quality/execution')}
            >
              <ArrowLeft size={14} />
              返回运行记录
            </button>

            <div className="flex items-start justify-between gap-6">
              <div className="flex min-w-0 items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[#fff0f3] text-[#fe2c55]">
                  <ShieldCheck size={24} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h1 className="m-0 truncate text-[18px] font-semibold text-[#161823]">
                      {detail?.monitorName || executionNo}
                    </h1>
                    {detail && <ExecutionStatusTag value={detail.executionStatus} />}
                    {detail && <CheckResultTag value={detail.checkResult} />}
                  </div>
                  <div className="mt-1 text-xs text-[#98a2b3]">
                    执行编号：{detail?.executionNo || executionNo}
                  </div>
                </div>
              </div>
              <Button icon={<RefreshCw size={14} />} onClick={loadDetail}>
                刷新
              </Button>
            </div>

            {detail && (
              <div className="mt-3 grid grid-cols-4 gap-x-8 gap-y-1 text-xs">
                <div>运行时间：{formatTime(detail.startedAt || detail.queuedAt)}</div>
                <div>数据源：{detail.dataSourceName}</div>
                <div>触发方式：{triggerLabel(detail.triggerType)}</div>
                <div>触发人：{detail.operator || 'system'}</div>
                <div className="col-span-2 truncate">监控对象：{detail.objectName}</div>
                <div>规则数量：{detail.totalRules}</div>
                <div>执行耗时：{formatDuration(detail.durationMs)}</div>
              </div>
            )}
          </header>

          <div className="flex min-h-0 flex-1 overflow-hidden">
            <aside
              className="shrink-0 overflow-hidden border-r border-[#e8e9ec] bg-white transition-[width] duration-200"
              style={{ width: historyCollapsed ? 0 : 320 }}
            >
              <div className="flex h-full w-[320px] flex-col">
                <div className="shrink-0 border-b border-[#eceef0] p-3">
                  <Input
                    allowClear
                    variant="filled"
                    value={historyKeyword}
                    onChange={(event) => setHistoryKeyword(event.target.value)}
                    prefix={<Search size={14} className="text-[#98a2b3]" />}
                    placeholder="搜索执行编号"
                  />
                </div>
                <Spin spinning={historyLoading}>
                  <div className="h-[calc(100vh-270px)] overflow-y-auto">
                    {filteredHistory.length ? (
                      filteredHistory.map((record) => {
                        const active = record.executionNo === executionNo;
                        return (
                          <button
                            key={record.executionNo}
                            type="button"
                            className={`block w-full cursor-pointer border-0 border-b border-[#f0f2f5] px-3 py-3 text-left ${
                              active
                                ? 'border-r-2 border-r-[#fe2c55] bg-[#fff7f8]'
                                : 'bg-white hover:bg-[#fafbfc]'
                            }`}
                            onClick={() =>
                              history.push(
                                `/data-quality/execution/${record.executionNo}`,
                              )
                            }
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="truncate text-[11px] text-[#98a2b3]">
                                {record.executionNo}
                              </span>
                              <ExecutionStatusTag value={record.executionStatus} />
                            </div>
                            <div className="mt-1 truncate text-[13px] font-medium text-[#172033]">
                              {record.monitorName}
                            </div>
                            <div className="mt-1 text-xs text-[#667085]">
                              {formatTime(record.startedAt || record.queuedAt)}
                            </div>
                            <div className="mt-1 text-xs text-[#98a2b3]">
                              问题 {record.failedRules + record.errorRules} ·{' '}
                              {formatDuration(record.durationMs)}
                            </div>
                          </button>
                        );
                      })
                    ) : (
                      <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description="暂无历史运行记录"
                        className="mt-16"
                      />
                    )}
                  </div>
                </Spin>
              </div>
            </aside>

            <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
              <button
                type="button"
                className="absolute left-0 top-1/2 z-20 flex h-8 w-4 -translate-y-1/2 cursor-pointer items-center justify-center rounded-r border border-l-0 border-[#dfe1e5] bg-white text-[#7b808a]"
                onClick={() => setHistoryCollapsed(!historyCollapsed)}
              >
                {historyCollapsed ? (
                  <ChevronRight size={13} />
                ) : (
                  <ChevronLeft size={13} />
                )}
              </button>

              <Tabs
                activeKey={activeTab}
                onChange={setActiveTab}
                className="min-h-0 flex-1 [&_.ant-tabs-content-holder]:min-h-0 [&_.ant-tabs-content-holder]:overflow-auto [&_.ant-tabs-nav]:!mb-0 [&_.ant-tabs-nav]:!px-4"
                items={[
                  {
                    key: 'CURRENT',
                    label: '本次运行记录',
                    children: detail ? (
                      <div>
                        <section className="border-b border-[#eceef0] px-5 py-4">
                          <h2 className="m-0 mb-3 text-[15px] font-semibold text-[#161823]">
                            监控信息
                          </h2>
                          <Descriptions
                            size="small"
                            column={2}
                            items={[
                              { key: 'name', label: '监控名称', children: detail.monitorName },
                              { key: 'id', label: '监控 ID', children: detail.monitorId },
                              { key: 'object', label: '数据范围', children: detail.objectName },
                              { key: 'rules', label: '规则数量', children: detail.totalRules },
                              { key: 'mode', label: '比较方式', children: '按规则阈值逐项比较' },
                              { key: 'result', label: '质量结果', children: <CheckResultTag value={detail.checkResult} /> },
                            ]}
                          />
                        </section>
                        <section className="border-b border-[#eceef0] px-5 py-4">
                          <h2 className="m-0 mb-3 text-[15px] font-semibold text-[#161823]">
                            检测任务执行信息
                          </h2>
                          <Descriptions
                            size="small"
                            column={2}
                            items={[
                              { key: 'trigger', label: '检测触发方式', children: triggerLabel(detail.triggerType) },
                              { key: 'queued', label: '入队时间', children: formatTime(detail.queuedAt) },
                              { key: 'start', label: '实际开始时间', children: formatTime(detail.startedAt) },
                              { key: 'finish', label: '实际结束时间', children: formatTime(detail.finishedAt) },
                            ]}
                          />
                        </section>
                        <section className="px-5 py-4">
                          <h2 className="m-0 mb-3 text-[15px] font-semibold text-[#161823]">
                            质量采集及比较状态结果
                          </h2>
                          {renderRuleTable(detail.rules)}
                        </section>
                      </div>
                    ) : null,
                  },
                  {
                    key: 'HISTORY',
                    label: '历史运行记录',
                    children: (
                      <div className="p-4">
                        <Table<ExecutionWorkspaceListItem>
                          rowKey="executionNo"
                          size="small"
                          bordered
                          loading={historyLoading}
                          pagination={false}
                          className={dataQualityTableClassName()}
                          dataSource={historyRecords}
                          columns={historyColumns}
                        />
                      </div>
                    ),
                  },
                  {
                    key: 'ISSUES',
                    label: `问题数据处理${issueRules.length ? ` (${issueRules.length})` : ''}`,
                    children: (
                      <div className="p-4">
                        {issueRules.length ? (
                          renderRuleTable(issueRules, true)
                        ) : (
                          <Empty
                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                            description="本次执行未产生待处理问题数据"
                          />
                        )}
                      </div>
                    ),
                  },
                  {
                    key: 'LOGS',
                    label: '原始日志',
                    children: (
                      <div className="min-h-[420px] bg-[#fbfcfe] p-4 font-mono text-xs leading-6">
                        {logs?.lines.length ? (
                          logs.lines.map((line, index) => (
                            <div
                              key={`${line.timestamp}-${line.stage}-${index}`}
                              className="flex gap-3 border-b border-[#f0f2f5] py-1"
                            >
                              <span className="shrink-0 text-[#98a2b3]">
                                {formatTime(line.timestamp)}
                              </span>
                              <span className={`w-12 shrink-0 ${logLevelClass[line.level]}`}>
                                {line.level}
                              </span>
                              <span className="w-20 shrink-0 text-[#667085]">
                                [{line.stage}]
                              </span>
                              <span className="min-w-0 whitespace-pre-wrap break-all text-[#344054]">
                                {line.message}
                              </span>
                            </div>
                          ))
                        ) : (
                          <Empty
                            image={<FileText size={48} className="text-[#d0d5dd]" />}
                            description="暂无原始日志"
                          />
                        )}
                      </div>
                    ),
                  },
                ]}
              />
            </div>
          </div>
        </div>
      </Spin>
    </ConfigProvider>
  );
};

export default ExecutionDetailPage;

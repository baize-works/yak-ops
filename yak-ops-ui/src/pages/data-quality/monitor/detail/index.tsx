import { API_SUCCESS_CODE } from '@/services/http/response';
import { BRAND_THEME } from '@/styles/brand';
import { history, useParams } from '@umijs/max';
import {
  Button,
  ConfigProvider,
  Descriptions,
  Empty,
  Modal,
  Pagination,
  Spin,
  Table,
  Tag,
  message,
} from 'antd';
import { ArrowLeft, Pencil, Play, RefreshCw, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import ExecutionDetailDrawer from '../../components/ExecutionDetailDrawer';
import { CheckResultTag, ExecutionStatusTag } from '../../components/QualityStatus';
import { qualityExecutionApi, qualityMonitorApi } from '../../service';
import type { ExecutionListItem, ExecutionPageView, MonitorView, RuleView } from '../../types';

const unwrap = <T,>(response: { code: number; data: T; message?: string; msg?: string }) => {
  if (response.code !== API_SUCCESS_CODE) {
    throw new Error(response.message || response.msg || '请求失败');
  }
  return response.data;
};

const MonitorDetailPage = () => {
  const params = useParams<{ id: string }>();
  const [monitor, setMonitor] = useState<MonitorView>();
  const [executions, setExecutions] = useState<ExecutionPageView>({ records: [], total: 0, current: 1, pageSize: 10 });
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [executionNo, setExecutionNo] = useState<string>();

  const load = useCallback(async (current = executions.current) => {
    if (!params.id) return;
    setLoading(true);
    try {
      const [monitorResponse, executionResponse] = await Promise.all([
        qualityMonitorApi.detail(params.id),
        qualityExecutionApi.page({ current, pageSize: executions.pageSize, monitorId: Number(params.id) }),
      ]);
      setMonitor(unwrap(monitorResponse));
      setExecutions(unwrap(executionResponse));
    } catch (error: any) {
      message.error(error?.message || '质量监控加载失败');
    } finally {
      setLoading(false);
    }
  }, [executions.current, executions.pageSize, params.id]);

  useEffect(() => void load(1), []);
  useEffect(() => {
    const active = executions.records.some((item) => item.executionStatus === 'WAITING' || item.executionStatus === 'RUNNING');
    if (!active) return;
    const timer = window.setInterval(() => load(executions.current), 2500);
    return () => window.clearInterval(timer);
  }, [executions.current, executions.records, load]);

  const run = async () => {
    if (!params.id) return;
    setRunning(true);
    try {
      const result = unwrap(await qualityMonitorApi.run(params.id));
      message.success('质量检查已提交');
      setExecutionNo(result.executionNo);
      load(1);
    } catch (error: any) {
      message.error(error?.message || '运行失败');
    } finally {
      setRunning(false);
    }
  };

  const remove = () => {
    Modal.confirm({
      title: '删除质量监控？',
      content: '删除后将保留历史执行记录，但不再允许继续运行。',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          unwrap(await qualityMonitorApi.remove(params.id));
          message.success('质量监控已删除');
          history.push('/data-quality/table-config');
        } catch (error: any) {
          message.error(error?.message || '删除失败');
        }
      },
    });
  };

  return (
    <ConfigProvider theme={BRAND_THEME}>
      <div className="min-h-[calc(100vh-64px)] bg-white">
        <div className="flex h-14 items-center justify-between border-b border-[#e8e9ec] px-5">
          <div className="flex items-center gap-3">
            <Button type="text" icon={<ArrowLeft size={17} />} onClick={() => history.push('/data-quality/table-config')} />
            <h1 className="m-0 text-[20px] font-semibold text-[#161823]">质量监控详情</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button icon={<RefreshCw size={14} />} onClick={() => load()}>刷新</Button>
            <Button icon={<Pencil size={14} />} onClick={() => history.push(`/data-quality/monitor/${params.id}/edit`)}>编辑</Button>
            <Button danger icon={<Trash2 size={14} />} onClick={remove}>删除</Button>
            <Button type="primary" loading={running} icon={<Play size={14} />} onClick={run}>手动运行</Button>
          </div>
        </div>

        <Spin spinning={loading}>
          <div className="mx-auto max-w-[1500px] px-6 py-5">
            {monitor && (
              <>
                <Descriptions bordered size="small" column={3}>
                  <Descriptions.Item label="监控名称">{monitor.name}</Descriptions.Item>
                  <Descriptions.Item label="监控对象">
                    {[monitor.databaseName, monitor.schemaName, monitor.tableName].filter(Boolean).join('.')}
                  </Descriptions.Item>
                  <Descriptions.Item label="最近结果"><CheckResultTag value={monitor.lastResult} /></Descriptions.Item>
                  <Descriptions.Item label="数据源">{monitor.dataSourceName}</Descriptions.Item>
                  <Descriptions.Item label="负责人">{monitor.owner}</Descriptions.Item>
                  <Descriptions.Item label="启用状态"><Tag color={monitor.enabled ? 'processing' : undefined}>{monitor.enabled ? '启用' : '停用'}</Tag></Descriptions.Item>
                  <Descriptions.Item label="数据范围" span={3}>{monitor.whereClause || '全表'}</Descriptions.Item>
                  <Descriptions.Item label="描述" span={3}>{monitor.description || '--'}</Descriptions.Item>
                </Descriptions>

                <section className="mt-6">
                  <h2 className="mb-3 text-base font-semibold text-[#161823]">质量规则</h2>
                  <Table<RuleView>
                    rowKey="id"
                    size="small"
                    pagination={false}
                    dataSource={monitor.rules}
                    columns={[
                      { title: '规则名称', dataIndex: 'name' },
                      { title: '质量维度', dataIndex: 'dimension', width: 110 },
                      { title: '范围', dataIndex: 'scope', width: 90, render: (v) => (v === 'TABLE' ? '表级' : '字段级') },
                      { title: '字段', dataIndex: 'columnName', width: 150, render: (v) => v || '--' },
                      {
                        title: '规则参数',
                        width: 260,
                        render: (_, rule) => {
                          if (rule.ruleType === 'COLUMN_RANGE') return `${rule.threshold} ~ ${rule.thresholdEnd}`;
                          if (rule.ruleType === 'COLUMN_ENUM') return (rule.enumValues || []).join(', ');
                          if (rule.ruleType === 'CUSTOM_SQL') return '自定义 SQL';
                          return `${rule.operator} ${rule.threshold}`;
                        },
                      },
                      { title: '状态', dataIndex: 'enabled', width: 90, render: (v) => (v ? '启用' : '停用') },
                    ]}
                  />
                </section>
              </>
            )}

            <section className="mt-6">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="m-0 text-base font-semibold text-[#161823]">运行记录</h2>
                <Button type="link" onClick={() => history.push(`/data-quality/execution?monitorId=${params.id}`)}>查看全部</Button>
              </div>
              <Table<ExecutionListItem>
                rowKey="executionNo"
                size="small"
                pagination={false}
                dataSource={executions.records}
                locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无运行记录" /> }}
                onRow={(record) => ({ onClick: () => setExecutionNo(record.executionNo), className: 'cursor-pointer' })}
                columns={[
                  { title: '执行编号', dataIndex: 'executionNo', width: 220 },
                  { title: '执行状态', dataIndex: 'executionStatus', width: 110, render: (v) => <ExecutionStatusTag value={v} /> },
                  { title: '检查结果', dataIndex: 'checkResult', width: 110, render: (v) => <CheckResultTag value={v} /> },
                  { title: '规则统计', width: 210, render: (_, r) => `${r.passedRules} 通过 / ${r.failedRules} 未通过 / ${r.errorRules} 异常` },
                  { title: '触发人', dataIndex: 'operator', width: 130 },
                  { title: '开始时间', dataIndex: 'startedAt', width: 180, render: (v) => v || '--' },
                  { title: '耗时', dataIndex: 'durationMs', width: 100, render: (v) => (v === undefined ? '--' : `${v} ms`) },
                ]}
              />
              <div className="mt-3 flex justify-end">
                <Pagination
                  size="small"
                  current={executions.current}
                  pageSize={executions.pageSize}
                  total={executions.total}
                  showSizeChanger
                  onChange={(current, pageSize) => {
                    setExecutions((value) => ({ ...value, current, pageSize }));
                    load(current);
                  }}
                />
              </div>
            </section>
          </div>
        </Spin>

        <ExecutionDetailDrawer executionNo={executionNo} open={Boolean(executionNo)} onClose={() => setExecutionNo(undefined)} />
      </div>
    </ConfigProvider>
  );
};

export default MonitorDetailPage;

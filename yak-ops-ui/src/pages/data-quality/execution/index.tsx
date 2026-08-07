import { API_SUCCESS_CODE } from '@/services/http/response';
import { BRAND_THEME } from '@/styles/brand';
import { history } from '@umijs/max';
import {
  Button,
  ConfigProvider,
  DatePicker,
  Input,
  Pagination,
  Select,
  message,
} from 'antd';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { RefreshCw, RotateCcw, Search } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import DataSourceTreePane from '../table-config/components/DataSourceTreePane';
import { useDataSourceTree } from '../table-config/hooks/useDataSourceTree';
import type {
  CheckResult,
  ExecutionStatus,
  RuleScope,
  TriggerType,
} from '../types';
import ExecutionRecordTable, {
  type ExecutionViewMode,
} from './components/ExecutionRecordTable';
import { qualityExecutionWorkspaceApi } from './service';
import type {
  ExecutionWorkspaceListItem,
  RuleExecutionWorkspaceListItem,
} from './types';

const { RangePicker } = DatePicker;

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

const DIMENSION_OPTIONS = [
  '完整性',
  '唯一性',
  '有效性',
  '准确性',
  '自定义',
].map((value) => ({ value, label: value }));

const ExecutionPage = () => {
  const {
    dataSourceId,
    selectedDataSource,
    selectedNodeKey,
    treeData,
    treeLoading,
    leftWidth,
    collapsed,
    setCollapsed,
    loadSourceTree,
    selectNode,
    startResize,
  } = useDataSourceTree();

  const [executionRecords, setExecutionRecords] = useState<
    ExecutionWorkspaceListItem[]
  >([]);
  const [ruleRecords, setRuleRecords] = useState<
    RuleExecutionWorkspaceListItem[]
  >([]);
  const [total, setTotal] = useState(0);
  const [current, setCurrent] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(false);
  const [keywordDraft, setKeywordDraft] = useState('');
  const [objectKeywordDraft, setObjectKeywordDraft] = useState('');
  const [keyword, setKeyword] = useState('');
  const [objectKeyword, setObjectKeyword] = useState('');
  const [executionStatus, setExecutionStatus] = useState<ExecutionStatus>();
  const [checkResult, setCheckResult] = useState<CheckResult>();
  const [triggerType, setTriggerType] = useState<TriggerType>();
  const [hasIssues, setHasIssues] = useState<boolean>();
  const [dimension, setDimension] = useState<string>();
  const [scope, setScope] = useState<RuleScope>();
  const [viewMode, setViewMode] = useState<ExecutionViewMode>('RULE');
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>([
    dayjs().subtract(7, 'day'),
    dayjs(),
  ]);

  useEffect(() => {
    void loadSourceTree();
  }, [loadSourceTree]);

  const load = useCallback(
    async (requestedCurrent = 1, requestedPageSize = pageSize) => {
      if (!dataSourceId) {
        setExecutionRecords([]);
        setRuleRecords([]);
        setTotal(0);
        setCurrent(1);
        return;
      }

      setLoading(true);
      try {
        const query = {
          current: requestedCurrent,
          pageSize: requestedPageSize,
          dataSourceId,
          keyword: keyword || undefined,
          objectKeyword: objectKeyword || undefined,
          executionStatus,
          checkResult,
          triggerType,
          hasIssues,
          dimension,
          scope,
          queuedAfter: dateRange?.[0]
            ?.startOf('day')
            .format('YYYY-MM-DD HH:mm:ss'),
          queuedBefore: dateRange?.[1]
            ?.endOf('day')
            .format('YYYY-MM-DD HH:mm:ss'),
        };

        if (viewMode === 'RULE') {
          const result = unwrap(
            await qualityExecutionWorkspaceApi.rulePage(query),
          );
          setRuleRecords(result.records);
          setExecutionRecords([]);
          setTotal(result.total);
          setCurrent(result.current);
          setPageSize(result.pageSize);
        } else {
          const result = unwrap(await qualityExecutionWorkspaceApi.page(query));
          setExecutionRecords(result.records);
          setRuleRecords([]);
          setTotal(result.total);
          setCurrent(result.current);
          setPageSize(result.pageSize);
        }
      } catch (error: any) {
        message.error(error?.message || '运行记录加载失败');
      } finally {
        setLoading(false);
      }
    },
    [
      checkResult,
      dataSourceId,
      dateRange,
      dimension,
      executionStatus,
      hasIssues,
      keyword,
      objectKeyword,
      pageSize,
      scope,
      triggerType,
      viewMode,
    ],
  );

  useEffect(() => {
    void load(1);
  }, [load]);

  useEffect(() => {
    const records = viewMode === 'RULE' ? ruleRecords : executionRecords;
    if (
      !records.some((record) =>
        ['WAITING', 'RUNNING'].includes(record.executionStatus),
      )
    ) {
      return;
    }
    const timer = window.setInterval(
      () => void load(current, pageSize),
      3000,
    );
    return () => window.clearInterval(timer);
  }, [current, executionRecords, load, pageSize, ruleRecords, viewMode]);

  const appliedFilterCount = useMemo(
    () =>
      [
        keyword,
        objectKeyword,
        executionStatus,
        checkResult,
        triggerType,
        dimension,
        scope,
        hasIssues === undefined ? undefined : String(hasIssues),
      ].filter(Boolean).length,
    [
      checkResult,
      dimension,
      executionStatus,
      hasIssues,
      keyword,
      objectKeyword,
      scope,
      triggerType,
    ],
  );

  const applySearch = () => {
    setKeyword(keywordDraft.trim());
    setObjectKeyword(objectKeywordDraft.trim());
  };

  const reset = () => {
    setKeywordDraft('');
    setObjectKeywordDraft('');
    setKeyword('');
    setObjectKeyword('');
    setExecutionStatus(undefined);
    setCheckResult(undefined);
    setTriggerType(undefined);
    setHasIssues(undefined);
    setDimension(undefined);
    setScope(undefined);
    setDateRange([dayjs().subtract(7, 'day'), dayjs()]);
  };

  const openExecution = (executionNo: string) => {
    history.push(`/data-quality/execution/${executionNo}`);
  };

  return (
    <ConfigProvider theme={BRAND_THEME}>
      <div className="flex h-[calc(100vh-64px)] min-h-[640px] flex-col overflow-hidden bg-white">
        <header className="shrink-0 border-b border-[#e8e9ec] px-5 py-3">
          <h1 className="m-0 text-[22px] font-semibold leading-8 text-[#161823]">
            运行记录
          </h1>
          <p className="m-0 mt-0.5 text-xs text-[#98a2b3]">
            以质量监控粒度和规则粒度，查询和展示质量规则的运行结果。
          </p>
        </header>

        <div className="flex min-h-0 flex-1 overflow-hidden">
          <DataSourceTreePane
            treeData={treeData}
            treeLoading={treeLoading}
            selectedNodeKey={selectedNodeKey}
            leftWidth={leftWidth}
            collapsed={collapsed}
            onSelect={(keys) => {
              const key = keys[0];
              if (key) selectNode(String(key));
            }}
            onResizeStart={startResize}
            onCollapsedChange={setCollapsed}
          />

          <main className="flex min-w-0 flex-1 flex-col overflow-hidden px-4 py-3">
            <div className="shrink-0 border-b border-[#eceef0] pb-2">
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  allowClear
                  variant="filled"
                  value={keywordDraft}
                  onChange={(event) => setKeywordDraft(event.target.value)}
                  onPressEnter={applySearch}
                  prefix={<Search size={14} className="text-[#98a2b3]" />}
                  placeholder="请输入规则或监控名称"
                  className="w-[210px]"
                />
                <Input
                  allowClear
                  variant="filled"
                  value={objectKeywordDraft}
                  onChange={(event) => setObjectKeywordDraft(event.target.value)}
                  onPressEnter={applySearch}
                  prefix={<Search size={14} className="text-[#98a2b3]" />}
                  placeholder="请输入表名或数据对象"
                  className="w-[250px]"
                />
                <RangePicker
                  variant="filled"
                  value={dateRange}
                  showTime={false}
                  format="YYYY-MM-DD"
                  className="w-[280px]"
                  onChange={(value) => {
                    if (value?.[0] && value?.[1]) {
                      setDateRange([value[0], value[1]]);
                    } else {
                      setDateRange(null);
                    }
                  }}
                />
                <Select
                  allowClear
                  variant="filled"
                  value={checkResult}
                  placeholder="质量结果"
                  className="w-[126px]"
                  onChange={setCheckResult}
                  options={[
                    { value: 'PASSED', label: '通过' },
                    { value: 'NOT_PASSED', label: '未通过' },
                    { value: 'ERROR', label: '异常' },
                    { value: 'RUNNING', label: '运行中' },
                  ]}
                />
                <Select
                  allowClear
                  variant="filled"
                  value={hasIssues}
                  placeholder="问题数量"
                  className="w-[126px]"
                  onChange={setHasIssues}
                  options={[
                    { value: true, label: '存在问题' },
                    { value: false, label: '无问题' },
                  ]}
                />
                <Button type="primary" onClick={applySearch}>
                  查询
                </Button>
                <Button icon={<RotateCcw size={14} />} onClick={reset}>
                  重置{appliedFilterCount ? ` (${appliedFilterCount})` : ''}
                </Button>
              </div>

              <div className="mt-2 flex items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Select
                    allowClear
                    variant="filled"
                    value={dimension}
                    placeholder="质量维度"
                    className="w-[126px]"
                    onChange={setDimension}
                    options={DIMENSION_OPTIONS}
                  />
                  <Select
                    allowClear
                    variant="filled"
                    value={scope}
                    placeholder="关联范围"
                    className="w-[126px]"
                    onChange={setScope}
                    options={[
                      { value: 'TABLE', label: '表级' },
                      { value: 'COLUMN', label: '字段级' },
                    ]}
                  />
                  <Select
                    allowClear
                    variant="filled"
                    value={executionStatus}
                    placeholder="校验状态"
                    className="w-[126px]"
                    onChange={setExecutionStatus}
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
                    value={triggerType}
                    placeholder="触发方式"
                    className="w-[126px]"
                    onChange={setTriggerType}
                    options={[
                      { value: 'MANUAL', label: '手动触发' },
                      { value: 'SCHEDULE', label: '调度触发' },
                    ]}
                  />
                  <span className="text-xs text-[#98a2b3]">
                    数据源类型：{selectedDataSource?.dbType || '--'}
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Select
                    variant="filled"
                    value={viewMode}
                    className="w-[126px]"
                    onChange={setViewMode}
                    options={[
                      { value: 'RULE', label: '规则视角' },
                      { value: 'EXECUTION', label: '监控视角' },
                    ]}
                  />
                  <Button
                    icon={<RefreshCw size={14} />}
                    onClick={() => void load(current, pageSize)}
                  />
                </div>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-auto pt-2">
              <ExecutionRecordTable
                executionRecords={executionRecords}
                ruleRecords={ruleRecords}
                loading={loading}
                mode={viewMode}
                onOpenExecution={openExecution}
                onOpenMonitor={(monitorId) =>
                  history.push(`/data-quality/monitor/${monitorId}`)
                }
              />
            </div>

            <div className="flex shrink-0 justify-end border-t border-[#f0f2f5] pt-3">
              <Pagination
                size="small"
                current={current}
                pageSize={pageSize}
                total={total}
                showSizeChanger
                showTotal={(value) => `共 ${value} 条`}
                onChange={(nextCurrent, nextPageSize) => {
                  if (nextPageSize !== pageSize) {
                    setPageSize(nextPageSize);
                    return;
                  }
                  void load(nextCurrent, nextPageSize);
                }}
              />
            </div>
          </main>
        </div>
      </div>
    </ConfigProvider>
  );
};

export default ExecutionPage;

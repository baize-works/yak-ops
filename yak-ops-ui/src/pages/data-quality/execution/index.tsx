import { API_SUCCESS_CODE } from '@/services/http/response';
import { BRAND_THEME } from '@/styles/brand';
import { history } from '@umijs/max';
import {
  Button,
  ConfigProvider,
  DatePicker,
  Input,
  Pagination,
  Popover,
  Segmented,
  Select,
  message,
} from 'antd';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { ListFilter, RefreshCw, Search } from 'lucide-react';
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

  const [executionStatusDraft, setExecutionStatusDraft] =
    useState<ExecutionStatus>();
  const [checkResultDraft, setCheckResultDraft] = useState<CheckResult>();
  const [triggerTypeDraft, setTriggerTypeDraft] = useState<TriggerType>();
  const [hasIssuesDraft, setHasIssuesDraft] = useState<boolean>();
  const [dimensionDraft, setDimensionDraft] = useState<string>();
  const [scopeDraft, setScopeDraft] = useState<RuleScope>();
  const [advancedOpen, setAdvancedOpen] = useState(false);

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

  const advancedFilterCount = useMemo(
    () =>
      [
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
      objectKeyword,
      scope,
      triggerType,
    ],
  );

  const applySearch = () => {
    setKeyword(keywordDraft.trim());
  };

  const applyAdvancedSearch = () => {
    setObjectKeyword(objectKeywordDraft.trim());
    setExecutionStatus(executionStatusDraft);
    setCheckResult(checkResultDraft);
    setTriggerType(triggerTypeDraft);
    setHasIssues(hasIssuesDraft);
    setDimension(dimensionDraft);
    setScope(scopeDraft);
    setAdvancedOpen(false);
  };

  const reset = () => {
    setKeywordDraft('');
    setObjectKeywordDraft('');
    setKeyword('');
    setObjectKeyword('');

    setExecutionStatus(undefined);
    setExecutionStatusDraft(undefined);

    setCheckResult(undefined);
    setCheckResultDraft(undefined);

    setTriggerType(undefined);
    setTriggerTypeDraft(undefined);

    setHasIssues(undefined);
    setHasIssuesDraft(undefined);

    setDimension(undefined);
    setDimensionDraft(undefined);

    setScope(undefined);
    setScopeDraft(undefined);

    setDateRange([dayjs().subtract(7, 'day'), dayjs()]);
    setAdvancedOpen(false);
  };

  const openExecution = (executionNo: string) => {
    history.push(`/data-quality/execution/${executionNo}`);
  };

  const advancedSearchContent = (
    <div className="w-[340px]">
      <div className="mb-3 text-[13px] font-semibold text-[#161823]">
        高级搜索
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <div className="mb-1.5 text-xs text-[#667085]">数据对象</div>
          <Input
            allowClear
            variant="filled"
            value={objectKeywordDraft}
            onChange={(event) => setObjectKeywordDraft(event.target.value)}
            onPressEnter={applyAdvancedSearch}
            prefix={<Search size={14} className="text-[#98a2b3]" />}
            placeholder="搜索表名或数据对象"
          />
        </div>

        <div>
          <div className="mb-1.5 text-xs text-[#667085]">运行状态</div>
          <Select
            allowClear
            variant="filled"
            value={executionStatusDraft}
            placeholder="全部状态"
            className="w-full"
            onChange={setExecutionStatusDraft}
            options={[
              { value: 'WAITING', label: '等待中' },
              { value: 'RUNNING', label: '运行中' },
              { value: 'SUCCESS', label: '已完成' },
              { value: 'FAILED', label: '执行失败' },
            ]}
          />
        </div>

        <div>
          <div className="mb-1.5 text-xs text-[#667085]">质量结果</div>
          <Select
            allowClear
            variant="filled"
            value={checkResultDraft}
            placeholder="全部结果"
            className="w-full"
            onChange={setCheckResultDraft}
            options={[
              { value: 'PASSED', label: '通过' },
              { value: 'NOT_PASSED', label: '未通过' },
              { value: 'ERROR', label: '异常' },
              { value: 'RUNNING', label: '运行中' },
            ]}
          />
        </div>

        <div>
          <div className="mb-1.5 text-xs text-[#667085]">问题情况</div>
          <Select
            allowClear
            variant="filled"
            value={hasIssuesDraft}
            placeholder="全部"
            className="w-full"
            onChange={setHasIssuesDraft}
            options={[
              { value: true, label: '存在问题' },
              { value: false, label: '无问题' },
            ]}
          />
        </div>

        <div>
          <div className="mb-1.5 text-xs text-[#667085]">质量维度</div>
          <Select
            allowClear
            variant="filled"
            value={dimensionDraft}
            placeholder="全部维度"
            className="w-full"
            onChange={setDimensionDraft}
            options={DIMENSION_OPTIONS}
          />
        </div>

        <div>
          <div className="mb-1.5 text-xs text-[#667085]">关联范围</div>
          <Select
            allowClear
            variant="filled"
            value={scopeDraft}
            placeholder="全部范围"
            className="w-full"
            onChange={setScopeDraft}
            options={[
              { value: 'TABLE', label: '表级' },
              { value: 'COLUMN', label: '字段级' },
            ]}
          />
        </div>

        <div className="col-span-2">
          <div className="mb-1.5 text-xs text-[#667085]">触发方式</div>
          <Select
            allowClear
            variant="filled"
            value={triggerTypeDraft}
            placeholder="全部触发方式"
            className="w-full"
            onChange={setTriggerTypeDraft}
            options={[
              { value: 'MANUAL', label: '手动触发' },
              { value: 'SCHEDULE', label: '调度触发' },
            ]}
          />
        </div>
      </div>

      <div className="mt-4 flex justify-end gap-2 border-t border-[#f0f1f3] pt-3">
        <Button size="small" onClick={reset}>
          重置
        </Button>
        <Button size="small" type="primary" onClick={applyAdvancedSearch}>
          应用
        </Button>
      </div>
    </div>
  );

  return (
    <ConfigProvider theme={BRAND_THEME}>
      <div className="flex h-[calc(100vh-64px)] min-h-[640px] flex-col overflow-hidden bg-white">
        <header className="shrink-0 border-b border-[#e8e9ec] px-5 py-3">
          <h1 className="m-0 text-[22px] font-semibold leading-8 text-[#161823]">
            运行记录
          </h1>
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
              <div className="flex min-w-0 flex-nowrap items-center gap-3 overflow-x-auto">
                <Segmented<ExecutionViewMode>
                  value={viewMode}
                  options={[
                    { label: '规则视角', value: 'RULE' },
                    { label: '监控视角', value: 'EXECUTION' },
                  ]}
                  onChange={setViewMode}
                  className="shrink-0"
                />

                <div className="ml-auto flex shrink-0 items-center gap-2">
                  <Input
                    allowClear
                    variant="filled"
                    value={keywordDraft}
                    onChange={(event) => setKeywordDraft(event.target.value)}
                    onPressEnter={applySearch}
                    prefix={<Search size={14} className="text-[#98a2b3]" />}
                    placeholder="搜索规则或监控名称"
                    className="w-[220px]"
                  />

                  <RangePicker
                    variant="filled"
                    value={dateRange}
                    showTime={false}
                    format="YYYY-MM-DD"
                    className="w-[250px]"
                    onChange={(value) => {
                      if (value?.[0] && value?.[1]) {
                        setDateRange([value[0], value[1]]);
                      } else {
                        setDateRange(null);
                      }
                    }}
                  />

                  <Button onClick={applySearch}>查询</Button>

                  <Popover
                    trigger="click"
                    placement="bottomRight"
                    open={advancedOpen}
                    onOpenChange={setAdvancedOpen}
                    content={advancedSearchContent}
                  >
                    <Button icon={<ListFilter size={14} />}>
                      高级筛选
                      {advancedFilterCount ? ` (${advancedFilterCount})` : ''}
                    </Button>
                  </Popover>

                  <Button
                    aria-label="刷新"
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
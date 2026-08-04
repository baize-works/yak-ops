import { ReloadOutlined } from '@ant-design/icons';
import { Button, ConfigProvider, message, Pagination } from 'antd';
import { useMemo, useState } from 'react';

import { BRAND_THEME } from '@/styles/brand';

import QualityPageHeader from '../components/QualityPageHeader';
import { MOCK_QUALITY_EXECUTIONS } from '../mock';
import type {
  QualityExecutionFilters,
  QualityExecutionRecord,
} from '../types';
import ExecutionDetailDrawer from './components/ExecutionDetailDrawer';
import ExecutionFilterBar from './components/ExecutionFilterBar';
import ExecutionSummary from './components/ExecutionSummary';
import ExecutionTable from './components/ExecutionTable';

const EMPTY_FILTERS: QualityExecutionFilters = {
  keyword: '',
};

const DataQualityExecutionPage = () => {
  const [filters, setFilters] =
    useState<QualityExecutionFilters>(EMPTY_FILTERS);
  const [selected, setSelected] = useState<QualityExecutionRecord>();
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const filtered = useMemo(() => {
    const keyword = filters.keyword.trim().toLowerCase();
    return MOCK_QUALITY_EXECUTIONS.filter((item) => {
      if (filters.status && item.executionStatus !== filters.status) return false;
      if (filters.checkResult && item.checkResult !== filters.checkResult) {
        return false;
      }
      if (filters.triggerType && item.triggerType !== filters.triggerType) {
        return false;
      }
      if (!keyword) return true;
      return [item.id, item.ruleName, item.dataSourceName, item.objectName].some(
        (value) => value.toLowerCase().includes(keyword),
      );
    });
  }, [filters]);

  const visibleRecords = useMemo(
    () => filtered.slice((page - 1) * pageSize, page * pageSize),
    [filtered, page],
  );

  const summary = useMemo(
    () => ({
      total: MOCK_QUALITY_EXECUTIONS.length,
      passed: MOCK_QUALITY_EXECUTIONS.filter(
        (item) => item.checkResult === 'PASSED',
      ).length,
      attention: MOCK_QUALITY_EXECUTIONS.filter(
        (item) =>
          item.checkResult === 'NOT_PASSED' || item.executionStatus === 'FAILED',
      ).length,
      running: MOCK_QUALITY_EXECUTIONS.filter(
        (item) => item.executionStatus === 'RUNNING',
      ).length,
    }),
    [],
  );

  const handleRefresh = () => {
    setRefreshing(true);
    window.setTimeout(() => {
      setRefreshing(false);
      message.success('运行记录已刷新');
    }, 450);
  };

  return (
    <ConfigProvider theme={BRAND_THEME}>
      <div className="min-h-[calc(100vh-48px)] bg-[#f7f7f8] px-5 py-5 lg:px-6">
        <div className="mx-auto w-full max-w-[1680px]">
          <QualityPageHeader
            title="运行记录"
            actions={
              <Button
                icon={<ReloadOutlined spin={refreshing} />}
                disabled={refreshing}
                onClick={handleRefresh}
              >
                刷新
              </Button>
            }
          />

          <ExecutionSummary {...summary} />
          <ExecutionFilterBar
            value={filters}
            onChange={(value) => {
              setFilters(value);
              setPage(1);
            }}
            onReset={() => {
              setFilters(EMPTY_FILTERS);
              setPage(1);
            }}
          />
          <ExecutionTable
            records={visibleRecords}
            loading={refreshing}
            onView={setSelected}
          />

          <div className="flex items-center justify-between border-t border-[#eceef2] bg-white px-4 py-3 text-[12px] text-[#98a2b3]">
            <span>共 {filtered.length} 条记录</span>
            <Pagination
              size="small"
              current={page}
              pageSize={pageSize}
              total={filtered.length}
              showSizeChanger={false}
              onChange={setPage}
            />
          </div>
        </div>
      </div>

      <ExecutionDetailDrawer
        open={Boolean(selected)}
        record={selected}
        onClose={() => setSelected(undefined)}
      />
    </ConfigProvider>
  );
};

export default DataQualityExecutionPage;

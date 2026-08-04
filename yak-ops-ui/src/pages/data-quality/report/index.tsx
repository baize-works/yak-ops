import { ReloadOutlined } from '@ant-design/icons';
import { Button, ConfigProvider, message, Pagination } from 'antd';
import { useCallback, useEffect, useRef, useState } from 'react';

import { API_SUCCESS_CODE } from '@/services/http/response';
import { BRAND_THEME } from '@/styles/brand';

import QualityPageHeader from '../components/QualityPageHeader';
import { qualityExecutionApi } from '../service';
import type {
  CommonApiResponse,
  QualityExecutionFilters,
  QualityExecutionPageResult,
  QualityExecutionRecord,
  QualityExecutionSummary,
} from '../types';
import ExecutionDetailDrawer from './components/ExecutionDetailDrawer';
import ExecutionFilterBar from './components/ExecutionFilterBar';
import ExecutionSummary from './components/ExecutionSummary';
import ExecutionTable from './components/ExecutionTable';

const EMPTY_FILTERS: QualityExecutionFilters = {
  keyword: '',
};

const EMPTY_SUMMARY: QualityExecutionSummary = {
  total: 0,
  passed: 0,
  attention: 0,
  running: 0,
};

const responseMessage = (response: {
  message?: string;
  msg?: string;
}) => response.message || response.msg || '请求处理失败';

const ensureSuccess = <T,>(response: CommonApiResponse<T>): T => {
  if (response.code !== API_SUCCESS_CODE) {
    throw new Error(responseMessage(response));
  }
  return response.data;
};

const DataQualityExecutionPage = () => {
  const [filters, setFilters] =
    useState<QualityExecutionFilters>(EMPTY_FILTERS);
  const [records, setRecords] = useState<QualityExecutionRecord[]>([]);
  const [summary, setSummary] =
    useState<QualityExecutionSummary>(EMPTY_SUMMARY);
  const [selected, setSelected] = useState<QualityExecutionRecord>();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const requestSequence = useRef(0);
  const pageSize = 10;

  const loadExecutions = useCallback(
    async (
      currentPage: number,
      currentFilters: QualityExecutionFilters,
      silent = false,
    ) => {
      const sequence = ++requestSequence.current;
      if (!silent) setLoading(true);
      try {
        const result = ensureSuccess<QualityExecutionPageResult>(
          await qualityExecutionApi.page({
            ...currentFilters,
            keyword: currentFilters.keyword.trim(),
            current: currentPage,
            pageSize,
          }),
        );
        if (sequence !== requestSequence.current) return;
        setRecords(result.records || []);
        setTotal(result.total || 0);
        setSummary(result.summary || EMPTY_SUMMARY);
        setSelected((current) => {
          if (!current) return current;
          return result.records?.find((item) => item.id === current.id) || current;
        });
      } catch (error) {
        if (sequence !== requestSequence.current) return;
        message.error(
          error instanceof Error ? error.message : '质量运行记录加载失败',
        );
      } finally {
        if (sequence === requestSequence.current && !silent) {
          setLoading(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadExecutions(page, filters);
    }, filters.keyword ? 300 : 0);
    return () => window.clearTimeout(timer);
  }, [filters, loadExecutions, page]);

  useEffect(() => {
    const hasActiveExecution = records.some((item) =>
      ['WAITING', 'RUNNING'].includes(item.executionStatus),
    );
    if (!hasActiveExecution) return undefined;
    const timer = window.setInterval(() => {
      void loadExecutions(page, filters, true);
    }, 1500);
    return () => window.clearInterval(timer);
  }, [filters, loadExecutions, page, records]);

  const handleView = async (record: QualityExecutionRecord) => {
    setSelected(record);
    try {
      const detail = ensureSuccess(await qualityExecutionApi.detail(record.id));
      setSelected(detail);
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : '运行详情加载失败',
      );
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadExecutions(page, filters, true);
      message.success('运行记录已刷新');
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <ConfigProvider theme={BRAND_THEME}>
      <div className="min-h-[calc(100vh-48px)] bg-[#f7f7f8] px-5 py-5 lg:px-6">
        <div className="mx-auto w-full max-w-[1680px]">
          <QualityPageHeader
            title="质量报告"
            actions={
              <Button
                icon={<ReloadOutlined spin={refreshing} />}
                disabled={refreshing}
                onClick={() => void handleRefresh()}
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
            records={records}
            loading={loading}
            onView={(record) => void handleView(record)}
          />

          <div
            className={
              'flex items-center justify-between border-t border-[#eceef2] ' +
              'bg-white px-4 py-3 text-[12px] text-[#98a2b3]'
            }
          >
            <span>共 {total} 条记录</span>
            <Pagination
              size="small"
              current={page}
              pageSize={pageSize}
              total={total}
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

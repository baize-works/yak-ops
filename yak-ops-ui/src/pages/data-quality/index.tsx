import { PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { Button, ConfigProvider, message, Modal, Pagination } from 'antd';
import { useMemo, useState } from 'react';

import { BRAND_THEME } from '@/styles/brand';

import QualityFilterBar from './components/QualityFilterBar';
import QualityPageHeader from './components/QualityPageHeader';
import QualityRuleDrawer from './components/QualityRuleDrawer';
import QualityRuleTable from './components/QualityRuleTable';
import QualitySummary from './components/QualitySummary';
import {
  DATA_SOURCE_OPTIONS,
  MOCK_QUALITY_EXECUTIONS,
  MOCK_QUALITY_RULES,
  QUALITY_RULE_TYPE_META,
} from './mock';
import type {
  QualityRule,
  QualityRuleFilters,
  QualityRuleFormValues,
} from './types';

const EMPTY_FILTERS: QualityRuleFilters = {
  keyword: '',
};

const scheduleLabel = (values: QualityRuleFormValues) => {
  if (values.scheduleMode === 'MANUAL') return '仅手动执行';
  const labels: Record<string, string> = {
    HOURLY: '每小时',
    DAILY_0200: '每天 02:00',
    DAILY_0300: '每天 03:00',
    EVERY_30_MINUTES: '每 30 分钟',
    CUSTOM: values.cronExpression || '自定义 Cron',
  };
  return labels[values.schedulePreset || ''] || '定时执行';
};

const DataQualityPage = () => {
  const [rules, setRules] = useState<QualityRule[]>(MOCK_QUALITY_RULES);
  const [filters, setFilters] = useState<QualityRuleFilters>(EMPTY_FILTERS);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<QualityRule>();
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 8;

  const summary = useMemo(
    () => ({
      total: rules.length,
      enabled: rules.filter((item) => item.enabled).length,
      todayRuns: MOCK_QUALITY_EXECUTIONS.filter((item) =>
        item.startedAt.startsWith('2026-08-04'),
      ).length,
      attention: rules.filter((item) =>
        ['NOT_PASSED', 'ERROR'].includes(item.lastResult),
      ).length,
    }),
    [rules],
  );

  const filtered = useMemo(() => {
    const keyword = filters.keyword.trim().toLowerCase();
    return rules.filter((item) => {
      if (filters.dataSourceId && item.dataSourceId !== filters.dataSourceId) {
        return false;
      }
      if (filters.ruleType && item.ruleType !== filters.ruleType) return false;
      if (filters.result && item.lastResult !== filters.result) return false;
      if (filters.enabled !== undefined && item.enabled !== filters.enabled) {
        return false;
      }
      if (!keyword) return true;
      return [
        item.name,
        item.description,
        item.dataSourceName,
        item.databaseName,
        item.tableName,
        item.columnName,
      ].some((value) => value?.toLowerCase().includes(keyword));
    });
  }, [filters, rules]);

  const visibleRecords = useMemo(
    () => filtered.slice((page - 1) * pageSize, page * pageSize),
    [filtered, page],
  );

  const openCreate = () => {
    setEditingRule(undefined);
    setDrawerOpen(true);
  };

  const openEdit = (record: QualityRule) => {
    setEditingRule(record);
    setDrawerOpen(true);
  };

  const handleSubmit = (values: QualityRuleFormValues) => {
    setSubmitting(true);
    const meta = QUALITY_RULE_TYPE_META[values.ruleType];
    const dataSourceName =
      DATA_SOURCE_OPTIONS.find((item) => item.value === values.dataSourceId)
        ?.label || values.dataSourceId;
    const nextRule: QualityRule = {
      id: editingRule?.id || `QR-${String(Date.now()).slice(-6)}`,
      name: values.name.trim(),
      description: values.description?.trim(),
      importance: values.importance,
      dataSourceId: values.dataSourceId,
      dataSourceName,
      databaseName: values.databaseName,
      tableName: values.tableName,
      columnName: meta.scope === 'COLUMN' ? values.columnName : undefined,
      scope: meta.scope,
      ruleType: values.ruleType,
      dimension: meta.dimension,
      operator: values.operator,
      threshold: values.threshold,
      thresholdEnd: values.thresholdEnd,
      unit: meta.unit,
      scheduleMode: values.scheduleMode,
      scheduleLabel: scheduleLabel(values),
      cronExpression:
        values.scheduleMode === 'SCHEDULE' ? values.cronExpression : undefined,
      enabled: values.enabled,
      owner: editingRule?.owner || '魏福万',
      lastResult: editingRule?.lastResult || 'NOT_RUN',
      lastMetric: editingRule?.lastMetric,
      lastRunTime: editingRule?.lastRunTime,
      duration: editingRule?.duration,
      customSql: values.customSql,
    };

    window.setTimeout(() => {
      setRules((current) =>
        editingRule
          ? current.map((item) => (item.id === editingRule.id ? nextRule : item))
          : [nextRule, ...current],
      );
      setSubmitting(false);
      setDrawerOpen(false);
      message.success(editingRule ? '规则已更新' : '规则已创建');
    }, 350);
  };

  const handleRun = (record: QualityRule) => {
    setRules((current) =>
      current.map((item) =>
        item.id === record.id
          ? {
              ...item,
              lastResult: 'RUNNING',
              lastRunTime: '2026-08-04 20:52:00',
              lastMetric: undefined,
            }
          : item,
      ),
    );
    message.success(`已提交“${record.name}”检查任务`);
    window.setTimeout(() => {
      setRules((current) =>
        current.map((item) =>
          item.id === record.id
            ? {
                ...item,
                lastResult: 'PASSED',
                lastMetric:
                  item.unit === '%'
                    ? '100%'
                    : `1 ${item.unit || ''}`.trim(),
                duration: 728,
              }
            : item,
        ),
      );
    }, 1000);
  };

  const handleCopy = (record: QualityRule) => {
    setRules((current) => [
      {
        ...record,
        id: `QR-${String(Date.now()).slice(-6)}`,
        name: `${record.name} - 副本`,
        enabled: false,
        lastResult: 'NOT_RUN',
        lastMetric: undefined,
        lastRunTime: undefined,
        duration: undefined,
      },
      ...current,
    ]);
    message.success('规则已复制');
  };

  const handleDelete = (record: QualityRule) => {
    Modal.confirm({
      centered: true,
      title: '删除质量规则',
      content: `确认删除“${record.name}”吗？删除后不可恢复。`,
      okText: '删除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: () => {
        setRules((current) => current.filter((item) => item.id !== record.id));
        message.success('规则已删除');
      },
    });
  };

  const handleRefresh = () => {
    setRefreshing(true);
    window.setTimeout(() => {
      setRefreshing(false);
      message.success('规则列表已刷新');
    }, 450);
  };

  return (
    <ConfigProvider theme={BRAND_THEME}>
      <div className="min-h-[calc(100vh-48px)] bg-[#f7f7f8] px-5 py-5 lg:px-6">
        <div className="mx-auto w-full max-w-[1680px]">
          <QualityPageHeader
            title="质量规则"
            actions={
              <>
                <Button
                  icon={<ReloadOutlined spin={refreshing} />}
                  disabled={refreshing}
                  onClick={handleRefresh}
                >
                  刷新
                </Button>
                <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
                  新建规则
                </Button>
              </>
            }
          />

          <QualitySummary {...summary} />
          <QualityFilterBar
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
          <QualityRuleTable
            records={visibleRecords}
            loading={refreshing}
            onRun={handleRun}
            onEdit={openEdit}
            onCopy={handleCopy}
            onDelete={handleDelete}
            onToggle={(record, enabled) => {
              setRules((current) =>
                current.map((item) =>
                  item.id === record.id ? { ...item, enabled } : item,
                ),
              );
              message.success(enabled ? '规则已启用' : '规则已停用');
            }}
          />

          <div className="flex items-center justify-between border-t border-[#eceef2] bg-white px-4 py-3 text-[12px] text-[#98a2b3]">
            <span>共 {filtered.length} 条规则</span>
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

      <QualityRuleDrawer
        open={drawerOpen}
        record={editingRule}
        submitting={submitting}
        onCancel={() => setDrawerOpen(false)}
        onSubmit={handleSubmit}
      />
    </ConfigProvider>
  );
};

export default DataQualityPage;

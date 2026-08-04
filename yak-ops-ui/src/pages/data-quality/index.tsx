import { PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import {
  Button,
  ConfigProvider,
  message,
  Modal,
  Pagination,
} from 'antd';
import { useCallback, useEffect, useRef, useState } from 'react';

import { fetchDataSourceAll } from '@/pages/data-source/service';
import { API_SUCCESS_CODE } from '@/services/http/response';
import { BRAND_THEME } from '@/styles/brand';

import QualityFilterBar from './components/QualityFilterBar';
import QualityPageHeader from './components/QualityPageHeader';
import QualityRuleDrawer from './components/QualityRuleDrawer';
import QualityRuleTable from './components/QualityRuleTable';
import QualitySummary from './components/QualitySummary';
import { qualityCatalogApi, qualityRuleApi } from './service';
import type {
  CommonApiResponse,
  QualityCatalogColumn,
  QualityCatalogTable,
  QualityRule,
  QualityRuleFilters,
  QualityRuleFormValues,
  QualityRulePageResult,
  QualityRuleSummary,
  QualitySelectOption,
} from './types';

const EMPTY_FILTERS: QualityRuleFilters = { keyword: '' };

const EMPTY_SUMMARY: QualityRuleSummary = {
  total: 0,
  enabled: 0,
  todayRuns: 0,
  attention: 0,
};

const responseMessage = (response: { message?: string; msg?: string }) =>
  response.message || response.msg || '请求处理失败';

const ensureSuccess = <T,>(response: CommonApiResponse<T>): T => {
  if (response.code !== API_SUCCESS_CODE) {
    throw new Error(responseMessage(response));
  }
  return response.data;
};

const uniqueOptions = (options: QualitySelectOption[]) => {
  const seen = new Set<string>();
  return options.filter((option) => {
    if (!option.value || seen.has(option.value)) return false;
    seen.add(option.value);
    return true;
  });
};

const tableOptions = (records: QualityCatalogTable[]): QualitySelectOption[] =>
  uniqueOptions(
    records
      .map((item) => {
        const value = item.tableName || item.name || item.value || item.label || '';
        return {
          value,
          label: item.label || item.tableName || item.name || value,
          description:
            item.comment || item.remarks || item.description || item.type,
        };
      })
      .filter((item) => item.value),
  );

const columnOptions = (records: QualityCatalogColumn[]): QualitySelectOption[] =>
  uniqueOptions(
    records
      .map((item) => {
        const value = item.columnName || item.name || item.value || item.label || '';
        const type = item.dataType || item.typeName || item.type;
        const label = item.label || item.columnName || item.name || value;
        return {
          value,
          label: type ? `${label} · ${type}` : label,
          description: item.comment || item.remarks || item.description,
        };
      })
      .filter((item) => item.value),
  );

const DataQualityPage = () => {
  const [rules, setRules] = useState<QualityRule[]>([]);
  const [filters, setFilters] = useState<QualityRuleFilters>(EMPTY_FILTERS);
  const [summary, setSummary] = useState<QualityRuleSummary>(EMPTY_SUMMARY);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<QualityRule>();
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [listLoading, setListLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 8;

  const [dataSources, setDataSources] = useState<QualitySelectOption[]>([]);
  const [databases, setDatabases] = useState<QualitySelectOption[]>([]);
  const [schemas, setSchemas] = useState<QualitySelectOption[]>([]);
  const [tables, setTables] = useState<QualitySelectOption[]>([]);
  const [columns, setColumns] = useState<QualitySelectOption[]>([]);
  const [dataSourceLoading, setDataSourceLoading] = useState(false);
  const [databaseLoading, setDatabaseLoading] = useState(false);
  const [schemaLoading, setSchemaLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);
  const [columnLoading, setColumnLoading] = useState(false);

  const listRequestSequence = useRef(0);
  const activeDataSourceId = useRef<string>();
  const activeDatabaseName = useRef<string>();
  const activeSchemaName = useRef<string>();

  const loadRules = useCallback(
    async (
      currentPage: number,
      currentFilters: QualityRuleFilters,
      silent = false,
    ) => {
      const sequence = ++listRequestSequence.current;
      if (!silent) setListLoading(true);
      try {
        const result = ensureSuccess<QualityRulePageResult>(
          await qualityRuleApi.page({
            ...currentFilters,
            keyword: currentFilters.keyword.trim(),
            current: currentPage,
            pageSize,
          }),
        );
        if (sequence !== listRequestSequence.current) return;
        setRules(result.records || []);
        setTotal(result.total || 0);
        setSummary(result.summary || EMPTY_SUMMARY);
      } catch (error) {
        if (sequence !== listRequestSequence.current) return;
        message.error(
          error instanceof Error ? error.message : '质量规则加载失败',
        );
      } finally {
        if (sequence === listRequestSequence.current && !silent) {
          setListLoading(false);
        }
      }
    },
    [],
  );

  const loadDataSources = useCallback(async () => {
    setDataSourceLoading(true);
    try {
      const response = await fetchDataSourceAll();
      if (response.code !== API_SUCCESS_CODE) {
        throw new Error(responseMessage(response));
      }
      setDataSources(
        uniqueOptions(
          (response.data?.bizData || [])
            .filter((item) => item.id !== undefined && Boolean(item.name))
            .map((item) => ({
              value: String(item.id),
              label: item.name || String(item.id),
              description: item.dbType,
            })),
        ),
      );
    } catch (error) {
      message.error(error instanceof Error ? error.message : '数据源加载失败');
    } finally {
      setDataSourceLoading(false);
    }
  }, []);

  const loadDatabases = useCallback(async (dataSourceId: string) => {
    activeDataSourceId.current = dataSourceId;
    activeDatabaseName.current = undefined;
    activeSchemaName.current = undefined;
    setDatabases([]);
    setSchemas([]);
    setTables([]);
    setColumns([]);
    setDatabaseLoading(true);
    try {
      const response = await qualityCatalogApi.databases(dataSourceId);
      let options = uniqueOptions(
        (ensureSuccess(response) || [])
          .filter(Boolean)
          .map((value) => ({ label: value, value })),
      );
      if (activeDataSourceId.current !== dataSourceId) return [];

      // PostgreSQL 等驱动可能仅暴露 Schema，不返回 Catalog。
      if (!options.length) {
        const schemaResponse = await qualityCatalogApi.schemas(dataSourceId);
        options = uniqueOptions(
          (ensureSuccess(schemaResponse) || [])
            .filter(Boolean)
            .map((value) => ({ label: value, value })),
        );
      }
      setDatabases(options);
      if (!options.length) message.warning('当前数据源没有返回可用的数据库');
      return options;
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : '数据库元数据加载失败',
      );
      return [];
    } finally {
      if (activeDataSourceId.current === dataSourceId) {
        setDatabaseLoading(false);
      }
    }
  }, []);

  const loadSchemas = useCallback(
    async (dataSourceId: string, databaseName: string) => {
      activeDataSourceId.current = dataSourceId;
      activeDatabaseName.current = databaseName;
      activeSchemaName.current = undefined;
      setSchemas([]);
      setTables([]);
      setColumns([]);
      setSchemaLoading(true);
      try {
        const response = await qualityCatalogApi.schemas(
          dataSourceId,
          databaseName,
        );
        const options = uniqueOptions(
          (ensureSuccess(response) || [])
            .filter(Boolean)
            .map((value) => ({ label: value, value })),
        );
        if (
          activeDataSourceId.current === dataSourceId &&
          activeDatabaseName.current === databaseName
        ) {
          setSchemas(options);
        }
        return options;
      } catch {
        // MySQL/Doris 不一定有独立 Schema，继续使用数据库加载表。
        setSchemas([]);
        return [];
      } finally {
        if (
          activeDataSourceId.current === dataSourceId &&
          activeDatabaseName.current === databaseName
        ) {
          setSchemaLoading(false);
        }
      }
    },
    [],
  );

  const loadTables = useCallback(
    async (
      dataSourceId: string,
      databaseName: string,
      schemaName?: string,
    ) => {
      activeDataSourceId.current = dataSourceId;
      activeDatabaseName.current = databaseName;
      activeSchemaName.current = schemaName;
      setTables([]);
      setColumns([]);
      setTableLoading(true);
      try {
        const response = await qualityCatalogApi.tables(
          dataSourceId,
          databaseName,
          schemaName,
        );
        const options = tableOptions(ensureSuccess(response));
        if (
          activeDataSourceId.current === dataSourceId &&
          activeDatabaseName.current === databaseName &&
          activeSchemaName.current === schemaName
        ) {
          setTables(options);
        }
        return options;
      } catch (error) {
        message.error(error instanceof Error ? error.message : '数据表加载失败');
        return [];
      } finally {
        if (
          activeDataSourceId.current === dataSourceId &&
          activeDatabaseName.current === databaseName &&
          activeSchemaName.current === schemaName
        ) {
          setTableLoading(false);
        }
      }
    },
    [],
  );

  const loadColumns = useCallback(
    async (
      dataSourceId: string,
      databaseName: string,
      schemaName: string | undefined,
      tableName: string,
    ) => {
      setColumns([]);
      setColumnLoading(true);
      try {
        const response = await qualityCatalogApi.columns(
          dataSourceId,
          databaseName,
          schemaName,
          tableName,
        );
        const options = columnOptions(ensureSuccess(response));
        if (
          activeDataSourceId.current === dataSourceId &&
          activeDatabaseName.current === databaseName &&
          activeSchemaName.current === schemaName
        ) {
          setColumns(options);
        }
        return options;
      } catch (error) {
        message.error(error instanceof Error ? error.message : '字段加载失败');
        return [];
      } finally {
        setColumnLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    void loadDataSources();
  }, [loadDataSources]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadRules(page, filters);
    }, filters.keyword ? 300 : 0);
    return () => window.clearTimeout(timer);
  }, [filters, loadRules, page]);

  useEffect(() => {
    if (!rules.some((item) => item.lastResult === 'RUNNING')) return undefined;
    const timer = window.setInterval(() => {
      void loadRules(page, filters, true);
    }, 1500);
    return () => window.clearInterval(timer);
  }, [filters, loadRules, page, rules]);

  const openCreate = () => {
    setEditingRule(undefined);
    activeDataSourceId.current = undefined;
    activeDatabaseName.current = undefined;
    activeSchemaName.current = undefined;
    setDatabases([]);
    setSchemas([]);
    setTables([]);
    setColumns([]);
    setDrawerOpen(true);
  };

  const openEdit = async (record: QualityRule) => {
    setEditingRule(record);
    setDrawerOpen(true);
    await loadDatabases(record.dataSourceId);
    await loadSchemas(record.dataSourceId, record.databaseName);
    await loadTables(
      record.dataSourceId,
      record.databaseName,
      record.schemaName,
    );
    if (record.columnName) {
      await loadColumns(
        record.dataSourceId,
        record.databaseName,
        record.schemaName,
        record.tableName,
      );
    }
  };

  const handleSubmit = async (values: QualityRuleFormValues) => {
    setSubmitting(true);
    try {
      const dataSourceName =
        dataSources.find((item) => item.value === values.dataSourceId)?.label ||
        values.dataSourceId;
      const payload: QualityRuleFormValues = {
        ...values,
        name: values.name.trim(),
        description: values.description?.trim(),
        dataSourceName,
        catalogName: values.catalogName || values.databaseName,
      };
      const response = editingRule
        ? await qualityRuleApi.update(editingRule.id, payload)
        : await qualityRuleApi.create(payload);
      ensureSuccess(response);
      message.success(editingRule ? '规则已更新' : '规则已创建');
      setDrawerOpen(false);
      setEditingRule(undefined);
      const nextPage = editingRule ? page : 1;
      if (nextPage !== page) setPage(nextPage);
      else await loadRules(nextPage, filters);
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : '质量规则保存失败',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleRun = async (record: QualityRule) => {
    try {
      const execution = ensureSuccess(await qualityRuleApi.run(record.id));
      message.success(`质量检查已提交：${execution.id}`);
      await loadRules(page, filters, true);
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : '质量检查提交失败',
      );
    }
  };

  const handleCopy = async (record: QualityRule) => {
    try {
      ensureSuccess(await qualityRuleApi.copy(record.id));
      message.success('规则已复制');
      if (page !== 1) setPage(1);
      else await loadRules(1, filters);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '规则复制失败');
    }
  };

  const handleDelete = (record: QualityRule) => {
    Modal.confirm({
      centered: true,
      title: '删除质量规则',
      content: `确认删除“${record.name}”吗？历史执行记录将继续保留。`,
      okText: '删除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          ensureSuccess(await qualityRuleApi.delete(record.id));
          message.success('规则已删除');
          const nextPage = rules.length === 1 && page > 1 ? page - 1 : page;
          if (nextPage !== page) setPage(nextPage);
          else await loadRules(nextPage, filters);
        } catch (error) {
          message.error(
            error instanceof Error ? error.message : '规则删除失败',
          );
          throw error;
        }
      },
    });
  };

  const handleToggle = async (record: QualityRule, enabled: boolean) => {
    try {
      ensureSuccess(await qualityRuleApi.setEnabled(record.id, enabled));
      message.success(enabled ? '规则已启用' : '规则已停用');
      await loadRules(page, filters, true);
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : '规则状态更新失败',
      );
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        loadRules(page, filters, true),
        loadDataSources(),
      ]);
      message.success('规则列表已刷新');
    } finally {
      setRefreshing(false);
    }
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
                  onClick={() => void handleRefresh()}
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
            dataSourceOptions={dataSources}
            dataSourceLoading={dataSourceLoading}
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
            records={rules}
            loading={listLoading}
            onRun={(record) => void handleRun(record)}
            onEdit={(record) => void openEdit(record)}
            onCopy={(record) => void handleCopy(record)}
            onDelete={handleDelete}
            onToggle={(record, enabled) => void handleToggle(record, enabled)}
          />

          <div
            className={
              'flex items-center justify-between border-t border-[#eceef2] ' +
              'bg-white px-4 py-3 text-[12px] text-[#98a2b3]'
            }
          >
            <span>共 {total} 条规则</span>
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

      <QualityRuleDrawer
        open={drawerOpen}
        record={editingRule}
        submitting={submitting}
        dataSourceOptions={dataSources}
        databaseOptions={databases}
        schemaOptions={schemas}
        tableOptions={tables}
        columnOptions={columns}
        dataSourceLoading={dataSourceLoading}
        databaseLoading={databaseLoading}
        schemaLoading={schemaLoading}
        tableLoading={tableLoading}
        columnLoading={columnLoading}
        onDataSourceChange={(dataSourceId) => void loadDatabases(dataSourceId)}
        onDatabaseChange={(databaseName) => {
          const dataSourceId = activeDataSourceId.current;
          if (!dataSourceId) return;
          void (async () => {
            const nextSchemas = await loadSchemas(dataSourceId, databaseName);
            if (!nextSchemas.length) {
              await loadTables(dataSourceId, databaseName);
            }
          })();
        }}
        onSchemaChange={(schemaName) => {
          const dataSourceId = activeDataSourceId.current;
          const databaseName = activeDatabaseName.current;
          activeSchemaName.current = schemaName;
          if (dataSourceId && databaseName) {
            void loadTables(dataSourceId, databaseName, schemaName);
          }
        }}
        onTableChange={(tableName) => {
          const dataSourceId = activeDataSourceId.current;
          const databaseName = activeDatabaseName.current;
          if (dataSourceId && databaseName) {
            void loadColumns(
              dataSourceId,
              databaseName,
              activeSchemaName.current,
              tableName,
            );
          }
        }}
        onCancel={() => {
          setDrawerOpen(false);
          setEditingRule(undefined);
        }}
        onSubmit={handleSubmit}
      />
    </ConfigProvider>
  );
};

export default DataQualityPage;

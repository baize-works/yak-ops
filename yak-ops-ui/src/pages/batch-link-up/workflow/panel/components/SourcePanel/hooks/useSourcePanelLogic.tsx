import { API_SUCCESS_CODE } from '@/services/http/response';
import {
  dataSourceCatalogApi,
  fetchDataSourceOptions,
} from "@/pages/data-source/service";
import { message } from "antd";
import { Table2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

export interface SourcePanelLogicProps {
  selectedNode: any;
  onNodeDataChange: (nodeId: string, newData: any) => void;
  qualityDetailRef: any;
  scheduleConfig: any;
}

export function useSourcePanelLogic({
  selectedNode,
  onNodeDataChange,
  qualityDetailRef,
  scheduleConfig,
}: SourcePanelLogicProps) {
  const nodeId = selectedNode?.id;
  const nodeData = selectedNode?.data || {};
  const config = nodeData?.config || {};
  const meta = nodeData?.meta || {};

  const title = nodeData?.title || "来源节点";
  const dbType = nodeData?.dbType || "MYSQL";
  const description = nodeData?.description || "读取源端数据";

  const dataSourceId = config?.dataSourceId ? String(config.dataSourceId) : "";
  const readMode = config?.readMode || "table";
  const table = config?.table || undefined;
  const sql = config?.sql || "";
  const extraParams = config?.extraParams || [];

  const [dataSourceOptions, setDataSourceOptions] = useState<any[]>([]);
  const [tableOptions, setTableOptions] = useState<any[]>([]);
  const [tableLoading, setTableLoading] = useState(false);

  const [sqlPopoverOpen, setSqlPopoverOpen] = useState(false);
  const [resolvePopoverOpen, setResolvePopoverOpen] = useState(false);
  const [selectedSqlTable, setSelectedSqlTable] = useState<string>();
  const [generateSqlLoading, setGenerateSqlLoading] = useState(false);
  const [resolveSqlLoading, setResolveSqlLoading] = useState(false);
  const [resolvedSqlPreview, setResolvedSqlPreview] = useState("");
  const [viewLoading, setViewLoading] = useState(false);

  const resetSchemaMeta = {
    outputSchema: [],
    schemaStatus: "idle",
    schemaError: "",
  };

  const updateNode = useCallback(
    (
      configPatch?: Record<string, any>,
      extraNodeDataPatch?: Record<string, any>,
      metaPatch?: Record<string, any>
    ) => {
      if (!nodeId) return;

      onNodeDataChange(nodeId, {
        ...nodeData,
        ...(extraNodeDataPatch || {}),
        config: {
          ...(nodeData?.config || {}),
          ...(configPatch || {}),
        },
        meta: {
          ...(nodeData?.meta || {}),
          ...(metaPatch || {}),
        },
      });
    },
    [nodeId, nodeData, onNodeDataChange]
  );

  const currentDataSource = useMemo(() => {
    return dataSourceOptions.find(
      (item: any) => String(item.value) === String(dataSourceId)
    );
  }, [dataSourceId, dataSourceOptions]);

  useEffect(() => {
    const loadDataSourceOptions = async () => {
      if (!dbType) {
        setDataSourceOptions([]);
        return;
      }

      try {
        const res = await fetchDataSourceOptions(dbType);
        const list = Array.isArray(res?.data) ? res.data : [];
        const options = list.map((item: any) => ({
          label: item?.label,
          value: String(item?.value),
          dbType: item?.dbType,
        }));
        setDataSourceOptions(options);
      } catch (error) {
        console.error("load data source options error", error);
        setDataSourceOptions([]);
      }
    };

    loadDataSourceOptions();
  }, [dbType]);

  useEffect(() => {
    if (!dataSourceId || dataSourceOptions.length === 0) return;

    const matched = dataSourceOptions.find(
      (item: any) => String(item.value) === String(dataSourceId)
    );

    if (!matched) return;

    const nextTitle = matched?.label || nodeData?.title;
    const nextDbType = matched?.dbType || nodeData?.dbType || "MYSQL";

    if (nodeData?.title === nextTitle && nodeData?.dbType === nextDbType) {
      return;
    }

    updateNode(undefined, {
      title: nextTitle,
      dbType: nextDbType,
    });
  }, [dataSourceId, dataSourceOptions, nodeData, updateNode]);

  useEffect(() => {
    const loadTableOptions = async () => {
      if (!dataSourceId) {
        setTableOptions([]);
        return;
      }

      setTableLoading(true);
      try {
        const res = await dataSourceCatalogApi.listTable(dataSourceId);
        const list = Array.isArray(res?.data) ? res.data : [];

        const options = list.map((item: any) => {
          const text = item?.value ?? String(item?.value ?? "");

          return {
            label: (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 20,
                    height: 20,
                    borderRadius: 6,
                    background: "rgba(148, 163, 184, 0.12)",
                    color: "#64748B",
                    flexShrink: 0,
                  }}
                >
                  <Table2 size={12} />
                </span>
                <span style={{ color: "#344054" }}>{text}</span>
              </div>
            ),
            value: String(item?.value ?? ""),
            rawLabel: text,
            description: item?.description,
          };
        });

        setTableOptions(options);

        if (
          table &&
          !options.some((item: any) => String(item.value) === String(table))
        ) {
          updateNode({ table: undefined });
        }
      } catch (error) {
        console.error("load table options error", error);
        setTableOptions([]);
      } finally {
        setTableLoading(false);
      }
    };

    loadTableOptions();
  }, [dataSourceId, table, updateNode]);

  const handleDataSourceChange = useCallback(
    (value: string, option: any) => {
      setSelectedSqlTable(undefined);
      setResolvedSqlPreview("");
      setSqlPopoverOpen(false);
      setResolvePopoverOpen(false);

      updateNode(
        {
          dataSourceId: value,
          table: undefined,
          sql: "",
        },
        {
          title: option?.label || nodeData?.title,
          dbType: option?.dbType || nodeData?.dbType || "MYSQL",
        },
        resetSchemaMeta
      );
    },
    [nodeData, updateNode]
  );

  const handleReadModeChange = useCallback(
    (value: string) => {
      updateNode(
        {
          readMode: value,
          ...(value === "table" ? { sql: "" } : { table: undefined }),
        },
        undefined,
        resetSchemaMeta
      );
    },
    [updateNode]
  );
  const scheduleParamsList = scheduleConfig?.paramsList || [];

  const resolveSourceOutputSchema = useCallback(async () => {
    const currentDataSourceId = dataSourceId;
    const currentReadMode = readMode;
    const currentTable = table;
    const sqlText = sql?.trim();

    if (!currentDataSourceId) {
      message.warning("请先选择来源数据源");
      return [];
    }

    if (currentReadMode === "table" && !currentTable) {
      message.warning("请先选择来源表");
      return [];
    }

    if (currentReadMode === "sql" && !sqlText) {
      message.warning("请先输入 SQL");
      return [];
    }

    try {
      setTableLoading(true);

      updateNode(undefined, undefined, {
        schemaStatus: "loading",
        schemaError: "",
      });

      const params = {
        read_mode: currentReadMode,
        table_path: currentReadMode === "table" ? currentTable : "",
        query: currentReadMode === "sql" ? sqlText : "",
        paramsList: scheduleConfig?.paramsList || [],
      };

      const resp = await dataSourceCatalogApi.listColumn(
        currentDataSourceId,
        params
      );

      if (resp?.code !== API_SUCCESS_CODE) {
        const errorMsg = resp?.message || "字段解析失败";

        updateNode(undefined, undefined, {
          outputSchema: [],
          schemaStatus: "error",
          schemaError: errorMsg,
        });

        message.error(errorMsg);
        return [];
      }

      const rawColumns = resp?.data || [];

      const outputSchema = rawColumns.map((item: any) => ({
        type: item?.fieldType || "",
        nullable: item?.isNullable,
        comment: item?.fieldComment || "",
        originFieldName: item?.fieldName || "",
      }));

      updateNode(undefined, undefined, {
        outputSchema,
        schemaStatus: "success",
        schemaError: "",
      });

      return outputSchema;
    } catch (error: any) {
      updateNode(undefined, undefined, {
        outputSchema: [],
        schemaStatus: "error",
        schemaError: "字段解析失败",
      });

      return [];
    } finally {
      setTableLoading(false);
    }
  }, [dataSourceId, readMode, table, sql, updateNode, scheduleParamsList]);

  const handlePreview = useCallback(async () => {
    if (!dataSourceId) {
      message.warning("请选择数据源");
      return;
    }

    console.log(scheduleConfig);

    const getRequestParams = () => ({
      read_mode: readMode,
      ...(readMode === "table" ? { table_path: table } : { query: sql }),
      extra_params: extraParams,
      paramsList: scheduleConfig?.paramsList || [],
    });

    try {
      if (readMode === "table" && !table) {
        message.warning("请选择来源表");
        return;
      }

      if (readMode === "sql" && !sql?.trim()) {
        message.warning("请输入 SQL");
        return;
      }

      setViewLoading(true);

      const data = await dataSourceCatalogApi.getTop20Data(
        dataSourceId,
        getRequestParams()
      );

      if (data?.code === API_SUCCESS_CODE) {
        qualityDetailRef.current?.onOpen(true, data);
      } else {
      }
    } catch (error) {
    } finally {
      setViewLoading(false);
    }
  }, [
    dataSourceId,
    readMode,
    table,
    sql,
    extraParams,
    qualityDetailRef,
    scheduleParamsList,
  ]);

  const handleStatistics = useCallback(() => {
    console.log("statistics source data", {
      nodeId,
      dataSourceId,
      readMode,
      table,
      sql,
      extraParams,
    });
  }, [nodeId, dataSourceId, readMode, table, sql, extraParams]);

  const handleGenerateSql = useCallback(async () => {
    if (!dataSourceId) {
      message.warning("请先选择数据源");
      return;
    }

    if (!selectedSqlTable) {
      message.warning("请选择表");
      return;
    }

    try {
      setGenerateSqlLoading(true);

      const res = await dataSourceCatalogApi.buildSqlTemplate(dataSourceId, {
        read_mode: "table",
        table_path: selectedSqlTable,
      });

      if (res?.code !== API_SUCCESS_CODE) {
        return;
      }

      const nextSql = res?.data || "";
      if (!nextSql) {
        message.warning("未生成有效 SQL");
        return;
      }

      updateNode({ sql: nextSql }, undefined, resetSchemaMeta);
      setSqlPopoverOpen(false);
      message.success("SQL 生成成功");
    } catch (error) {
      console.error("generate sql error", error);
    } finally {
      setGenerateSqlLoading(false);
    }
  }, [dataSourceId, selectedSqlTable, updateNode]);

  const handleResolveSqlPreview = useCallback(async () => {
    if (!dataSourceId) {
      message.warning("请先选择数据源");
      return;
    }

    if (!sql) {
      message.warning("请先输入 SQL");
      return;
    }

    try {
      setResolveSqlLoading(true);

      const res = await dataSourceCatalogApi.resolveSql(dataSourceId, {
        query: sql,
        read_mode: readMode,
        extra_params: extraParams,
        paramsList: scheduleConfig?.paramsList || [],
      });

      if (res?.code !== API_SUCCESS_CODE) {
        message.error(res?.message || "SQL 变量解析失败");
        return;
      }

      setResolvedSqlPreview(res?.data || "");
    } catch (error) {
      console.error("resolve sql error", error);
      message.error("SQL 变量解析失败");
    } finally {
      setResolveSqlLoading(false);
    }
  }, [dataSourceId, sql, scheduleParamsList]);

  const handleOpenResolvePopover = useCallback(
    async (open: boolean) => {
      setResolvePopoverOpen(open);
      if (open && sql) {
        await handleResolveSqlPreview();
      }
    },
    [sql, handleResolveSqlPreview]
  );

  const handleResolveColumns = useCallback(async () => {
    await resolveSourceOutputSchema();
  }, [resolveSourceOutputSchema]);

  return {
    nodeData,
    meta,
    title,
    dbType,
    description,
    dataSourceId,
    readMode,
    table,
    sql,
    extraParams,
    currentDataSource,

    dataSourceOptions,
    tableOptions,
    tableLoading,

    sqlPopoverOpen,
    setSqlPopoverOpen,
    resolvePopoverOpen,
    selectedSqlTable,
    setSelectedSqlTable,
    generateSqlLoading,
    resolveSqlLoading,
    resolvedSqlPreview,
    viewLoading,

    updateNode,
    handleDataSourceChange,
    handleReadModeChange,
    handlePreview,
    handleStatistics,
    handleGenerateSql,
    handleResolveSqlPreview,
    handleOpenResolvePopover,
    handleResolveColumns,
  };
}

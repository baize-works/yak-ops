import { API_SUCCESS_CODE } from '@/services/http/response';
import {
  dataSourceCatalogApi,
  fetchDataSourceOptions,
} from "@/pages/data-source/service";
import { message } from "antd";
import { Table2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

export interface SinkPanelLogicProps {
  selectedNode: any;
  onNodeDataChange: (nodeId: string, newData: any) => void;
}

export function useSinkPanelLogic({
  selectedNode,
  onNodeDataChange,
}: SinkPanelLogicProps) {
  const nodeId = selectedNode?.id;
  const nodeData = selectedNode?.data || {};
  const config = nodeData?.config || {};

  const title = nodeData?.title || "MYSQL";
  const dbType = nodeData?.dbType || "MYSQL";
  const description = nodeData?.description || "写入目标端数据";

  const dataSourceId = config?.dataSourceId
    ? String(config.dataSourceId)
    : undefined;

  const autoCreateTable = Boolean(config?.autoCreateTable);
  const writeMode = config?.writeMode || "append";
  const targetMode = config?.targetMode || "table";

  const table = config?.table;
  const targetTableName = config?.targetTableName || "";
  const sql = config?.sql || "";
  const primaryKey = config?.primaryKey || "";
  const batchSize = config?.batchSize || "";
  const extraParams = config?.extraParams || [];

  const [dataSourceOptions, setDataSourceOptions] = useState<any[]>([]);
  const [tableOptions, setTableOptions] = useState<any[]>([]);
  const [tableLoading, setTableLoading] = useState(false);

  const [sqlPopoverOpen, setSqlPopoverOpen] = useState(false);
  const [selectedSqlTable, setSelectedSqlTable] = useState<string>();
  const [generateSqlLoading, setGenerateSqlLoading] = useState(false);

  const updateNode = useCallback(
    (patch: Record<string, any>, extraNodeDataPatch?: Record<string, any>) => {
      if (!nodeId) return;

      onNodeDataChange(nodeId, {
        ...nodeData,
        ...(extraNodeDataPatch || {}),
        config: {
          ...(nodeData?.config || {}),
          ...patch,
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
        console.error("load sink data source options error", error);
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

    updateNode({}, { title: nextTitle, dbType: nextDbType });
  }, [dataSourceId, dataSourceOptions, nodeData, updateNode]);

  useEffect(() => {
    const loadTableOptions = async () => {
      if (!dataSourceId || autoCreateTable) {
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
        console.error("load sink table options error", error);
        setTableOptions([]);
      } finally {
        setTableLoading(false);
      }
    };

    loadTableOptions();
  }, [dataSourceId, autoCreateTable, table, updateNode]);

  const handleDataSourceChange = useCallback(
    (value: string, option: any) => {
      setSelectedSqlTable(undefined);
      setSqlPopoverOpen(false);

      updateNode(
        {
          dataSourceId: value,
          table: undefined,
          targetTableName: "",
          sql: "",
          primaryKey: "",
        },
        {
          title: option?.label || nodeData?.title,
          dbType: option?.dbType || nodeData?.dbType || "MYSQL",
        }
      );
    },
    [nodeData, updateNode]
  );

  const handleAutoCreateTableChange = useCallback(
    (checked: boolean) => {
      setSelectedSqlTable(undefined);
      setSqlPopoverOpen(false);

      updateNode({
        autoCreateTable: checked,
        targetMode: "table",
        table: undefined,
        targetTableName: "",
        sql: "",
      });
    },
    [updateNode]
  );

  const handleWriteModeChange = useCallback(
    (value: string) => {
      const patch: Record<string, any> = { writeMode: value };

      if (value !== "upsert") {
        patch.primaryKey = "";
      }

      updateNode(patch);
    },
    [updateNode]
  );

  const handleTargetModeChange = useCallback(
    (value: string) => {
      updateNode({
        targetMode: value,
        ...(value === "table" ? { sql: "" } : { table: undefined }),
      });
    },
    [updateNode]
  );

  const handleGenerateSql = useCallback(async () => {
    if (!dataSourceId) {
      message.warning("请先选择目标数据源");
      return;
    }

    if (!selectedSqlTable) {
      message.warning("请选择目标表");
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

      updateNode({ sql: nextSql });
      setSqlPopoverOpen(false);
    } catch (error) {
      console.error("generate sink sql error", error);
    } finally {
      setGenerateSqlLoading(false);
    }
  }, [dataSourceId, selectedSqlTable, updateNode]);

  return {
    title,
    dbType,
    description,

    dataSourceId,
    autoCreateTable,
    writeMode,
    targetMode,
    table,
    targetTableName,
    sql,
    primaryKey,
    batchSize,
    extraParams,

    currentDataSource,
    dataSourceOptions,
    tableOptions,
    tableLoading,

    sqlPopoverOpen,
    setSqlPopoverOpen,
    selectedSqlTable,
    setSelectedSqlTable,
    generateSqlLoading,

    updateNode,
    handleDataSourceChange,
    handleAutoCreateTableChange,
    handleWriteModeChange,
    handleTargetModeChange,
    handleGenerateSql,
  };
}
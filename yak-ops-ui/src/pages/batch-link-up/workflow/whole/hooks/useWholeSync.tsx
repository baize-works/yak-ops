import { API_SUCCESS_CODE } from '@/services/http/response';

import { message } from "antd";
import { debounce } from "lodash";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { DbType, TableItem, WholeSyncTaskDraft } from "../types";
import {
  buildDataSourceOptions,
  buildTableItems,
  DEFAULT_DB_TYPE,
  isGraphDraft,
  safeParseDraft,
} from "../utils";
import { dataSourceCatalogApi, fetchDataSourceOptions } from "@/pages/data-source/service";

interface UseWholeSyncProps {
  baseForm: any;
  form: any;
}

export const useWholeSync = ({ baseForm, form }: UseWholeSyncProps) => {
  const [data, setData] = useState<TableItem[]>([]);
  const [multiTableList, setMultiTableList] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const [tableKeyword, setTableKeyword] = useState("");
  const [matchMode, setMatchMode] = useState<string>("1");
  const [readOnlyTables, setReadOnlyTables] = useState<TableItem[]>([]);

  const [sourceType, setSourceType] = useState<DbType>(DEFAULT_DB_TYPE);
  const [targetType, setTargetType] = useState<DbType>(DEFAULT_DB_TYPE);

  const [sourceOption, setSourceOption] = useState<any[]>([]);
  const [targetOption, setTargetOption] = useState<any[]>([]);
  const [currentSourceId, setCurrentSourceId] = useState("");

  const draft = useMemo(() => {
    const draftStr = baseForm?.getFieldValue("jobDefinitionInfo");
    return safeParseDraft(draftStr);
  }, [baseForm]);

  const fetchDataSourceOptionsU = useCallback(async (dbType: string) => {
    const res = await fetchDataSourceOptions(dbType);
    if (res?.code === API_SUCCESS_CODE && res?.data?.length) {
      return buildDataSourceOptions(res.data);
    }
    return [];
  }, []);

  const fetchTables = useCallback(
    async (dataSourceId: string, currentMatchMode?: string) => {
      if (!dataSourceId) return;

      try {
        setCurrentSourceId(dataSourceId);
        setLoading(true);

        const res = await dataSourceCatalogApi.listTable(dataSourceId);
        if (res?.code === API_SUCCESS_CODE) {
          const tmp = buildTableItems(res.data);

          setData(tmp);

          if (currentMatchMode === "4") {
            setMultiTableList(tmp.map((t) => t.key));
          } else if (currentMatchMode === "1") {
            setMultiTableList([]);
          }
        } 
      } catch (err) {
        console.error(err);
       
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const fetchReferenceTables = useCallback(
    async (dataSourceId: string, mode: string, keyword?: string) => {
      if (!dataSourceId) return;

      try {
        setLoading(true);
        const res = await dataSourceCatalogApi.listTableReference(
          dataSourceId,
          mode,
          keyword
        );
        if (res?.code === API_SUCCESS_CODE) {
          setReadOnlyTables(buildTableItems(res.data));
        } 
      } catch (err) {
        console.error(err);
       
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const debouncedFetchReferenceTables = useMemo(
    () =>
      debounce((dataSourceId: string, mode: string, keyword: string) => {
        fetchReferenceTables(dataSourceId, mode, keyword);
      }, 500),
    [fetchReferenceTables]
  );

  const restoreFromDraft = useCallback(
    async (draftData: WholeSyncTaskDraft) => {
      if (!draftData) return;

      setSourceType(draftData.source);
      setTargetType(draftData.target);
      setMatchMode(draftData.tableMatch.mode);
      setTableKeyword(draftData.tableMatch.keyword || "");
      setCurrentSourceId(draftData.source.datasourceId);

      form.setFieldsValue({
        sourceId: draftData.source.datasourceId,
        sinkId: draftData.target.datasourceId,
        matchMode: draftData.tableMatch.mode,
        sourceTable: draftData.tableMatch.keyword,
      });

      if (draftData.tableMatch.mode === "1") {
        await fetchTables(draftData.source.datasourceId, "1");
        setMultiTableList(draftData.tableMatch.tables || []);
      }

      if (draftData.tableMatch.mode === "4") {
        await fetchTables(draftData.source.datasourceId, "4");
      }

      if (
        draftData.tableMatch.mode === "2" ||
        draftData.tableMatch.mode === "3"
      ) {
        fetchReferenceTables(
          draftData.source.datasourceId,
          draftData.tableMatch.mode,
          draftData.tableMatch.keyword
        );
      }
    },
    [fetchReferenceTables, fetchTables, form]
  );

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const sourceOptions = await fetchDataSourceOptionsU(sourceType.dbType);
      const targetOptions = await fetchDataSourceOptionsU(targetType.dbType);

      if (!mounted) return;

      setSourceOption(sourceOptions);
      setTargetOption(targetOptions);

      if (isGraphDraft(draft)) {
        const firstSourceId = sourceOptions?.[0]?.value;
        const firstTargetId = targetOptions?.[0]?.value;

        if (firstSourceId) {
          form.setFieldValue("sourceId", firstSourceId);
          fetchTables(firstSourceId, "1");
        }
        if (firstTargetId) {
          form.setFieldValue("sinkId", firstTargetId);
        }
      } else if (draft) {
        restoreFromDraft(draft);
      }
    };

    init();

    return () => {
      mounted = false;
      debouncedFetchReferenceTables.cancel();
    };
  }, [
    draft,
    fetchDataSourceOptionsU,
    fetchTables,
    restoreFromDraft,
    form,
    sourceType.dbType,
    targetType.dbType,
    debouncedFetchReferenceTables,
  ]);

  const handleSourceTypeChange = async (value: string, option: any) => {
    console.log(option);
    const next = { dbType: value, connectorType: option?.connectorType };
    setSourceType(next);

    const options = await fetchDataSourceOptionsU(value);
    setSourceOption(options);

    const firstId = options?.[0]?.value;
    form.setFieldValue("sourceId", firstId);

    if (firstId) {
      if (matchMode === "1" || matchMode === "4") {
        fetchTables(firstId, matchMode);
      } else {
        setCurrentSourceId(firstId);
        if (tableKeyword) {
          fetchReferenceTables(firstId, matchMode, tableKeyword);
        }
      }
    }
  };

  const handleTargetTypeChange = async (value: string, option: any) => {
    const next = { dbType: value, connectorType: option?.connectorType };
    setTargetType(next);

    const options = await fetchDataSourceOptionsU(value);
    setTargetOption(options);

    const firstId = options?.[0]?.value;
    form.setFieldValue("sinkId", firstId);
  };

  const handleSourceIdChange = async (value: string) => {
    setCurrentSourceId(value);

    if (matchMode === "1" || matchMode === "4") {
      fetchTables(value, matchMode);
    } else if (tableKeyword) {
      fetchReferenceTables(value, matchMode, tableKeyword);
    }
  };

  const handleMatchModeChange = async (value: string) => {
    setMatchMode(value);
    form.setFieldValue("matchMode", value);

    if (!currentSourceId) return;

    if (value === "1" || value === "4") {
      fetchTables(currentSourceId, value);
      setReadOnlyTables([]);
    } else {
      setData([]);
      setMultiTableList([]);
      if (tableKeyword) {
        fetchReferenceTables(currentSourceId, value, tableKeyword);
      } else {
        setReadOnlyTables([]);
      }
    }
  };

  const handleKeywordChange = (value: string) => {
    const keyword = value.trim();
    setTableKeyword(keyword);

    if (!keyword) {
      setReadOnlyTables([]);
      return;
    }

    debouncedFetchReferenceTables(currentSourceId, matchMode, keyword);
  };

  const buildTaskDraft = (): WholeSyncTaskDraft => {
  const formValues = form.getFieldsValue();

  const result: WholeSyncTaskDraft = {
    source: {
      dbType: sourceType.dbType,
      connectorType: sourceType.connectorType,
      datasourceId: formValues.sourceId,
      pluginName: sourceType.pluginName,
      fetchSize: formValues.fetchSize,
      splitSize: formValues.splitSize,
    },
    target: {
      dbType: targetType.dbType,
      connectorType: targetType.connectorType,
      datasourceId: formValues.sinkId,
      pluginName: targetType.pluginName,
      dataSaveMode: formValues.dataSaveMode,
      batchSize: formValues.batchSize,
      schemaSaveMode: formValues.schemaSaveMode,
      enableUpsert: formValues.enableUpsert,
      fieldIde: formValues.fieldIde,
    },
    tableMatch: {
      mode: matchMode as any,
    },
  };

  if (matchMode === "1" || matchMode === "4") {
    result.tableMatch.tables = multiTableList;
  }

  if (matchMode === "2" || matchMode === "3") {
    result.tableMatch.keyword = tableKeyword;
  }

  return result;
};

  return {
    loading,
    data,
    multiTableList,
    setMultiTableList,
    readOnlyTables,
    sourceType,
    targetType,
    sourceOption,
    targetOption,
    matchMode,
    tableKeyword,
    handleSourceTypeChange,
    handleTargetTypeChange,
    handleSourceIdChange,
    handleMatchModeChange,
    handleKeywordChange,
    buildTaskDraft,
  };
};

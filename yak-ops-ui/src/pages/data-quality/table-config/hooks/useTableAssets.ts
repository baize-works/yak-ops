import type { DataSourceRecord } from '@/pages/data-source/types';
import { history } from '@umijs/max';
import { message } from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { qualityTableAssetApi } from '../../service';
import type { TableAssetView, TableCandidateView } from '../../types';
import {
  CANDIDATE_PAGE_SIZE,
  PAGE_SIZE,
  tableTargetKey,
  type DataSourceTreeNode,
  unwrap,
} from '../model';

interface UseTableAssetsOptions {
  dataSourceId?: number;
  selectedDataSource?: DataSourceRecord;
  selectedSourceNode?: DataSourceTreeNode;
}

export const useTableAssets = ({
  dataSourceId,
  selectedDataSource,
  selectedSourceNode,
}: UseTableAssetsOptions) => {
  const [assets, setAssets] = useState<TableAssetView[]>([]);
  const [assetTotal, setAssetTotal] = useState(0);
  const [assetCurrent, setAssetCurrent] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [queryKeyword, setQueryKeyword] = useState('');
  const [assetLoading, setAssetLoading] = useState(false);

  const [registerOpen, setRegisterOpen] = useState(false);
  const [candidates, setCandidates] = useState<TableCandidateView[]>([]);
  const [candidateTotal, setCandidateTotal] = useState(0);
  const [candidateCurrent, setCandidateCurrent] = useState(1);
  const [candidateKeyword, setCandidateKeyword] = useState('');
  const [candidateQueryKeyword, setCandidateQueryKeyword] = useState('');
  const [candidateLoading, setCandidateLoading] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [selectedCandidates, setSelectedCandidates] = useState<
    Map<string, TableCandidateView>
  >(new Map());

  const selectedCandidateKeys = useMemo(
    () => Array.from(selectedCandidates.keys()),
    [selectedCandidates],
  );

  const selectedCandidateRecords = useMemo(
    () => Array.from(selectedCandidates.values()),
    [selectedCandidates],
  );

  const requestAssets = useCallback(
    async (
      targetDataSourceId: number,
      current: number,
      searchKeyword: string,
    ) => {
      setAssetLoading(true);
      try {
        const result = unwrap(
          await qualityTableAssetApi.page({
            current,
            pageSize: PAGE_SIZE,
            dataSourceId: targetDataSourceId,
            keyword: searchKeyword,
          }),
        );
        setAssets(result.records || []);
        setAssetTotal(result.total || 0);
      } catch (error: any) {
        setAssets([]);
        setAssetTotal(0);
        message.error(error?.message || '已注册数据表加载失败');
      } finally {
        setAssetLoading(false);
      }
    },
    [],
  );

  const requestCandidates = useCallback(
    async (
      targetDataSourceId: number,
      current: number,
      searchKeyword: string,
    ) => {
      setCandidateLoading(true);
      try {
        const result = unwrap(
          await qualityTableAssetApi.candidates({
            dataSourceId: targetDataSourceId,
            current,
            pageSize: CANDIDATE_PAGE_SIZE,
            keyword: searchKeyword,
          }),
        );
        setCandidates(result.records || []);
        setCandidateTotal(result.total || 0);
      } catch (error: any) {
        setCandidates([]);
        setCandidateTotal(0);
        message.error(error?.message || '可注册数据表加载失败');
      } finally {
        setCandidateLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setQueryKeyword(keyword.trim());
    }, 250);
    return () => window.clearTimeout(timer);
  }, [keyword]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setCandidateQueryKeyword(candidateKeyword.trim());
    }, 250);
    return () => window.clearTimeout(timer);
  }, [candidateKeyword]);

  useEffect(() => {
    if (!dataSourceId) {
      setAssets([]);
      setAssetTotal(0);
      return;
    }
    void requestAssets(dataSourceId, assetCurrent, queryKeyword);
  }, [assetCurrent, dataSourceId, queryKeyword, requestAssets]);

  useEffect(() => {
    if (!registerOpen || !dataSourceId) return;
    void requestCandidates(
      dataSourceId,
      candidateCurrent,
      candidateQueryKeyword,
    );
  }, [
    candidateCurrent,
    candidateQueryKeyword,
    dataSourceId,
    registerOpen,
    requestCandidates,
  ]);

  const resetForDataSource = () => {
    setAssetCurrent(1);
    setKeyword('');
    setQueryKeyword('');
    setRegisterOpen(false);
    setSelectedCandidates(new Map());
  };

  const openRegisterDrawer = () => {
    if (!dataSourceId) {
      message.warning('请先从左侧选择数据源');
      return;
    }
    setSelectedCandidates(new Map());
    setCandidateKeyword('');
    setCandidateQueryKeyword('');
    setCandidateCurrent(1);
    setRegisterOpen(true);
  };

  const closeRegisterDrawer = () => {
    if (registering) return;
    setRegisterOpen(false);
    setSelectedCandidates(new Map());
  };

  const updateCandidateSelection = (
    record: TableCandidateView,
    selected: boolean,
  ) => {
    setSelectedCandidates((previous) => {
      const next = new Map(previous);
      const key = tableTargetKey(record);
      if (selected) {
        next.set(key, record);
      } else {
        next.delete(key);
      }
      return next;
    });
  };

  const updateAllCandidateSelection = (
    selected: boolean,
    changedRows: TableCandidateView[],
  ) => {
    setSelectedCandidates((previous) => {
      const next = new Map(previous);
      changedRows.forEach((record) => {
        const key = tableTargetKey(record);
        if (selected) {
          next.set(key, record);
        } else {
          next.delete(key);
        }
      });
      return next;
    });
  };

  const clearCandidateSelection = () => setSelectedCandidates(new Map());

  const handleRegister = async () => {
    if (!dataSourceId || !selectedDataSource) return;
    if (!selectedCandidates.size) {
      message.warning('请至少选择一张数据表');
      return;
    }

    setRegistering(true);
    try {
      const result = unwrap(
        await qualityTableAssetApi.register({
          dataSourceId,
          dataSourceName:
            selectedDataSource.name || selectedSourceNode?.dataSourceName || '',
          tables: selectedCandidateRecords.map((record) => ({
            databaseName: record.databaseName,
            schemaName: record.schemaName,
            tableName: record.tableName,
            tableType: record.tableType,
            remarks: record.remarks,
          })),
        }),
      );
      message.success(`已注册 ${result.registered} 张数据表`);
      setRegisterOpen(false);
      setSelectedCandidates(new Map());
      setAssetCurrent(1);
      await requestAssets(dataSourceId, 1, queryKeyword);
    } catch (error: any) {
      message.error(error?.message || '数据表注册失败');
    } finally {
      setRegistering(false);
    }
  };

  const openRuleManagement = (record: TableAssetView) => {
    if (!record.monitorId) {
      message.warning('当前数据表暂无监控配置，请先新增监控');
      return;
    }
    history.push(`/data-quality/monitor/${record.monitorId}`);
  };

  const createMonitor = (record: TableAssetView) => {
    const query = new URLSearchParams({
      dataSourceId: String(record.dataSourceId),
      dataSourceName: record.dataSourceName,
      databaseName: record.databaseName || '',
      schemaName: record.schemaName || '',
      tableName: record.tableName,
    }).toString();
    history.push(`/data-quality/monitor/create?${query}`);
  };

  return {
    assets,
    assetTotal,
    assetCurrent,
    setAssetCurrent,
    keyword,
    setKeyword,
    queryKeyword,
    assetLoading,
    registerOpen,
    candidates,
    candidateTotal,
    candidateCurrent,
    setCandidateCurrent,
    candidateKeyword,
    setCandidateKeyword,
    candidateLoading,
    registering,
    selectedCandidates,
    selectedCandidateKeys,
    selectedCandidateRecords,
    requestAssets,
    resetForDataSource,
    openRegisterDrawer,
    closeRegisterDrawer,
    updateCandidateSelection,
    updateAllCandidateSelection,
    clearCandidateSelection,
    handleRegister,
    openRuleManagement,
    createMonitor,
  };
};

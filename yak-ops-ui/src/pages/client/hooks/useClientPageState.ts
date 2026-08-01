import { Form, message } from 'antd';
import { useCallback, useEffect, useState } from 'react';

import type { LinkupClient, LinkupClientMetrics } from '../api';
import { linkupClientApi } from '../api';

const normalizePageRecords = (response: any): LinkupClient[] => {
  const data = response?.data || response;

  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.records)) return data.records;
  if (Array.isArray(data?.data?.records)) return data.data.records;

  return [];
};

const normalizeMetrics = (response: any): LinkupClientMetrics | undefined => {
  const data = response?.data || response;

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return undefined;
  }

  return data as LinkupClientMetrics;
};

const normalizePort = (value?: string | number) => {
  if (value === undefined || value === null || value === '') return undefined;

  const numberValue = Number(value);
  return Number.isNaN(numberValue) ? undefined : numberValue;
};

export const useClientPageState = () => {
  const [form] = Form.useForm();

  const [clients, setClients] = useState<LinkupClient[]>([]);
  const [loading, setLoading] = useState(false);
  const [openAddModal, setOpenAddModal] = useState(false);
  const [editingClient, setEditingClient] = useState<LinkupClient>();
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [deleteLoadingId, setDeleteLoadingId] = useState<number>();
  const [metricsByClientId, setMetricsByClientId] = useState<Record<number, LinkupClientMetrics | undefined>>({});
  const [metricsLoadingIds, setMetricsLoadingIds] = useState<Set<number>>(new Set());

  const loadClientMetrics = useCallback(async (id: number) => {
    if (!id) return;

    setMetricsLoadingIds((previous) => {
      const next = new Set(previous);
      next.add(id);
      return next;
    });

    try {
      const response = await linkupClientApi.metrics(id);
      const metrics = normalizeMetrics(response);

      setMetricsByClientId((previous) => ({
        ...previous,
        [id]: metrics,
      }));
    } catch (error) {
      setMetricsByClientId((previous) => ({
        ...previous,
        [id]: undefined,
      }));
      console.error('加载客户端指标失败', error);
    } finally {
      setMetricsLoadingIds((previous) => {
        const next = new Set(previous);
        next.delete(id);
        return next;
      });
    }
  }, []);

  const loadClientMetricsBatch = useCallback(async (records: LinkupClient[]) => {
    const ids = records
      .map((item) => Number(item.id))
      .filter((id) => Number.isFinite(id) && id > 0);

    if (!ids.length) {
      setMetricsByClientId({});
      return;
    }

    setMetricsLoadingIds(new Set(ids));

    const entries = await Promise.all(
      ids.map(async (id) => {
        try {
          const response = await linkupClientApi.metrics(id);
          return [id, normalizeMetrics(response)] as const;
        } catch (error) {
          console.error(`加载客户端 ${id} 指标失败`, error);
          return [id, undefined] as const;
        }
      }),
    );

    setMetricsByClientId(Object.fromEntries(entries));
    setMetricsLoadingIds(new Set());
  }, []);

  const loadClients = useCallback(async () => {
    setLoading(true);

    try {
      const response = await linkupClientApi.page({
        pageNo: 1,
        pageSize: 999,
      });
      const records = normalizePageRecords(response);

      setClients(records);
      void loadClientMetricsBatch(records);
      return records;
    } catch (error) {
      console.error('加载客户端列表失败', error);
      message.error('客户端列表加载失败');
      return [];
    } finally {
      setLoading(false);
    }
  }, [loadClientMetricsBatch]);

  const handleOpenCreate = useCallback(() => {
    setEditingClient(undefined);
    form.resetFields();
    setOpenAddModal(true);
  }, [form]);

  const handleOpenEdit = useCallback(
    (client: LinkupClient) => {
      setEditingClient(client);
      form.resetFields();
      setOpenAddModal(true);
    },
    [form],
  );

  const handleCancelModal = useCallback(() => {
    setOpenAddModal(false);
    setEditingClient(undefined);
    form.resetFields();
  }, [form]);

  const handleSaveClient = useCallback(async () => {
    const values = await form.validateFields();

    const payload = {
      ...values,
      id: editingClient?.id,
      clientPort: normalizePort(values.clientPort),
      masterEndpoints: values.masterEndpoints?.map((endpoint, index) => ({
        ...endpoint,
        port: normalizePort(endpoint.port),
        role: 'MASTER',
        priority: endpoint.priority || index + 1,
      })),
    };

    setConfirmLoading(true);

    try {
      await linkupClientApi.saveOrUpdate(payload as any);
      message.success(editingClient ? '客户端修改成功' : '客户端创建成功');
      setOpenAddModal(false);
      setEditingClient(undefined);
      form.resetFields();
      await loadClients();
    } catch (error) {
      console.error('保存客户端失败', error);
      message.error(editingClient ? '客户端修改失败' : '客户端创建失败');
    } finally {
      setConfirmLoading(false);
    }
  }, [editingClient, form, loadClients]);

  const handleDeleteClient = useCallback(
    async (client: LinkupClient) => {
      const clientId = Number(client.id);
      if (!clientId) return;

      setDeleteLoadingId(clientId);

      try {
        await linkupClientApi.delete(clientId);
        message.success('客户端删除成功');
        await loadClients();
      } catch (error) {
        console.error('删除客户端失败', error);
        message.error('客户端删除失败');
      } finally {
        setDeleteLoadingId(undefined);
      }
    },
    [loadClients],
  );

  useEffect(() => {
    void loadClients();
  }, [loadClients]);

  return {
    clients,
    loading,
    openAddModal,
    editingClient,
    confirmLoading,
    deleteLoadingId,
    metricsByClientId,
    metricsLoadingIds,
    form,
    handleOpenCreate,
    handleOpenEdit,
    handleDeleteClient,
    handleSaveClient,
    handleCancelModal,
    loadClients,
    loadClientMetrics,
  };
};

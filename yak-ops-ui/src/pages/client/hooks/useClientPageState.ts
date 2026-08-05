import { Form, message } from 'antd';
import { useCallback, useEffect, useState } from 'react';

import { API_SUCCESS_CODE } from '@/services/http/response';

import type {
  LinkupClient,
  LinkupClientPageData,
  WorkerSchedulingStatus,
} from '../api';
import { linkupClientApi } from '../api';
import type { LinkUpWorkerFormValues } from '../components/AddClientModal';

const labelsToRecord = (
  labels?: Array<{ key?: string; value?: string }>,
): Record<string, string> => {
  return (labels || []).reduce<Record<string, string>>((result, item) => {
    const key = item.key?.trim();
    if (key) result[key] = item.value?.trim() || '';
    return result;
  }, {});
};

export const useClientPageState = () => {
  const [form] = Form.useForm<LinkUpWorkerFormValues>();
  const [clients, setClients] = useState<LinkupClient[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [openAddModal, setOpenAddModal] = useState(false);
  const [editingClient, setEditingClient] = useState<LinkupClient>();
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [deleteLoadingId, setDeleteLoadingId] = useState<string>();
  const [refreshLoadingIds, setRefreshLoadingIds] = useState<Set<string>>(
    new Set(),
  );
  const [statusLoadingIds, setStatusLoadingIds] = useState<Set<string>>(
    new Set(),
  );

  const loadClients = useCallback(async () => {
    setLoading(true);
    try {
      const response = await linkupClientApi.page({
        pageNo: 1,
        pageSize: 500,
      });
      if (response.code !== API_SUCCESS_CODE) return [];
      const data: LinkupClientPageData | undefined = response.data;
      const records = data?.records || [];
      setClients(records);
      setTotal(Number(data?.total || records.length));
      return records;
    } catch (error) {
      console.error('加载执行节点失败', error);
      message.error('执行节点加载失败');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

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

  const handleVerifyWorker = useCallback(async (baseUrl: string) => {
    setVerifying(true);
    try {
      const response = await linkupClientApi.verify(baseUrl);
      if (response.code !== API_SUCCESS_CODE || !response.data) {
        throw new Error(response.message || 'Worker 连接验证失败');
      }
      message.success(`连接成功：${response.data.nodeId}`);
      return response.data;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Worker 连接验证失败';
      message.error(errorMessage);
      throw error;
    } finally {
      setVerifying(false);
    }
  }, []);

  const handleSaveClient = useCallback(async () => {
    const values = await form.validateFields();
    const payload = {
      nodeName: values.nodeName?.trim(),
      baseUrl: values.baseUrl.trim(),
      weight: Number(values.weight || 100),
      labels: labelsToRecord(values.labels),
    };
    setConfirmLoading(true);
    try {
      const response = editingClient?.nodeId
        ? await linkupClientApi.update(editingClient.nodeId, payload)
        : await linkupClientApi.create(payload);
      if (response.code !== API_SUCCESS_CODE) return;
      message.success(editingClient ? '执行节点修改成功' : '执行节点创建成功');
      setOpenAddModal(false);
      setEditingClient(undefined);
      form.resetFields();
      await loadClients();
    } catch (error) {
      console.error('保存执行节点失败', error);
      message.error(editingClient ? '执行节点修改失败' : '执行节点创建失败');
    } finally {
      setConfirmLoading(false);
    }
  }, [editingClient, form, loadClients]);

  const handleDeleteClient = useCallback(
    async (client: LinkupClient) => {
      if (!client.nodeId) return;
      setDeleteLoadingId(client.nodeId);
      try {
        const response = await linkupClientApi.delete(client.nodeId);
        if (response.code !== API_SUCCESS_CODE) return;
        message.success('执行节点删除成功');
        await loadClients();
      } catch (error) {
        console.error('删除执行节点失败', error);
        message.error('执行节点删除失败');
      } finally {
        setDeleteLoadingId(undefined);
      }
    },
    [loadClients],
  );

  const handleRefreshWorker = useCallback(async (nodeId: string) => {
    setRefreshLoadingIds((previous) => new Set(previous).add(nodeId));
    try {
      const response = await linkupClientApi.refresh(nodeId);
      if (response.code !== API_SUCCESS_CODE || !response.data) return;
      setClients((previous) =>
        previous.map((item) =>
          item.nodeId === nodeId ? response.data : item,
        ),
      );
      message.success('节点状态已刷新');
    } catch (error) {
      console.error('刷新执行节点失败', error);
      message.error('节点状态刷新失败');
      await loadClients();
    } finally {
      setRefreshLoadingIds((previous) => {
        const next = new Set(previous);
        next.delete(nodeId);
        return next;
      });
    }
  }, [loadClients]);

  const handleChangeSchedulingStatus = useCallback(
    async (nodeId: string, schedulingStatus: WorkerSchedulingStatus) => {
      setStatusLoadingIds((previous) => new Set(previous).add(nodeId));
      try {
        const response = await linkupClientApi.updateSchedulingStatus(
          nodeId,
          schedulingStatus,
        );
        if (response.code !== API_SUCCESS_CODE || !response.data) return;
        setClients((previous) =>
          previous.map((item) =>
            item.nodeId === nodeId ? response.data : item,
          ),
        );
        const label =
          schedulingStatus === 'ENABLED'
            ? '启用'
            : schedulingStatus === 'DRAINING'
              ? '排空'
              : '禁用';
        message.success(`执行节点已${label}`);
      } catch (error) {
        console.error('更新执行节点状态失败', error);
        message.error('执行节点状态更新失败');
      } finally {
        setStatusLoadingIds((previous) => {
          const next = new Set(previous);
          next.delete(nodeId);
          return next;
        });
      }
    },
    [],
  );

  useEffect(() => {
    void loadClients();
  }, [loadClients]);

  return {
    clients,
    total,
    loading,
    openAddModal,
    editingClient,
    confirmLoading,
    verifying,
    deleteLoadingId,
    refreshLoadingIds,
    statusLoadingIds,
    form,
    handleOpenCreate,
    handleOpenEdit,
    handleDeleteClient,
    handleSaveClient,
    handleCancelModal,
    handleVerifyWorker,
    handleRefreshWorker,
    handleChangeSchedulingStatus,
    loadClients,
  };
};

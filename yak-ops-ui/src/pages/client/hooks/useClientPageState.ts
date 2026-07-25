import {Form, message} from "antd";
import {useCallback, useEffect, useMemo, useState} from "react";
import {linkupClientApi} from "../api";


export const useClientPageState = () => {
  const [form] = Form.useForm();

  const [clients, setClients] = useState<any[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<number>();
  const [openAddModal, setOpenAddModal] = useState(false);
  const [editingClient, setEditingClient] = useState<any>();
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [deleteLoadingId, setDeleteLoadingId] = useState<number>();
  const [metrics, setMetrics] = useState<any>();

  const selectedClient = useMemo(() => {
    return clients.find((item) => item.id === selectedClientId);
  }, [clients, selectedClientId]);

  const normalizePageRecords = (res: any) => {
    const data = res?.data || res;

    if (Array.isArray(data)) {
      return data;
    }

    if (Array.isArray(data?.records)) {
      return data.records;
    }

    if (Array.isArray(data?.data?.records)) {
      return data.data.records;
    }

    return [];
  };

  const loadClients = useCallback(
    async (nextSelectedId?: number) => {
      const res = await linkupClientApi.page({
        pageNo: 1,
        pageSize: 999,
      });

      const records = normalizePageRecords(res);
      setClients(records);

      if (!records.length) {
        setSelectedClientId(undefined);
        setMetrics(undefined);
        return records;
      }

      const targetId =
        nextSelectedId && records.some((item: any) => item.id === nextSelectedId)
          ? nextSelectedId
          : selectedClientId &&
          records.some((item: any) => item.id === selectedClientId)
          ? selectedClientId
          : records[0].id;

      setSelectedClientId(targetId);
      return records;
    },
    [selectedClientId]
  );

  const loadClientMetrics = useCallback(async (id?: number) => {
    const targetId = id;
    if (!targetId) {
      setMetrics(undefined);
      return;
    }

    setMetricsLoading(true);
    try {
      const res = await linkupClientApi.metrics(targetId);
      setMetrics(res?.data || res);
    } catch (e) {
      // 产生异常都认为client存在问题
      setMetrics(-1);
      console.error(e);
    } finally {
      setMetricsLoading(false);
    }
  }, []);

  const handleOpenCreate = useCallback(() => {
    setEditingClient(undefined);
    form.resetFields();
    setOpenAddModal(true);
  }, [form]);

  const handleOpenEdit = useCallback(
    (client: any) => {
      setEditingClient(client);
      form.resetFields();
      setOpenAddModal(true);
    },
    [form]
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
      clientPort: Number(values.clientPort),
    };

    setConfirmLoading(true);
    try {
      await linkupClientApi.saveOrUpdate(payload);

      message.success(editingClient ? "Client 修改成功" : "Client 创建成功");

      setOpenAddModal(false);
      setEditingClient(undefined);
      form.resetFields();

      await loadClients(editingClient?.id);
    } finally {
      setConfirmLoading(false);
    }
  }, [editingClient, form, loadClients]);

  const handleDeleteClient = useCallback(
    async (client: any) => {
      if (!client?.id) return;

      setDeleteLoadingId(client.id);
      try {
        await linkupClientApi.delete(client.id);
        message.success("Client 删除成功");

        const nextClients = await loadClients();

        if (selectedClientId === client.id) {
          const nextSelected = nextClients.find((item: any) => item.id !== client.id);
          setSelectedClientId(nextSelected?.id);
        }
      } finally {
        setDeleteLoadingId(undefined);
      }
    },
    [loadClients, selectedClientId]
  );

  useEffect(() => {
    loadClients();
  }, []);

  useEffect(() => {
    if (selectedClientId) {
      loadClientMetrics(selectedClientId);
    } else {
      setMetrics(undefined);
    }
  }, [selectedClientId, loadClientMetrics]);

  return {
    clients,
    selectedClientId,
    setSelectedClientId,
    selectedClient,

    openAddModal,
    setOpenAddModal,
    editingClient,

    confirmLoading,
    metricsLoading,
    deleteLoadingId,

    metrics,
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

import {useCallback, useEffect, useMemo, useState} from "react";
import {SeatunnelClient, seatunnelClientApi} from "../api";


export const useClientMonitoring = () => {
  const [clients, setClients] = useState<SeatunnelClient[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<number | undefined>();
  const [loading, setLoading] = useState(false);

  const loadClients = useCallback(async () => {
    try {
      setLoading(true);

      const res = await seatunnelClientApi.page({
        pageNo: 1,
        pageSize: 10,
      });


      const records = res?.data?.records || res?.data?.list || [];
      setClients(records);

      setSelectedClientId((prev) => {
        if (prev && records.some((item: SeatunnelClient) => item.id === prev)) {
          return prev;
        }
        return records?.[0]?.id;
      });
    } catch (error: any) {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadClients();
  }, [loadClients]);

  const selectedClient = useMemo(
    () => clients.find((item) => item.id === selectedClientId) || clients[0],
    [clients, selectedClientId]
  );

  return {
    clients,
    loading,
    selectedClientId,
    setSelectedClientId,
    selectedClient,
    reloadClients: loadClients,
  };
};

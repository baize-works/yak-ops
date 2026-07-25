import HttpUtils from "@/utils/HttpUtils";

export const apiPrefix = "/api/v1/devops/client";

export interface LinkupClient {
  id?: number;
  clientName: string;
  engineType: "FLINK" | "SPARK" | "ZETA";
  baseUrl: string;
  healthStatus?: number;
  healthStatusName?: string;
  clientVersion?: string;
  heartbeatTime?: string;
  version?: string;
  containerId?: string;
  clientAddress?: string;
  remark?: string;
  createTime?: string;
  updateTime?: string;
}

export interface LinkupClientMetrics {
  cpuUsage?: number;
  memoryUsage?: number;
  threadCount?: number;
  runningOps?: number;
}

export interface LinkupClientPageRequest {
  pageNo?: number;
  pageSize?: number;
  keywords?: string;
  engineTypes?: string[];
  healthStatusList?: number[];
  sortField?: string;
  sortType?: "asc" | "desc";
}

export interface LinkupClientStatistics {
  total: number;
  liveCount: number;
  downCount: number;
}

export interface LinkupClientOption {
  value: string | number;
  label: string;
  description?: string;
}

export interface LinkupClientLog {
  clientId: number;
  clientName: string;
  content: string;
}

export const linkupClientApi = {
  saveOrUpdate: (data: LinkupClient) => {
    return HttpUtils.post(`${apiPrefix}/saveOrUpdate`, data);
  },


  selectById: (
    id: number
  ): Promise<{ code: number; data: LinkupClient; message?: string }> => {
    return HttpUtils.get(`${apiPrefix}/${id}`);
  },

  delete: (id: number) => {
    return HttpUtils.delete(`${apiPrefix}/${id}`);
  },

  page: (
    data: LinkupClientPageRequest
  ): Promise<{ code: number; data: any; message?: string }> => {
    return HttpUtils.post(`${apiPrefix}/page`, data);
  },

  option: (): Promise<{
    code: number;
    data: LinkupClientOption[];
    msg?: string;
    message?: string;
  }> => {
    return HttpUtils.get(`${apiPrefix}/option`);
  },

  verifyDatasource: (
    clientId: string,
    params: {
      datasourceId: number | string;
      pluginName?: string;
      connectorType?: string;
      role?: "SOURCE" | "SINK";
      triggerMode?: "AUTO" | "MANUAL";
      forceRefresh?: boolean;
    }
  ) => {
    return HttpUtils.post(`${apiPrefix}/${clientId}/verify-datasource`, {
      ...params,
      timeoutMs: 15000,
      pollIntervalMs: 1000,
    });
  },

  metrics: (
    id: number
  ): Promise<{
    code: number;
    data: LinkupClientMetrics;
    msg?: string;
    message?: string;
  }> => {
    return HttpUtils.get(`${apiPrefix}/${id}/metrics`);
  },


};
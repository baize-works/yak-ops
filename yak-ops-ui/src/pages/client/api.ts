import type { ApiResponse } from '@/services/http/response';
import HttpUtils from '@/utils/HttpUtils';

export const apiPrefix = '/api/v1/offline/workers';

export type WorkerId = string | number;
export type WorkerHealthStatus = 'UP' | 'DOWN' | string;
export type WorkerSchedulingStatus = 'ENABLED' | 'DRAINING' | 'DISABLED';
export type WorkerRegistrationMode = 'CONFIG' | 'MANUAL';

export interface LinkupClient {
  /** 兼容旧调用方，值与 nodeId 相同。 */
  id?: WorkerId;
  nodeId: string;
  nodeName: string;
  clientName?: string;
  baseUrl: string;
  registrationMode: WorkerRegistrationMode;
  enabled: boolean;
  schedulingStatus: WorkerSchedulingStatus;
  weight: number;
  labels?: Record<string, string>;
  workerInstanceId?: string;
  engineVersion?: string;
  clientVersion?: string;
  status: WorkerHealthStatus;
  healthStatus?: number;
  startedAtMillis?: number;
  offlineOnly?: boolean;
  maxConcurrentJobs: number;
  maxQueuedJobs: number;
  runningJobs: number;
  queuedJobs: number;
  activeJobs: number;
  available: boolean;
  loadRatio: number;
  lastHeartbeatTime?: string;
  heartbeatTime?: string;
  lastSuccessTime?: string;
  consecutiveFailures: number;
  lastErrorMessage?: string;
  createTime?: string;
  updateTime?: string;

  /** 旧客户端页面尚可能引用的兼容字段。 */
  engineType?: string;
  deployMode?: string;
  protocol?: string;
  contextPath?: string;
  clientAddress?: string;
  clientPort?: string | number;
  version?: string;
  containerId?: string;
  remark?: string;
}

export interface LinkupClientMetrics {
  runningJobs?: number;
  queuedJobs?: number;
  activeJobs?: number;
  maxConcurrentJobs?: number;
  maxQueuedJobs?: number;
  loadRatio?: number;
}

export interface LinkupClientPageRequest {
  pageNo?: number;
  pageSize?: number;
  keyword?: string;
  keywords?: string;
  status?: string;
  schedulingStatus?: WorkerSchedulingStatus;
  enabled?: boolean;
}

export interface LinkupClientPageData {
  records: LinkupClient[];
  total: number;
  pageNo: number;
  pageSize: number;
}

export interface LinkupClientSaveRequest {
  nodeName?: string;
  baseUrl: string;
  weight?: number;
  labels?: Record<string, string>;
}

export interface LinkupClientOption {
  value: string;
  label: string;
  status?: string;
  schedulingStatus?: string;
  runningJobs?: number;
  maxConcurrentJobs?: number;
  queuedJobs?: number;
  maxQueuedJobs?: number;
  available?: boolean;
}

const workerPath = (nodeId: WorkerId) => encodeURIComponent(String(nodeId));

const normalizeWorker = (worker: LinkupClient): LinkupClient => ({
  ...worker,
  id: worker.nodeId,
  clientName: worker.nodeName,
  clientVersion: worker.engineVersion,
  version: worker.engineVersion,
  heartbeatTime: worker.lastHeartbeatTime,
  engineType: 'LINK_UP',
  healthStatus:
    worker.status === 'UP'
      ? worker.schedulingStatus === 'DRAINING'
        ? 2
        : 1
      : 0,
});

const normalizePage = (
  response: ApiResponse<LinkupClientPageData>,
): ApiResponse<LinkupClientPageData> => ({
  ...response,
  data: {
    records: (response.data?.records || []).map(normalizeWorker),
    total: Number(response.data?.total || 0),
    pageNo: Number(response.data?.pageNo || 1),
    pageSize: Number(response.data?.pageSize || 20),
  },
});

export const linkupClientApi = {
  create: (
    data: LinkupClientSaveRequest,
  ): Promise<ApiResponse<LinkupClient>> => {
    return HttpUtils.post(apiPrefix, data);
  },

  update: (
    nodeId: WorkerId,
    data: LinkupClientSaveRequest,
  ): Promise<ApiResponse<LinkupClient>> => {
    return HttpUtils.put(`${apiPrefix}/${workerPath(nodeId)}`, data);
  },

  saveOrUpdate: (
    data: LinkupClientSaveRequest & { nodeId?: string; id?: WorkerId },
  ): Promise<ApiResponse<LinkupClient>> => {
    const nodeId = data.nodeId || data.id;
    return nodeId
      ? linkupClientApi.update(nodeId, data)
      : linkupClientApi.create(data);
  },

  verify: (baseUrl: string): Promise<ApiResponse<LinkupClient>> => {
    return HttpUtils.post(`${apiPrefix}/verify`, { baseUrl });
  },

  selectById: (nodeId: WorkerId): Promise<ApiResponse<LinkupClient>> => {
    return HttpUtils.get(`${apiPrefix}/${workerPath(nodeId)}`);
  },

  delete: (nodeId: WorkerId): Promise<ApiResponse<boolean>> => {
    return HttpUtils.delete(`${apiPrefix}/${workerPath(nodeId)}`);
  },

  page: async (
    data: LinkupClientPageRequest,
  ): Promise<ApiResponse<LinkupClientPageData>> => {
    const response = await HttpUtils.post<LinkupClientPageData>(
      `${apiPrefix}/page`,
      {
        ...data,
        keyword: data.keyword ?? data.keywords,
      },
    );
    return normalizePage(response);
  },

  option: (): Promise<ApiResponse<LinkupClientOption[]>> => {
    return HttpUtils.get(`${apiPrefix}/options`);
  },

  refresh: (nodeId: WorkerId): Promise<ApiResponse<LinkupClient>> => {
    return HttpUtils.post(`${apiPrefix}/${workerPath(nodeId)}/refresh`, {});
  },

  updateSchedulingStatus: (
    nodeId: WorkerId,
    schedulingStatus: WorkerSchedulingStatus,
  ): Promise<ApiResponse<LinkupClient>> => {
    return HttpUtils.put(
      `${apiPrefix}/${workerPath(nodeId)}/scheduling-status`,
      { schedulingStatus },
    );
  },

  metrics: async (
    nodeId: WorkerId,
  ): Promise<ApiResponse<LinkupClientMetrics>> => {
    const response = await linkupClientApi.selectById(nodeId);
    return {
      ...response,
      data: response.data
        ? {
            runningJobs: response.data.runningJobs,
            queuedJobs: response.data.queuedJobs,
            activeJobs: response.data.activeJobs,
            maxConcurrentJobs: response.data.maxConcurrentJobs,
            maxQueuedJobs: response.data.maxQueuedJobs,
            loadRatio: response.data.loadRatio,
          }
        : {},
    };
  },

  /** 保留旧的数据源验证代理入口，避免影响尚未迁移的调用方。 */
  verifyDatasource: (
    clientId: WorkerId,
    params: {
      datasourceId: number | string;
      pluginName?: string;
      connectorType?: string;
      role?: 'SOURCE' | 'SINK';
      triggerMode?: 'AUTO' | 'MANUAL';
      forceRefresh?: boolean;
    },
  ) => {
    return HttpUtils.post(
      `/api/v1/devops/client/${workerPath(clientId)}/verify-datasource`,
      {
        ...params,
        timeoutMs: 15000,
        pollIntervalMs: 1000,
      },
    );
  },
};

import HttpUtils from '@/utils/HttpUtils';

export enum Operate {
  Add,
  Edit,
}

export interface LinkupJobDefinition {
  id?: string | number;
  jobName?: string;
  jobDesc?: string;
  jobDefinitionInfo?: unknown;
  jobVersion?: number;
  clientId?: string | number;
  clientType?: string;
  createTime?: string;
  updateTime?: string;
}

export interface OfflineApiResponse<T> {
  code: number;
  data: T;
  message?: string;
  msg?: string;
}

export const apiPrefix = '/api/v1/job/batch-definition';

const normalizeLegacySuccessCode = <T extends { code: number }>(response: T): T =>
  response?.code === 200 ? ({ ...response, code: 0 } as T) : response;

export const linkupJobDefinitionApi = {
  /** SCRIPT 模式保存/更新。 */
  saveOrUpdateScript: (data: any) => {
    return HttpUtils.post(`${apiPrefix}/script/saveOrUpdate`, data);
  },

  /** GUIDE_SINGLE 模式保存/更新。 */
  saveOrUpdateGuideSingle: (data: any) => {
    return HttpUtils.post(`${apiPrefix}/guide-single/saveOrUpdate`, data);
  },

  /** GUIDE_MULTI 模式保存/更新。 */
  saveOrUpdateGuideMulti: (data: any) => {
    return HttpUtils.post(`${apiPrefix}/guide-multi/saveOrUpdate`, data);
  },

  selectById: (
    id: string | number,
  ): Promise<OfflineApiResponse<LinkupJobDefinition>> => {
    return HttpUtils.get(`${apiPrefix}/${id}`);
  },

  /** 编辑页详情查询。 */
  selectEditDetail: (
    id: string | number,
  ): Promise<OfflineApiResponse<any>> => {
    return HttpUtils.get(`${apiPrefix}/${id}/edit-detail`);
  },

  /**
   * 列表页仍按历史约定以 code=0 判断成功。
   * 这里兼容统一响应协议的 code=200，避免旧服务返回值被误判。
   */
  getUniqueId: async (): Promise<OfflineApiResponse<string | number>> => {
    const response = await HttpUtils.get<string | number>(
      `${apiPrefix}/get-unique-id`,
    );
    return normalizeLegacySuccessCode(response);
  },

  delete: (id: string | number) => {
    return HttpUtils.delete(`${apiPrefix}/${id}`);
  },

  /** 任务上线。 */
  online: (
    id: string | number,
  ): Promise<OfflineApiResponse<boolean>> => {
    return HttpUtils.put(`${apiPrefix}/${id}/online`);
  },

  /** 任务下线。 */
  offline: (
    id: string | number,
  ): Promise<OfflineApiResponse<boolean>> => {
    return HttpUtils.put(`${apiPrefix}/${id}/offline`);
  },

  page: (data: any): Promise<OfflineApiResponse<any>> => {
    return HttpUtils.post(`${apiPrefix}/page`, data);
  },

  /** GUIDE_SINGLE 模式预览 HOCON。 */
  buildGuideSingleConfig: (
    data: any,
  ): Promise<OfflineApiResponse<string>> => {
    return HttpUtils.post(`${apiPrefix}/guide-single/build-config`, data);
  },

  /** GUIDE_MULTI 模式预览 HOCON。 */
  buildGuideMultiConfig: (
    data: any,
  ): Promise<OfflineApiResponse<string>> => {
    return HttpUtils.post(`${apiPrefix}/guide-multi/build-config`, data);
  },

  /** SCRIPT 模式预览 HOCON。 */
  buildScriptConfig: (
    data: any,
  ): Promise<OfflineApiResponse<string>> => {
    return HttpUtils.post(`${apiPrefix}/script/build-config`, data);
  },

  hocon: (data: any) => {
    return HttpUtils.post(`${apiPrefix}/buildHoconConfig`, data);
  },
};

/** Yak Ops 对 Link-Up 的统一执行代理，前端不直接访问引擎地址。 */
export const executeApiPrefix = '/api/v1/job/batch-execution';

export const linkupJobExecuteApi = {
  health: (): Promise<OfflineApiResponse<any>> => {
    return HttpUtils.get(`${executeApiPrefix}/health`);
  },

  execute: (jobDefineId: string | number) => {
    return HttpUtils.get(
      `${executeApiPrefix}/execute?jobDefineId=${encodeURIComponent(jobDefineId)}`,
    );
  },

  pause: (jobInstanceId: string | number) => {
    return HttpUtils.get(
      `${executeApiPrefix}/pause?jobInstanceId=${encodeURIComponent(jobInstanceId)}`,
    );
  },
};

const instanceApiPrefix = '/api/v1/job/batch-instance';

export const linkupJobInstanceApi = {
  page: (data: any): Promise<OfflineApiResponse<any>> => {
    return HttpUtils.post(`${instanceApiPrefix}/page`, data);
  },

  selectById: (
    id: string | number,
  ): Promise<OfflineApiResponse<any>> => {
    return HttpUtils.get(`${instanceApiPrefix}/${id}`);
  },

  getLog(instanceId: string | number) {
    return HttpUtils.get(`${instanceApiPrefix}/${instanceId}/log`);
  },
};

const linkupJobScheduleApiPrefix = '/api/v1/job/schedule';

export const linkupJobScheduleApi = {
  getLast5ExecutionTimes: (cron: string) => {
    return HttpUtils.get<any[]>(
      `${linkupJobScheduleApiPrefix}/last5-execution-times?cron=${encodeURIComponent(cron)}`,
    );
  },

  stopSchedule: (jobScheduleId: string) => {
    return HttpUtils.get<any[]>(
      `${linkupJobScheduleApiPrefix}/stop-schedule?scheduleId=${encodeURIComponent(jobScheduleId)}`,
    );
  },

  startSchedule: (jobScheduleId: string) => {
    return HttpUtils.get<any[]>(
      `${linkupJobScheduleApiPrefix}/start-schedule?scheduleId=${encodeURIComponent(jobScheduleId)}`,
    );
  },
};

const linkupCopilotApiPrefix = '/api/v1/copilot/ai';

export const linkupCopilotApi = {
  copilot: (data: any) => {
    return HttpUtils.post<any[]>(`${linkupCopilotApiPrefix}/agent`, data);
  },
};

export const batchJobInstanceApi = {
  page: (data: any) => {
    return HttpUtils.post('/api/v1/job/batch-instance/page', data);
  },

  detail: (id: string | number) => {
    return HttpUtils.get(`/api/v1/job/batch-instance/${id}`);
  },

  tableMetrics: (instanceId: string | number) => {
    return HttpUtils.get(
      `/api/v1/job/batch-instance/${instanceId}/table-metrics`,
    );
  },

  log: (instanceId: string | number) => {
    return HttpUtils.get(`/api/v1/job/batch-instance/${instanceId}/log`);
  },
};

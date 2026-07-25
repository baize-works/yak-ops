import HttpUtils from '@/utils/HttpUtils';

export enum Operate {
  Add,
  Edit,
}

export interface LinkupJobDefinition {
  id?: any;
  jobName?: any;
  jobDesc?: any;
  jobDefinitionInfo?: any;
  jobVersion?: any;
  clientId?: any;
  clientType?: any;
  createTime?: any;
  updateTime?: any;
}

export const apiPrefix = '/api/v1/job/batch-definition';

export const linkupJobDefinitionApi = {
  /**
   * SCRIPT 模式保存/更新
   */
  saveOrUpdateScript: (data: any) => {
    return HttpUtils.post(`${apiPrefix}/script/saveOrUpdate`, data);
  },

  /**
   * GUIDE_SINGLE 模式保存/更新
   */
  saveOrUpdateGuideSingle: (data: any) => {
    return HttpUtils.post(`${apiPrefix}/guide-single/saveOrUpdate`, data);
  },

  /**
   * GUIDE_MULTI 模式保存/更新
   */
  saveOrUpdateGuideMulti: (data: any) => {
    return HttpUtils.post(`${apiPrefix}/guide-multi/saveOrUpdate`, data);
  },

  selectById: (
    id: any,
  ): Promise<{ code: number; data: LinkupJobDefinition; message?: string }> => {
    return HttpUtils.get(`${apiPrefix}/${id}`);
  },

  /**
   * 编辑页详情查询
   */
  selectEditDetail: (
    id: any,
  ): Promise<{ code: number; data: any; message?: string; msg?: string }> => {
    return HttpUtils.get(`${apiPrefix}/${id}/edit-detail`);
  },

  getUniqueId: (): Promise<{ code: number; data: LinkupJobDefinition; message?: string }> => {
    return HttpUtils.get(`${apiPrefix}/get-unique-id`);
  },

  delete: (id: string) => {
    return HttpUtils.delete(`${apiPrefix}/${id}`);
  },

  /**
   * 任务上线
   */
  online: (id: string | number): Promise<{ code: number; data: boolean; message?: string; msg?: string }> => {
    return HttpUtils.put(`${apiPrefix}/${id}/online`);
  },

  /**
   * 任务下线
   */
  offline: (id: string | number): Promise<{ code: number; data: boolean; message?: string; msg?: string }> => {
    return HttpUtils.put(`${apiPrefix}/${id}/offline`);
  },

  page: (data: any): Promise<{ code: number; data: any; message?: string }> => {
    return HttpUtils.post(`${apiPrefix}/page`, data);
  },

  /**
   * GUIDE_SINGLE 模式预览 HOCON
   */
  buildGuideSingleConfig: (
    data: any,
  ): Promise<{ code: number; data: string; message?: string }> => {
    return HttpUtils.post(`${apiPrefix}/guide-single/build-config`, data);
  },

  /**
   * GUIDE_MULTI 模式预览 HOCON
   */
  buildGuideMultiConfig: (
    data: any,
  ): Promise<{ code: number; data: string; message?: string }> => {
    return HttpUtils.post(`${apiPrefix}/guide-multi/build-config`, data);
  },


  /**
   * SCRIPT 模式预览 HOCON
   */
  buildScriptConfig: (
    data: any,
  ): Promise<{ code: number; data: string; message?: string }> => {
    return HttpUtils.post(`${apiPrefix}/script/build-config`, data);
  },

  hocon: (data: any) => {
    return HttpUtils.post(`${apiPrefix}/buildHoconConfig`, data);
  },
};

export const executeApiPrefix = '/api/v1/executor';

export const linkupJobExecuteApi = {
  execute: (jobDefineId: any) => {
    return HttpUtils.get(executeApiPrefix + '/execute?jobDefineId=' + jobDefineId);
  },

  pause: (jobInstanceId: any) => {
    return HttpUtils.get(`${executeApiPrefix}/pause?jobInstanceId=${jobInstanceId}`);
  },
};

const instanceApiPrefix = '/api/v1/job/batch-instance';

export const linkupJobInstanceApi = {
  page: (data: any): Promise<{ code: number; data: any; message?: string }> => {
    return HttpUtils.post(`${instanceApiPrefix}/page`, data);
  },

  selectById: (id: string): Promise<{ code: number; data: any; message?: string }> => {
    return HttpUtils.get(`${instanceApiPrefix}/${id}`);
  },

  getLog(instanceId: string) {
    return HttpUtils.get(`${instanceApiPrefix}/${instanceId}/log`);
  },
};

const linkupJobScheduleApiPrefix = '/api/v1/job/schedule';

export const linkupJobScheduleApi = {
  getLast5ExecutionTimes: (cron: string) => {
    return HttpUtils.get<any[]>(
      `${linkupJobScheduleApiPrefix}/last5-execution-times?cron=` + cron,
    );
  },

  stopSchedule: (jobScheduleId: string) => {
    return HttpUtils.get<any[]>(
      `${linkupJobScheduleApiPrefix}/stop-schedule?scheduleId=` + jobScheduleId,
    );
  },

  startSchedule: (jobScheduleId: string) => {
    return HttpUtils.get<any[]>(
      `${linkupJobScheduleApiPrefix}/start-schedule?scheduleId=` + jobScheduleId,
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
    return HttpUtils.post("/api/v1/job/batch-instance/page", data);
  },

  detail: (id: string | number) => {
    return HttpUtils.get(`/api/v1/job/batch-instance/${id}`);
  },

  tableMetrics: (instanceId: string | number) => {
    return HttpUtils.get(
      `/api/v1/job/batch-instance/${instanceId}/table-metrics`
    );
  },

  log: (instanceId: string | number) => {
    return HttpUtils.get(`/api/v1/job/batch-instance/${instanceId}/log`);
  },
};

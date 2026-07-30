import HttpUtils from '@/utils/HttpUtils';

export enum Operate {
  Add,
  Edit,
}

export interface DataSource {
  id?: string;
  name?: string;
  enShortName?: string;
  enName?: string;
  cnName?: string;
  director?: string;
  remark?: string;
  leaf?: boolean;
  submit?: boolean;
  parentId?: string;
  reviewer?: string;
  createBy?: string;
  createTime?: string;
  updateBy?: string;
  updateTime?: string;
  endTime?: string;
  currentVersion?: number;
}

export interface HistoryItem {
  id: string;
  jobName: string;
  jobStatus: any;
  time: string;
  endTime?: string;
  startTime: string;
}

export interface TableInfo {
  sourceDatabase: string;
  sourceTable: string;
  targetTable: string;
  method: string;
  ddl: string;
}

export const apiPrefix = '/api/v1/task-definition';

export const taskDefinitionApi = {
  create: (data: any) => {
    return HttpUtils.post(apiPrefix, data);
  },

  batch: (data: any) => {
    return HttpUtils.post(`${apiPrefix}/batch`, data);
  },

  page: (data: any): Promise<{ code: number; data: any; message?: string }> => {
    return HttpUtils.post(`${apiPrefix}/page`, data);
  },

  delete: (id: string) => {
    return HttpUtils.delete(`${apiPrefix}/${id}`);
  },

  getLast5ExecutionTimes: (id: string) => {
    return HttpUtils.get(`${apiPrefix}/${id}`);
  },
};

export const taskScheduleApiPrefix = '/api/v1/task-schedule';

export const taskScheduleApi = {
  getLast5ExecutionTimes: (cron: string) => {
    return HttpUtils.get<any[]>(
      `${taskScheduleApiPrefix}/last5-execution-times?cron=${encodeURIComponent(cron)}`,
    );
  },

  stopSchedule: (taskScheduleId: string) => {
    return HttpUtils.get<any[]>(
      `${taskScheduleApiPrefix}/stop-schedule?taskScheduleId=${encodeURIComponent(taskScheduleId)}`,
    );
  },

  startSchedule: (taskScheduleId: string) => {
    return HttpUtils.get<any[]>(
      `${taskScheduleApiPrefix}/start-schedule?taskScheduleId=${encodeURIComponent(taskScheduleId)}`,
    );
  },
};

export const linkupClientApi = {
  getLogsByInstanceId(instanceId: string | number, jobMode: any) {
    return HttpUtils.get<any[]>(
      `/api/v1/devops/client/instance/${instanceId}/logs?jobMode=${encodeURIComponent(jobMode)}`,
    );
  },
};

/** Yak Ops 对 Link-Up 的统一执行代理。 */
export const apiPrefixExecutor = '/api/v1/job/batch-execution';

export const batchJobExecutorApi = {
  batchExecute: (jobDefinitionIds: React.Key[]): any => {
    return HttpUtils.post(`${apiPrefixExecutor}/batch-execute`, {
      jobDefinitionIds: jobDefinitionIds.map(Number),
    });
  },

  batchPause: (jobDefinitionIds: React.Key[]): any => {
    return HttpUtils.post(`${apiPrefixExecutor}/batch-pause`, {
      jobDefinitionIds: jobDefinitionIds.map(Number),
    });
  },
};

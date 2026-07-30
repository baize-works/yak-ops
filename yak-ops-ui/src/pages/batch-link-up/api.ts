import type { ApiResponse } from '@/services/http/response';
import HttpUtils from '@/utils/HttpUtils';

export enum Operate {
  Add,
  Edit,
}

export interface Pagination {
  total: number;
  pages: number;
  pageNo: number;
  pageSize: number;
}

export interface PagingData<T> {
  bizData: T[];
  pagination: Pagination;
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

export interface OfflineJobDefinitionVO extends LinkupJobDefinition {
  jobType?: 'BATCH';
  mode?: string;
  releaseState?: string;
  sourceType?: string;
  sinkType?: string;
  sourceDatasourceId?: string | number;
  sinkDatasourceId?: string | number;
  sourceDatasourceName?: string;
  sinkDatasourceName?: string;
  sourceTable?: string;
  sinkTable?: string;
  lastJobStatus?: string;
  lastErrorMessage?: string;
  instanceId?: string | number;
  engineJobId?: string;
  runMode?: string;
  duration?: number;
  readRowCount?: number;
  qps?: number;
  syncSize?: string;
  cronExpression?: string;
  scheduleStatus?: string;
  lastScheduleTime?: string;
  nextScheduleTime?: string;
}

export interface OfflineJobExecutionVO {
  id: string | number;
  jobDefinitionId: string | number;
  engineJobId?: string;
  status?: string;
  errorMessage?: string;
  sourceRecordCount: number;
  sinkSuccessRecordCount: number;
  sourceReadBytes: number;
  sinkWrittenBytes: number;
  qps: number;
  durationMillis: number;
  createTime?: string;
  startTime?: string;
  endTime?: string;
  updateTime?: string;
}

export interface OfflineBatchOperationError {
  jobDefinitionId?: string | number;
  message?: string;
}

export interface OfflineBatchOperationResult {
  successCount: number;
  failedCount: number;
  errors: OfflineBatchOperationError[];
}

export type OfflineApiResponse<T> = ApiResponse<T>;

export const apiPrefix = '/api/v1/job/batch-definition';

export const linkupJobDefinitionApi = {
  /** SCRIPT 模式保存/更新。 */
  saveOrUpdateScript: (
    data: Record<string, unknown>,
  ): Promise<OfflineApiResponse<string | number>> => {
    return HttpUtils.post(`${apiPrefix}/script/saveOrUpdate`, data);
  },

  /** GUIDE_SINGLE 模式保存/更新。 */
  saveOrUpdateGuideSingle: (
    data: Record<string, unknown>,
  ): Promise<OfflineApiResponse<string | number>> => {
    return HttpUtils.post(`${apiPrefix}/guide-single/saveOrUpdate`, data);
  },

  /** GUIDE_MULTI 模式保存/更新。 */
  saveOrUpdateGuideMulti: (
    data: Record<string, unknown>,
  ): Promise<OfflineApiResponse<string | number>> => {
    return HttpUtils.post(`${apiPrefix}/guide-multi/saveOrUpdate`, data);
  },

  selectById: (
    id: string | number,
  ): Promise<OfflineApiResponse<OfflineJobDefinitionVO>> => {
    return HttpUtils.get(`${apiPrefix}/${id}`);
  },

  /** 编辑页详情查询。 */
  selectEditDetail: (
    id: string | number,
  ): Promise<OfflineApiResponse<Record<string, unknown>>> => {
    return HttpUtils.get(`${apiPrefix}/${id}/edit-detail`);
  },

  getUniqueId: (): Promise<OfflineApiResponse<string | number>> => {
    return HttpUtils.get(`${apiPrefix}/get-unique-id`);
  },

  delete: (id: string | number): Promise<OfflineApiResponse<boolean>> => {
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

  page: (
    data: Record<string, unknown>,
  ): Promise<OfflineApiResponse<PagingData<OfflineJobDefinitionVO>>> => {
    return HttpUtils.post(`${apiPrefix}/page`, data);
  },

  /** GUIDE_SINGLE 模式预览 HOCON。 */
  buildGuideSingleConfig: (
    data: Record<string, unknown>,
  ): Promise<OfflineApiResponse<string>> => {
    return HttpUtils.post(`${apiPrefix}/guide-single/build-config`, data);
  },

  /** GUIDE_MULTI 模式预览 HOCON。 */
  buildGuideMultiConfig: (
    data: Record<string, unknown>,
  ): Promise<OfflineApiResponse<string>> => {
    return HttpUtils.post(`${apiPrefix}/guide-multi/build-config`, data);
  },

  /** SCRIPT 模式预览 HOCON。 */
  buildScriptConfig: (
    data: Record<string, unknown>,
  ): Promise<OfflineApiResponse<string>> => {
    return HttpUtils.post(`${apiPrefix}/script/build-config`, data);
  },

  hocon: (
    data: Record<string, unknown>,
  ): Promise<OfflineApiResponse<string>> => {
    return HttpUtils.post(`${apiPrefix}/buildHoconConfig`, data);
  },
};

/** Yak Ops 对 Link-Up 的统一执行代理，前端不直接访问引擎地址。 */
export const executeApiPrefix = '/api/v1/job/batch-execution';

export const linkupJobExecuteApi = {
  health: (): Promise<OfflineApiResponse<Record<string, unknown>>> => {
    return HttpUtils.get(`${executeApiPrefix}/health`);
  },

  execute: (
    jobDefineId: string | number,
  ): Promise<OfflineApiResponse<OfflineJobExecutionVO>> => {
    return HttpUtils.get(
      `${executeApiPrefix}/execute?jobDefineId=${encodeURIComponent(jobDefineId)}`,
    );
  },

  pause: (
    jobInstanceId: string | number,
  ): Promise<OfflineApiResponse<OfflineJobExecutionVO>> => {
    return HttpUtils.get(
      `${executeApiPrefix}/pause?jobInstanceId=${encodeURIComponent(jobInstanceId)}`,
    );
  },
};

const instanceApiPrefix = '/api/v1/job/batch-instance';

export const linkupJobInstanceApi = {
  page: (
    data: Record<string, unknown>,
  ): Promise<OfflineApiResponse<PagingData<OfflineJobExecutionVO>>> => {
    return HttpUtils.post(`${instanceApiPrefix}/page`, data);
  },

  selectById: (
    id: string | number,
  ): Promise<OfflineApiResponse<Record<string, unknown>>> => {
    return HttpUtils.get(`${instanceApiPrefix}/${id}`);
  },

  getLog(instanceId: string | number): Promise<OfflineApiResponse<string>> {
    return HttpUtils.get(`${instanceApiPrefix}/${instanceId}/log`);
  },
};

const linkupJobScheduleApiPrefix = '/api/v1/job/schedule';

export const linkupJobScheduleApi = {
  getLast5ExecutionTimes: (
    cron: string,
  ): Promise<OfflineApiResponse<string[]>> => {
    return HttpUtils.get(
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
  page: (
    data: Record<string, unknown>,
  ): Promise<OfflineApiResponse<PagingData<OfflineJobExecutionVO>>> => {
    return HttpUtils.post('/api/v1/job/batch-instance/page', data);
  },

  detail: (
    id: string | number,
  ): Promise<OfflineApiResponse<Record<string, unknown>>> => {
    return HttpUtils.get(`/api/v1/job/batch-instance/${id}`);
  },

  tableMetrics: (
    instanceId: string | number,
  ): Promise<OfflineApiResponse<unknown>> => {
    return HttpUtils.get(
      `/api/v1/job/batch-instance/${instanceId}/table-metrics`,
    );
  },

  log: (instanceId: string | number): Promise<OfflineApiResponse<string>> => {
    return HttpUtils.get(`/api/v1/job/batch-instance/${instanceId}/log`);
  },
};

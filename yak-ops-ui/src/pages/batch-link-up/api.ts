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
  workerSelectMode?: 'AUTO' | 'MANUAL';
  workerNodeId?: string;
  workerNodeName?: string;
  workerRequiredLabels?: Record<string, string>;
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
  engineNodeId?: string;
  engineNodeBaseUrl?: string;
  engineJobId?: string;
  externalExecutionId?: string;
  workerInstanceId?: string;
  assignmentMode?: 'AUTO' | 'MANUAL';
  assignmentScore?: number;
  assignmentReason?: string;
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

const toPositiveSafeInteger = (value: unknown, fieldName: string) => {
  const normalizedValue =
    typeof value === 'string' ? value.trim() : value;
  const numericValue = Number(normalizedValue);

  if (!Number.isSafeInteger(numericValue) || numericValue < 1) {
    throw new Error(`${fieldName} 必须是安全的正整数`);
  }

  return numericValue;
};

/**
 * 实例分页接口后端使用 current，并将任务定义 ID 声明为 Long。
 * 这里统一兼容历史调用中的 pageNo/pageNum，并避免路由参数字符串触发反序列化错误。
 */
const normalizeOfflineInstancePageRequest = (
  data: Record<string, unknown>,
): Record<string, unknown> => {
  const {
    pageNo,
    pageNum,
    jobDefinitionId,
    ...rest
  } = data;
  const current = toPositiveSafeInteger(
    data.current ?? pageNo ?? pageNum ?? 1,
    '页码',
  );
  const pageSize = toPositiveSafeInteger(data.pageSize ?? 10, '每页条数');

  if (pageSize > 200) {
    throw new Error('每页条数不能超过 200');
  }

  return {
    ...rest,
    current,
    pageSize,
    ...(jobDefinitionId === undefined ||
    jobDefinitionId === null ||
    jobDefinitionId === ''
      ? {}
      : {
          jobDefinitionId: toPositiveSafeInteger(
            jobDefinitionId,
            '任务定义 ID',
          ),
        }),
  };
};

export const apiPrefix = '/api/v1/job/batch-definition';

export const linkupJobDefinitionApi = {
  /** 创建尚未配置数据源和表的草稿任务。 */
  createDraft: (
    data: Record<string, unknown>,
  ): Promise<ApiResponse<string | number>> => {
    return HttpUtils.post(`${apiPrefix}/draft`, data);
  },

  saveOrUpdateGuideSingle: (
    data: Record<string, unknown>,
  ): Promise<ApiResponse<string | number>> => {
    return HttpUtils.post(`${apiPrefix}/guide-single/saveOrUpdate`, data);
  },

  saveOrUpdateGuideMulti: (
    data: Record<string, unknown>,
  ): Promise<ApiResponse<string | number>> => {
    return HttpUtils.post(`${apiPrefix}/guide-multi/saveOrUpdate`, data);
  },

  selectById: (
    id: string | number,
  ): Promise<ApiResponse<OfflineJobDefinitionVO>> => {
    return HttpUtils.get(`${apiPrefix}/${id}`);
  },

  selectEditDetail: (
    id: string | number,
  ): Promise<ApiResponse<Record<string, unknown>>> => {
    return HttpUtils.get(`${apiPrefix}/${id}/edit-detail`);
  },

  getUniqueId: (): Promise<ApiResponse<string | number>> => {
    return HttpUtils.get(`${apiPrefix}/get-unique-id`);
  },

  delete: (id: string | number): Promise<ApiResponse<boolean>> => {
    return HttpUtils.delete(`${apiPrefix}/${id}`);
  },

  online: (
    id: string | number,
  ): Promise<ApiResponse<boolean>> => {
    return HttpUtils.put(`${apiPrefix}/${id}/online`);
  },

  offline: (
    id: string | number,
  ): Promise<ApiResponse<boolean>> => {
    return HttpUtils.put(`${apiPrefix}/${id}/offline`);
  },

  page: (
    data: Record<string, unknown>,
  ): Promise<ApiResponse<PagingData<OfflineJobDefinitionVO>>> => {
    return HttpUtils.post(`${apiPrefix}/page`, data);
  },

  buildGuideSingleConfig: (
    data: Record<string, unknown>,
  ): Promise<ApiResponse<string>> => {
    return HttpUtils.post(`${apiPrefix}/guide-single/build-config`, data);
  },

  buildGuideMultiConfig: (
    data: Record<string, unknown>,
  ): Promise<ApiResponse<string>> => {
    return HttpUtils.post(`${apiPrefix}/guide-multi/build-config`, data);
  },

  buildJobSpec: (
    data: Record<string, unknown>,
  ): Promise<ApiResponse<string>> => {
    return HttpUtils.post(`${apiPrefix}/build-job-spec`, data);
  },
};

/** Yak Ops 对 Link-Up 的统一执行代理，前端不直接访问引擎地址。 */
export const executeApiPrefix = '/api/v1/job/batch-execution';

export const linkupJobExecuteApi = {
  health: (): Promise<ApiResponse<Record<string, unknown>>> => {
    return HttpUtils.get(`${executeApiPrefix}/health`);
  },

  execute: (
    jobDefineId: string | number,
  ): Promise<ApiResponse<OfflineJobExecutionVO>> => {
    return HttpUtils.post(
      `${executeApiPrefix}/${encodeURIComponent(jobDefineId)}/execute`,
      {},
    );
  },

  pause: (
    jobInstanceId: string | number,
  ): Promise<ApiResponse<OfflineJobExecutionVO>> => {
    return HttpUtils.post(
      `${executeApiPrefix}/${encodeURIComponent(jobInstanceId)}/cancel`,
      {},
    );
  },
};

const instanceApiPrefix = '/api/v1/job/batch-instance';

export const linkupJobInstanceApi = {
  page: (
    data: Record<string, unknown>,
  ): Promise<ApiResponse<PagingData<OfflineJobExecutionVO>>> => {
    return HttpUtils.post(
      `${instanceApiPrefix}/page`,
      normalizeOfflineInstancePageRequest(data),
    );
  },

  selectById: (
    id: string | number,
  ): Promise<ApiResponse<Record<string, unknown>>> => {
    return HttpUtils.get(`${instanceApiPrefix}/${id}`);
  },

  getLog(instanceId: string | number): Promise<ApiResponse<string>> {
    return HttpUtils.get(`${instanceApiPrefix}/${instanceId}/log`);
  },
};

const linkupJobScheduleApiPrefix = '/api/v1/job/schedule';

export const linkupJobScheduleApi = {
  getLast5ExecutionTimes: (
    cron: string,
  ): Promise<ApiResponse<string[]>> => {
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
  ): Promise<ApiResponse<PagingData<OfflineJobExecutionVO>>> => {
    return HttpUtils.post(
      '/api/v1/job/batch-instance/page',
      normalizeOfflineInstancePageRequest(data),
    );
  },

  detail: (
    id: string | number,
  ): Promise<ApiResponse<Record<string, unknown>>> => {
    return HttpUtils.get(`/api/v1/job/batch-instance/${id}`);
  },

  tableMetrics: (
    instanceId: string | number,
  ): Promise<ApiResponse<unknown>> => {
    return HttpUtils.get(
      `/api/v1/job/batch-instance/${instanceId}/table-metrics`,
    );
  },

  log: (instanceId: string | number): Promise<ApiResponse<string>> => {
    return HttpUtils.get(`/api/v1/job/batch-instance/${instanceId}/log`);
  },
};

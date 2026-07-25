import HttpUtils from '@/utils/HttpUtils';
import type {ApiResponse} from '@/utils/request';
import {ALARM_API_PREFIX} from './constants';
import type {
  AlarmChannelCommand,
  AlarmChannelRecord,
  AlarmRecordPage,
  AlarmRecordQuery,
  AlarmRuleCommand,
  AlarmRuleRecord,
  ChannelTypeVO,
  JobDefinitionOption,
} from './types';

// -------------------- alarm 接口 --------------------

/** 通道类型（SPI 工厂下发，含动态表单字段） */
export async function fetchChannelTypes(): Promise<ApiResponse<ChannelTypeVO[]>> {
  return HttpUtils.get(`${ALARM_API_PREFIX}/channel-types`);
}

/** 通道实例列表 */
export async function fetchChannels(): Promise<ApiResponse<AlarmChannelRecord[]>> {
  return HttpUtils.get(`${ALARM_API_PREFIX}/channels`);
}

/** 通道保存（id 为空则新建，否则更新） */
export async function saveChannel(
  payload: AlarmChannelCommand,
): Promise<ApiResponse<number>> {
  return HttpUtils.post(`${ALARM_API_PREFIX}/channels`, payload as any);
}

/** 通道删除 */
export async function deleteChannel(
  id: number,
): Promise<ApiResponse<boolean>> {
  return HttpUtils.delete(`${ALARM_API_PREFIX}/channels/${id}`);
}

/** 通道连通性测试 */
export async function testChannel(payload: {
  channelType: string;
  configJson: string;
}): Promise<ApiResponse<{ success: boolean; message?: string }>> {
  return HttpUtils.post(`${ALARM_API_PREFIX}/channels/test`, payload);
}

/** 规则列表 */
export async function fetchRules(): Promise<ApiResponse<AlarmRuleRecord[]>> {
  return HttpUtils.get(`${ALARM_API_PREFIX}/rules`);
}

/** 规则保存（id 为空则新建，否则更新） */
export async function saveRule(
  payload: AlarmRuleCommand,
): Promise<ApiResponse<number>> {
  return HttpUtils.post(`${ALARM_API_PREFIX}/rules`, payload as any);
}

/** 规则删除 */
export async function deleteRule(id: number): Promise<ApiResponse<boolean>> {
  return HttpUtils.delete(`${ALARM_API_PREFIX}/rules/${id}`);
}

/** 规则关联的通道 id 列表 */
export async function fetchRuleChannels(
  id: number,
): Promise<ApiResponse<number[]>> {
  return HttpUtils.get(`${ALARM_API_PREFIX}/rules/${id}/channels`);
}

/** 所有规则-通道关联（批量加载，用于规则列表展示关联通道） */
export async function fetchAllRuleChannels(): Promise<ApiResponse<Array<{ ruleId: number; channelId: number }>>> {
  return HttpUtils.get(`${ALARM_API_PREFIX}/rules/all-channels`);
}

/** 告警记录分页（含 total 和可选筛选） */
export async function fetchAlarmRecords(
  params: AlarmRecordQuery,
): Promise<ApiResponse<AlarmRecordPage>> {
  const {pageNo, pageSize, jobInstanceId, channelType, severity, success} = params;
  const searchParams = new URLSearchParams();
  searchParams.set('pageNo', String(pageNo));
  searchParams.set('pageSize', String(pageSize));
  if (jobInstanceId != null) searchParams.set('jobInstanceId', String(jobInstanceId));
  if (channelType) searchParams.set('channelType', channelType);
  if (severity) searchParams.set('severity', severity);
  if (success != null) searchParams.set('success', String(success));
  return HttpUtils.get(`${ALARM_API_PREFIX}/records?${searchParams.toString()}`);
}

// -------------------- 任务定义合并拉取 --------------------

const BATCH_DEFINITION_API = '/api/v1/job/batch-definition';

interface JobDefinitionPageItem {
  id: number;
  jobName: string;
}

interface JobDefinitionPageResult {
  bizData: JobDefinitionPageItem[];
  pagination: { total: number; pageNo: number; pageSize: number };
}

/**
 * 拉取离线任务定义，作为下拉选项。
 * 后端分页接口返回 { code, data: { bizData, pagination } }。
 */
export async function fetchAllJobDefinitions(): Promise<JobDefinitionOption[]> {
  const body = {pageNo: 1, pageSize: 1000};
  const batchRes = await HttpUtils.post<JobDefinitionPageResult>(
    `${BATCH_DEFINITION_API}/page`,
    body,
  ).catch(() => null);

  const result: JobDefinitionOption[] = [];

  const batchList = (batchRes as ApiResponse<JobDefinitionPageResult> | null)?.data
    ?.bizData;
  if (Array.isArray(batchList)) {
    batchList.forEach((item) => {
      if (item?.id != null && item?.jobName) {
        result.push({id: item.id, jobName: item.jobName, type: 'batch'});
      }
    });
  }


  return result;
}

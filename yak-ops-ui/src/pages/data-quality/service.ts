import HttpUtils from '@/utils/HttpUtils';
import type {
  CommonApiResponse,
  ExecutionPageView,
  ExecutionView,
  MonitorPageView,
  MonitorReportView,
  MonitorSettingsView,
  MonitorView,
  MonitorWorkspaceView,
  OperationLogPageView,
  RegisterTablesPayload,
  RegisterTablesView,
  RunView,
  SaveMonitorPayload,
  TableAssetPageView,
  TableCandidatePageView,
  TableMonitorSummary,
  TemplateListView,
} from './types';

const PREFIX = '/api/v1/data-quality';

const queryString = (params: Record<string, unknown>) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).length > 0) {
      search.set(key, String(value));
    }
  });
  const value = search.toString();
  return value ? `?${value}` : '';
};

export const qualityTemplateApi = {
  list: (params: Record<string, unknown> = {}): Promise<CommonApiResponse<TemplateListView>> =>
    HttpUtils.get<TemplateListView>(`${PREFIX}/template${queryString(params)}`),
};

export const qualityTableAssetApi = {
  page: (params: Record<string, unknown>): Promise<CommonApiResponse<TableAssetPageView>> =>
    HttpUtils.post<TableAssetPageView>(`${PREFIX}/table-asset/page`, params),
  candidates: (
    params: Record<string, unknown>,
  ): Promise<CommonApiResponse<TableCandidatePageView>> =>
    HttpUtils.get<TableCandidatePageView>(
      `${PREFIX}/table-asset/candidates${queryString(params)}`,
    ),
  register: (
    payload: RegisterTablesPayload,
  ): Promise<CommonApiResponse<RegisterTablesView>> =>
    HttpUtils.post<RegisterTablesView>(`${PREFIX}/table-asset/register`, payload),
  remove: (id: number | string): Promise<CommonApiResponse<boolean>> =>
    HttpUtils.delete<boolean>(`${PREFIX}/table-asset/${id}`),
};

export const qualityMonitorApi = {
  page: (params: Record<string, unknown>): Promise<CommonApiResponse<MonitorPageView>> =>
    HttpUtils.post<MonitorPageView>(`${PREFIX}/monitor/page`, params),
  tableSummary: (params: {
    dataSourceId: number;
    databaseName?: string;
    schemaName?: string;
  }): Promise<CommonApiResponse<TableMonitorSummary[]>> =>
    HttpUtils.get<TableMonitorSummary[]>(
      `${PREFIX}/monitor/table-summary${queryString(params)}`,
    ),
  detail: (id: number | string): Promise<CommonApiResponse<MonitorView>> =>
    HttpUtils.get<MonitorView>(`${PREFIX}/monitor/${id}`),
  settings: (id: number | string): Promise<CommonApiResponse<MonitorSettingsView>> =>
    HttpUtils.get<MonitorSettingsView>(`${PREFIX}/monitor/${id}/settings`),
  create: (payload: SaveMonitorPayload): Promise<CommonApiResponse<MonitorView>> =>
    HttpUtils.post<MonitorView>(`${PREFIX}/monitor`, payload),
  update: (
    id: number | string,
    payload: SaveMonitorPayload,
  ): Promise<CommonApiResponse<MonitorView>> =>
    HttpUtils.put<MonitorView>(`${PREFIX}/monitor/${id}`, payload),
  remove: (id: number | string): Promise<CommonApiResponse<boolean>> =>
    HttpUtils.delete<boolean>(`${PREFIX}/monitor/${id}`),
  run: (id: number | string): Promise<CommonApiResponse<RunView>> =>
    HttpUtils.post<RunView>(`${PREFIX}/monitor/${id}/run`, {}),
};

export const qualityWorkspaceApi = {
  workspace: (
    id: number | string,
  ): Promise<CommonApiResponse<MonitorWorkspaceView>> =>
    HttpUtils.get<MonitorWorkspaceView>(`${PREFIX}/monitor/${id}/workspace`),
  report: (
    id: number | string,
    params: { date?: string } = {},
  ): Promise<CommonApiResponse<MonitorReportView>> =>
    HttpUtils.get<MonitorReportView>(
      `${PREFIX}/monitor/${id}/report${queryString(params)}`,
    ),
  operationLogs: (
    id: number | string,
    params: { current?: number; pageSize?: number } = {},
  ): Promise<CommonApiResponse<OperationLogPageView>> =>
    HttpUtils.get<OperationLogPageView>(
      `${PREFIX}/monitor/${id}/operation-log${queryString(params)}`,
    ),
};

export const qualityExecutionApi = {
  page: (params: Record<string, unknown>): Promise<CommonApiResponse<ExecutionPageView>> =>
    HttpUtils.post<ExecutionPageView>(`${PREFIX}/execution/page`, params),
  detail: (executionNo: string): Promise<CommonApiResponse<ExecutionView>> =>
    HttpUtils.get<ExecutionView>(`${PREFIX}/execution/${executionNo}`),
};

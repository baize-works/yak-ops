import { securityGetData } from './client';

const OPLOG_API = '/api/v1/oplog';
export interface OperationLog {
  id: number | string;
  operationType: string;
  operatorName?: string;
  targetType?: string;
  targetId?: string;
  result?: string;
  ip?: string;
  operationTime?: string;
}
export interface OperationLogDetail extends OperationLog {
  requestJson?: string | Record<string, unknown>;
  responseJson?: string | Record<string, unknown>;
  detailJson?: string | Record<string, unknown>;
}
export interface OperationLogPage { records: OperationLog[]; total: number }
export interface OperationLogQuery {
  pageNum: number; pageSize: number; operationType?: string; operatorName?: string;
  target?: string; startTime?: string; endTime?: string;
}
const query = (values: object) => {
  const params = new URLSearchParams();
  Object.entries(values as Record<string, unknown>).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value));
  });
  return params.toString();
};
export const pageOperationLogs = (params: OperationLogQuery) =>
  securityGetData<OperationLogPage>(`${OPLOG_API}/page?${query(params)}`);
export const getOperationLog = (id: number | string) =>
  securityGetData<OperationLogDetail>(`${OPLOG_API}/detail?id=${encodeURIComponent(id)}`);

export const formatJsonText = (value: unknown): string => {
  if (typeof value !== 'string') return JSON.stringify(value ?? '', null, 2);
  try { return JSON.stringify(JSON.parse(value), null, 2); } catch { return value; }
};

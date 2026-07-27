import {
  securityGetData,
  securityPostData,
} from './client';

const OPLOG_API = '/api/v1/oplog';

export interface OperationLog {
  id: number;
  operatorIp?: string;
  operator?: string;
  operatePage?: string;
  operateType?: string;
  operationMethods?: string;
  target?: string;
  targetType?: string;
  detail?: string;
  createTime?: string;
  updateTime?: string;
}

export type OperationLogDetail = OperationLog;

export interface OperationLogOptions {
  operateTypes: string[];
  operatePages: string[];
  operationMethods: string[];
  targetTypes: string[];
}

export interface OperationLogQuery {
  pageNum: number;
  pageSize: number;
  operateType?: string;
  operatePage?: string;
  operationMethods?: string;
  operator?: string;
  operatorIp?: string;
  target?: string;
  targetType?: string;
  detail?: string;
  startTime?: number;
  endTime?: number;
}

export interface OperationLogPage {
  records: OperationLog[];
  total: number;
}

interface BackendPagingData<T> {
  bizData?: T[];
  pagination?: {
    total?: number;
    pages?: number;
    pageNo?: number;
    pageSize?: number;
  };
}

const normalizeOptions = (
  value?: Partial<OperationLogOptions>,
): OperationLogOptions => ({
  operateTypes: Array.isArray(value?.operateTypes)
    ? value.operateTypes
    : [],
  operatePages: Array.isArray(value?.operatePages)
    ? value.operatePages
    : [],
  operationMethods: Array.isArray(value?.operationMethods)
    ? value.operationMethods
    : [],
  targetTypes: Array.isArray(value?.targetTypes)
    ? value.targetTypes
    : [],
});

export const pageOperationLogs = async (
  params: OperationLogQuery,
): Promise<OperationLogPage> => {
  const data = await securityPostData<
    BackendPagingData<OperationLog>
  >(`${OPLOG_API}/page`, {
    page: params.pageNum,
    size: params.pageSize,
    operateType: params.operateType,
    operatePage: params.operatePage,
    operationMethods: params.operationMethods,
    operator: params.operator,
    operatorIp: params.operatorIp,
    target: params.target,
    targetType: params.targetType,
    detail: params.detail,
    startTime: params.startTime,
    endTime: params.endTime,
  });

  return {
    records: Array.isArray(data?.bizData)
      ? data.bizData
      : [],
    total: Number(data?.pagination?.total ?? 0),
  };
};

export const getOperationLog = (
  id: number | string,
): Promise<OperationLogDetail> =>
  securityGetData<OperationLogDetail>(
    `${OPLOG_API}/${encodeURIComponent(String(id))}`,
  );

export const getOperationLogOptions = async (): Promise<OperationLogOptions> =>
  normalizeOptions(
    await securityGetData<Partial<OperationLogOptions>>(
      `${OPLOG_API}/options`,
    ),
  );

export const formatJsonText = (value: unknown): string => {
  if (value === undefined || value === null || value === '') {
    return '';
  }

  if (typeof value !== 'string') {
    return JSON.stringify(value, null, 2);
  }

  const text = value.trim();
  if (!text) return '';

  try {
    return JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    return value;
  }
};

export const isJsonText = (value: unknown): boolean => {
  if (typeof value !== 'string' || !value.trim()) {
    return false;
  }

  try {
    JSON.parse(value);
    return true;
  } catch {
    return false;
  }
};

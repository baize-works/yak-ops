import {
  securityDeleteData,
  securityGetData,
  securityPostData,
  securityPutData,
} from './client';

const CONFIG_API = '/api/v1/config';

export type ConfigStatus = 1 | 2;

export interface SystemConfig {
  id: number;
  valueGroup: string;
  valueName: string;
  value: string;
  status: ConfigStatus;
  memo?: string;
  operator?: string;
  createTime?: string;
  updateTime?: string;
}

export interface ConfigPageQuery {
  pageNum: number;
  pageSize: number;
  id?: number;
  valueGroup?: string;
  valueName?: string;
  status?: ConfigStatus;
  memo?: string;
  operator?: string;
}

export interface ConfigInput {
  valueGroup: string;
  valueName: string;
  value: string;
  status: ConfigStatus;
  memo?: string;
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

export interface ConfigPage {
  records: SystemConfig[];
  total: number;
}

const clean = (value?: string): string | undefined => {
  const normalized = value?.trim();
  return normalized || undefined;
};

export const pageConfigs = async (
  params: ConfigPageQuery,
): Promise<ConfigPage> => {
  const data = await securityPostData<
    BackendPagingData<SystemConfig>
  >(`${CONFIG_API}/page`, {
    page: params.pageNum,
    size: params.pageSize,
    id: params.id,
    valueGroup: clean(params.valueGroup),
    valueName: clean(params.valueName),
    status: params.status,
    memo: clean(params.memo),
    operator: clean(params.operator),
  });

  return {
    records: Array.isArray(data?.bizData)
      ? data.bizData
      : [],
    total: Number(data?.pagination?.total ?? 0),
  };
};

export const listConfigGroups = async (): Promise<string[]> => {
  const data = await securityGetData<string[]>(
    `${CONFIG_API}/group/list`,
  );

  if (!Array.isArray(data)) return [];

  return [
    ...new Set(
      data
        .filter(
          (value): value is string =>
            typeof value === 'string' && value.trim().length > 0,
        )
        .map((value) => value.trim()),
    ),
  ].sort((left, right) => left.localeCompare(right));
};

export const getConfig = (id: number): Promise<SystemConfig> =>
  securityGetData<SystemConfig>(
    `${CONFIG_API}/${encodeURIComponent(String(id))}`,
  );

export const createConfig = (
  body: ConfigInput,
): Promise<number> =>
  securityPostData<number>(CONFIG_API, body);

export const updateConfig = (
  id: number,
  body: ConfigInput,
): Promise<void> =>
  securityPutData<void>(CONFIG_API, {
    id,
    ...body,
  });

export const toggleConfig = (
  id: number,
  status: ConfigStatus,
): Promise<void> =>
  securityPutData<void>(
    `${CONFIG_API}/${encodeURIComponent(String(id))}/status`,
    { status },
  );

export const deleteConfig = (id: number): Promise<void> =>
  securityDeleteData<void>(
    `${CONFIG_API}/${encodeURIComponent(String(id))}`,
  );

/** Format JSON-like configuration values for detail display. */
export const formatConfigValue = (value: unknown): string => {
  if (typeof value !== 'string') {
    return JSON.stringify(value ?? '', null, 2);
  }

  const normalized = value.trim();
  if (!normalized) return '';

  try {
    return JSON.stringify(JSON.parse(normalized), null, 2);
  } catch {
    return value;
  }
};

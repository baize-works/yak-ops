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
  valueGroup?: string;
  valueName?: string;
  status?: ConfigStatus;
  memo?: string;
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

/**
 * 分页查询配置。
 *
 * 后端使用 POST /page，并接收 page、size。
 */
export const pageConfigs = async (
  params: ConfigPageQuery,
): Promise<ConfigPage> => {
  const data = await securityPostData<
    BackendPagingData<SystemConfig>
  >(`${CONFIG_API}/page`, {
    page: params.pageNum,
    size: params.pageSize,
    valueGroup: params.valueGroup,
    valueName: params.valueName,
    status: params.status,
    memo: params.memo,
  });

  return {
    records: Array.isArray(data?.bizData)
      ? data.bizData
      : [],
    total: Number(data?.pagination?.total ?? 0),
  };
};

/**
 * 查询配置分组。
 */
export const listConfigGroups =
  async (): Promise<string[]> => {
    const data = await securityGetData<string[]>(
      `${CONFIG_API}/group/list`,
    );

    return Array.isArray(data) ? data : [];
  };

/**
 * 新增配置。
 */
export const createConfig = (
  body: ConfigInput,
): Promise<number> =>
  securityPutData<number>(
    `${CONFIG_API}/add`,
    body,
  );

/**
 * 编辑配置。
 */
export const updateConfig = (
  id: number,
  body: ConfigInput,
): Promise<void> =>
  securityPostData<void>(
    `${CONFIG_API}/edit`,
    {
      id,
      ...body,
    },
  );

/**
 * 切换配置状态。
 */
export const toggleConfig = (
  id: number,
  status: ConfigStatus,
): Promise<void> =>
  securityPostData<void>(
    `${CONFIG_API}/switch`,
    {
      id,
      status,
    },
  );

/**
 * 删除配置。
 */
export const deleteConfig = (
  id: number,
): Promise<void> =>
  securityDeleteData<void>(
    `${CONFIG_API}/del?id=${encodeURIComponent(
      String(id),
    )}`,
  );
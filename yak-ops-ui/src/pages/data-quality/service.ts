import HttpUtils from '@/utils/HttpUtils';

import type {
  CommonApiResponse,
  QualityCatalogColumn,
  QualityCatalogTable,
  QualityExecutionPageParams,
  QualityExecutionPageResult,
  QualityExecutionRecord,
  QualityRule,
  QualityRuleFormValues,
  QualityRulePageParams,
  QualityRulePageResult,
} from './types';

const QUALITY_RULE_API_PREFIX = '/api/v1/data-quality/rule';
const QUALITY_EXECUTION_API_PREFIX = '/api/v1/data-quality/execution';
const DATA_SOURCE_API_PREFIX = '/api/v1/data-source';
const DATA_SOURCE_CATALOG_API_PREFIX = `${DATA_SOURCE_API_PREFIX}/catalog`;

const queryString = (params: Record<string, unknown>) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).length > 0) {
      search.set(key, String(value));
    }
  });
  const result = search.toString();
  return result ? `?${result}` : '';
};

export const qualityRuleApi = {
  page: (
    params: QualityRulePageParams,
  ): Promise<CommonApiResponse<QualityRulePageResult>> =>
    HttpUtils.post<QualityRulePageResult>(
      `${QUALITY_RULE_API_PREFIX}/page`,
      params,
    ),

  detail: (id: string): Promise<CommonApiResponse<QualityRule>> =>
    HttpUtils.get<QualityRule>(`${QUALITY_RULE_API_PREFIX}/${id}`),

  create: (
    payload: QualityRuleFormValues,
  ): Promise<CommonApiResponse<QualityRule>> =>
    HttpUtils.post<QualityRule>(QUALITY_RULE_API_PREFIX, payload),

  update: (
    id: string,
    payload: QualityRuleFormValues,
  ): Promise<CommonApiResponse<QualityRule>> =>
    HttpUtils.put<QualityRule>(`${QUALITY_RULE_API_PREFIX}/${id}`, payload),

  copy: (id: string): Promise<CommonApiResponse<QualityRule>> =>
    HttpUtils.post<QualityRule>(`${QUALITY_RULE_API_PREFIX}/${id}/copy`, {}),

  run: (id: string): Promise<CommonApiResponse<QualityExecutionRecord>> =>
    HttpUtils.post<QualityExecutionRecord>(
      `${QUALITY_RULE_API_PREFIX}/${id}/run`,
      {},
    ),

  setEnabled: (
    id: string,
    enabled: boolean,
  ): Promise<CommonApiResponse<boolean>> =>
    HttpUtils.put<boolean>(
      `${QUALITY_RULE_API_PREFIX}/${id}/${enabled ? 'enable' : 'disable'}`,
      {},
    ),

  delete: (id: string): Promise<CommonApiResponse<boolean>> =>
    HttpUtils.delete<boolean>(`${QUALITY_RULE_API_PREFIX}/${id}`),
};

export const qualityExecutionApi = {
  page: (
    params: QualityExecutionPageParams,
  ): Promise<CommonApiResponse<QualityExecutionPageResult>> =>
    HttpUtils.post<QualityExecutionPageResult>(
      `${QUALITY_EXECUTION_API_PREFIX}/page`,
      params,
    ),

  detail: (
    executionNo: string,
  ): Promise<CommonApiResponse<QualityExecutionRecord>> =>
    HttpUtils.get<QualityExecutionRecord>(
      `${QUALITY_EXECUTION_API_PREFIX}/${encodeURIComponent(executionNo)}`,
    ),
};

export const qualityCatalogApi = {
  databases: (dataSourceId: string): Promise<CommonApiResponse<string[]>> =>
    HttpUtils.get<string[]>(
      `${DATA_SOURCE_CATALOG_API_PREFIX}/${dataSourceId}/databases`,
    ),

  schemas: (
    dataSourceId: string,
    database?: string,
  ): Promise<CommonApiResponse<string[]>> =>
    HttpUtils.get<string[]>(
      `${DATA_SOURCE_CATALOG_API_PREFIX}/${dataSourceId}/schemas${queryString({
        database,
      })}`,
    ),

  tables: (
    dataSourceId: string,
    database?: string,
    schema?: string,
    keyword?: string,
  ): Promise<CommonApiResponse<QualityCatalogTable[]>> =>
    HttpUtils.get<QualityCatalogTable[]>(
      `${DATA_SOURCE_CATALOG_API_PREFIX}/${dataSourceId}/tables${queryString({
        database,
        schema,
        keyword,
      })}`,
    ),

  columns: (
    dataSourceId: string,
    database: string | undefined,
    schema: string | undefined,
    table: string,
  ): Promise<CommonApiResponse<QualityCatalogColumn[]>> =>
    HttpUtils.get<QualityCatalogColumn[]>(
      `${DATA_SOURCE_CATALOG_API_PREFIX}/${dataSourceId}/columns${queryString({
        database,
        schema,
        table,
      })}`,
    ),
};

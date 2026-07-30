import HttpUtils from '@/utils/HttpUtils';

import type {
  CommonApiResponse,
  DataSourceConnectTestPayload,
  DataSourceId,
  DataSourcePageParams,
  DataSourcePageResult,
  DataSourceRecord,
  DataSourceSavePayload,
  DataSourceSummary,
  DynamicFormSchemaResponse,
} from './types';

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

export async function fetchDataSourcePage(
  params: DataSourcePageParams,
): Promise<CommonApiResponse<DataSourcePageResult>> {
  return HttpUtils.post<DataSourcePageResult>(
    `${DATA_SOURCE_API_PREFIX}/page`,
    params,
  );
}

export async function fetchDataSourceSummary(): Promise<
  CommonApiResponse<DataSourceSummary>
> {
  return HttpUtils.get<DataSourceSummary>(`${DATA_SOURCE_API_PREFIX}/summary`);
}

export async function fetchDataSourceDetail(
  id: DataSourceId,
): Promise<CommonApiResponse<DataSourceRecord>> {
  return HttpUtils.get<DataSourceRecord>(`${DATA_SOURCE_API_PREFIX}/${id}`);
}

export async function fetchDataSourceAll(): Promise<
  CommonApiResponse<DataSourcePageResult>
> {
  return HttpUtils.get<DataSourcePageResult>(`${DATA_SOURCE_API_PREFIX}/all`);
}

export async function createDataSource(
  payload: DataSourceSavePayload,
): Promise<CommonApiResponse<boolean>> {
  return HttpUtils.post<boolean>(DATA_SOURCE_API_PREFIX, payload);
}

export async function updateDataSource(
  id: DataSourceId,
  payload: DataSourceSavePayload,
): Promise<CommonApiResponse<boolean>> {
  return HttpUtils.put<boolean>(`${DATA_SOURCE_API_PREFIX}/${id}`, payload);
}

export async function deleteDataSource(
  id: DataSourceId,
): Promise<CommonApiResponse<boolean>> {
  return HttpUtils.delete<boolean>(`${DATA_SOURCE_API_PREFIX}/${id}`);
}

export async function testDataSourceConnection(
  id: DataSourceId,
): Promise<CommonApiResponse<boolean>> {
  return HttpUtils.post<boolean>(
    `${DATA_SOURCE_API_PREFIX}/${id}/connect-test`,
    {},
  );
}

export async function testDataSourceConnectionWithParams(
  payload: DataSourceConnectTestPayload,
): Promise<CommonApiResponse<boolean>> {
  return HttpUtils.post<boolean>(
    `${DATA_SOURCE_API_PREFIX}/connect-test-with-param`,
    payload,
  );
}

export async function fetchDataSourceOptions(
  dbType?: string,
): Promise<CommonApiResponse<unknown[]>> {
  return HttpUtils.get<unknown[]>(
    `${DATA_SOURCE_API_PREFIX}/option${queryString({ dbType })}`,
  );
}

export async function fetchDataSourcePluginConfig(
  pluginType: string,
): Promise<CommonApiResponse<DynamicFormSchemaResponse>> {
  return HttpUtils.get<DynamicFormSchemaResponse>(
    `${DATA_SOURCE_API_PREFIX}/plugin/config${queryString({ pluginType })}`,
  );
}

export async function installDataSourcePlugin(
  pluginType: string,
): Promise<CommonApiResponse<boolean>> {
  return HttpUtils.post<boolean>(
    `${DATA_SOURCE_API_PREFIX}/plugin/config/install${queryString({ pluginType })}`,
    {},
  );
}

export const dataSourceCatalogApi = {
  listTable: (
    id: DataSourceId,
  ): Promise<CommonApiResponse<unknown[]>> =>
    HttpUtils.get<unknown[]>(`${DATA_SOURCE_CATALOG_API_PREFIX}/list/${id}`),

  listTableReference: (
    id: DataSourceId,
    matchMode?: string | number,
    keyword?: string,
  ): Promise<CommonApiResponse<unknown[]>> =>
    HttpUtils.get<unknown[]>(
      `${DATA_SOURCE_CATALOG_API_PREFIX}/listByMatchMode/${id}${queryString({
        matchMode,
        keyword,
      })}`,
    ),

  count: (
    dataSourceId: DataSourceId,
    requestBody: Record<string, unknown>,
  ): Promise<CommonApiResponse<number>> =>
    HttpUtils.post<number>(
      `${DATA_SOURCE_CATALOG_API_PREFIX}/count/${dataSourceId}`,
      requestBody,
    ),

  listColumn: (
    id: DataSourceId,
    requestBody: Record<string, unknown>,
  ): Promise<CommonApiResponse<unknown[]>> =>
    HttpUtils.post<unknown[]>(
      `${DATA_SOURCE_CATALOG_API_PREFIX}/column/${id}`,
      requestBody,
    ),

  getTop20Data: (
    dataSourceId: DataSourceId,
    requestBody: Record<string, unknown>,
  ): Promise<CommonApiResponse<unknown>> =>
    HttpUtils.post<unknown>(
      `${DATA_SOURCE_CATALOG_API_PREFIX}/getTop20Data/${dataSourceId}`,
      requestBody,
    ),

  buildSqlTemplate: (
    dataSourceId: DataSourceId,
    requestBody: Record<string, unknown>,
  ): Promise<CommonApiResponse<string>> =>
    HttpUtils.post<string>(
      `${DATA_SOURCE_CATALOG_API_PREFIX}/sql-template/${dataSourceId}`,
      requestBody,
    ),

  resolveSql: (
    dataSourceId: DataSourceId,
    requestBody: Record<string, unknown>,
  ): Promise<CommonApiResponse<string>> =>
    HttpUtils.post<string>(
      `${DATA_SOURCE_CATALOG_API_PREFIX}/resolve-sql/${dataSourceId}`,
      requestBody,
    ),
};

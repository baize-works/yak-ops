import HttpUtils from '@/utils/HttpUtils';
import type {CommonApiResponse, DataSourcePageParams, DataSourcePageResult, DataSourceRecord,} from './types';

const DATA_SOURCE_API_PREFIX = '/api/v1/data-source';

export async function fetchDataSourcePage(
  params: DataSourcePageParams,
): Promise<CommonApiResponse<DataSourcePageResult>> {
  return HttpUtils.post(`${DATA_SOURCE_API_PREFIX}/page`, params);
}

export async function fetchDataSourceDetail(
  id: string,
): Promise<CommonApiResponse<DataSourceRecord>> {
  return HttpUtils.get(`${DATA_SOURCE_API_PREFIX}/${id}`);
}

export async function fetchDataSourceAll(): Promise<CommonApiResponse<DataSourcePageResult>> {
  return HttpUtils.post(`${DATA_SOURCE_API_PREFIX}/all`);
}

export async function createDataSource(
  payload: Record<string, unknown>,
): Promise<CommonApiResponse<boolean>> {
  return HttpUtils.post(DATA_SOURCE_API_PREFIX, payload);
}

export async function updateDataSource(
  id: string,
  payload: Record<string, unknown>,
): Promise<CommonApiResponse<boolean>> {
  return HttpUtils.put(`${DATA_SOURCE_API_PREFIX}/${id}`, payload);
}

export async function selectDataSourceById(
  id: any,
): Promise<any> {
  return HttpUtils.get(`${DATA_SOURCE_API_PREFIX}/${id}`);
}

export async function deleteDataSource(
  id: string,
): Promise<CommonApiResponse<boolean>> {
  return HttpUtils.delete(`${DATA_SOURCE_API_PREFIX}/${id}`);
}

export async function testDataSourceConnection(
  id: string,
): Promise<CommonApiResponse<boolean>> {
  return HttpUtils.get(`${DATA_SOURCE_API_PREFIX}/${id}/connect-test`);
}

export async function testDataSourceConnectionWithParams(
  payload: Record<string, unknown>,
): Promise<CommonApiResponse<boolean>> {
  return HttpUtils.post(`${DATA_SOURCE_API_PREFIX}/connect-test-with-param`, payload);
}

export async function fetchDataSourceOptions(
  dbType: string,
): Promise<CommonApiResponse<unknown[]>> {
  return HttpUtils.get(`${DATA_SOURCE_API_PREFIX}/option?dbType=${dbType}`);
}

export const apiPrefixCatalog = "/api/v1/data-source/catalog"

export const dataSourceCatalogApi = {

  listTable: (id: string): Promise<{ code: number; data: any; message?: string }> => {
    return HttpUtils.get(`${apiPrefixCatalog}/list/${id}`);
  },

  listTableReference: (id: string, matchMode: any, keyword: any): Promise<{ code: number; data: any[]; message?: string }> => {
    return HttpUtils.get(`${apiPrefixCatalog}/listByMatchMode/${id}?matchMode=${matchMode}&keyword=${keyword}`);
  },

  count: (datasourceId: string, requestBody: any): Promise<{ code: number; data: number; message?: string }> => {
    return HttpUtils.post(`${apiPrefixCatalog}/count/${datasourceId}`, requestBody);
  },

  listColumn: (id: any, requestBody: any): Promise<{ code: number; data: any[]; message?: string }> => {
    return HttpUtils.post(`${apiPrefixCatalog}/column/${id}`, requestBody);
  },

  getTop20Data: (datasourceId: string, requestBody: any): Promise<{ code: number; data: any[]; message?: string }> => {
    return HttpUtils.post(`${apiPrefixCatalog}/getTop20Data/${datasourceId}`, requestBody);
  },

  buildSqlTemplate: (
    datasourceId: string,
    requestBody: any
  ): Promise<{ code: number; data: string; message?: string }> => {
    return HttpUtils.post(
      `${apiPrefixCatalog}/sql-template/${datasourceId}`,
      requestBody
    );
  },

  resolveSql: (
    datasourceId: string,
    requestBody: any
  ): Promise<{ code: number; data: string; message?: string }> => {
    return HttpUtils.post(
      `${apiPrefixCatalog}/resolve-sql/${datasourceId}`,
      requestBody
    );
  },

};

import { API_SUCCESS_CODE } from '@/services/http/response';
import type { TableCandidateView } from '../types';

export const DEFAULT_LEFT_WIDTH = 280;
export const MIN_LEFT_WIDTH = 220;
export const MAX_LEFT_WIDTH = 480;
export const PAGE_SIZE = 20;
export const CANDIDATE_PAGE_SIZE = 20;

export interface DataSourceTreeNode {
  key: string;
  dataSourceId: number;
  dataSourceName: string;
  dataSourceType: string;
  environment?: string;
}

export const unwrap = <T,>(response: {
  code: number;
  data: T;
  message?: string;
  msg?: string;
}) => {
  if (response.code !== API_SUCCESS_CODE) {
    throw new Error(response.message || response.msg || '请求失败');
  }
  return response.data;
};

export const normalizeDataSourceType = (value?: string) =>
  value?.trim().toUpperCase() || 'OTHER';

export const dataSourceNodeKey = (dataSourceId: number) =>
  `data-source:${dataSourceId}`;

export const tableTargetKey = (record: TableCandidateView) =>
  [record.databaseName || '', record.schemaName || '', record.tableName].join(
    '\u0001',
  );

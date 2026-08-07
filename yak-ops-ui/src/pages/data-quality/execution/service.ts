import HttpUtils from '@/utils/HttpUtils';
import type { CommonApiResponse } from '../types';
import type {
  ExecutionLogView,
  ExecutionWorkspacePageView,
  ExecutionWorkspaceQuery,
  ExecutionWorkspaceView,
  RuleExecutionWorkspacePageView,
} from './types';

const PREFIX = '/api/v1/data-quality/execution/workspace';

export const qualityExecutionWorkspaceApi = {
  page: (
    params: ExecutionWorkspaceQuery,
  ): Promise<CommonApiResponse<ExecutionWorkspacePageView>> =>
    HttpUtils.post<ExecutionWorkspacePageView>(`${PREFIX}/page`, params),
  rulePage: (
    params: ExecutionWorkspaceQuery,
  ): Promise<CommonApiResponse<RuleExecutionWorkspacePageView>> =>
    HttpUtils.post<RuleExecutionWorkspacePageView>(`${PREFIX}/rule/page`, params),
  detail: (
    executionNo: string,
  ): Promise<CommonApiResponse<ExecutionWorkspaceView>> =>
    HttpUtils.get<ExecutionWorkspaceView>(`${PREFIX}/${executionNo}`),
  logs: (executionNo: string): Promise<CommonApiResponse<ExecutionLogView>> =>
    HttpUtils.get<ExecutionLogView>(`${PREFIX}/${executionNo}/logs`),
};

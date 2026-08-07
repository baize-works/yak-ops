import type {
  CheckResult,
  ExecutionStatus,
  RuleScope,
  RuleType,
  TriggerType,
} from '../types';

export interface ExecutionWorkspaceQuery {
  current?: number;
  pageSize?: number;
  keyword?: string;
  objectKeyword?: string;
  dataSourceId?: number;
  monitorId?: number;
  executionStatus?: ExecutionStatus;
  checkResult?: CheckResult;
  triggerType?: TriggerType;
  hasIssues?: boolean;
  dimension?: string;
  scope?: RuleScope;
  queuedAfter?: string;
  queuedBefore?: string;
}

export interface ExecutionWorkspaceListItem {
  executionNo: string;
  monitorId: number;
  monitorName: string;
  dataSourceId: number;
  dataSourceName: string;
  objectName: string;
  triggerType: TriggerType;
  executionStatus: ExecutionStatus;
  checkResult: CheckResult;
  totalRules: number;
  passedRules: number;
  failedRules: number;
  errorRules: number;
  operator: string;
  queuedAt: string;
  startedAt?: string;
  finishedAt?: string;
  durationMs?: number;
  errorMessage?: string;
}

export interface RuleExecutionWorkspaceListItem {
  id: number;
  ruleId: number;
  executionNo: string;
  monitorId: number;
  monitorName: string;
  dataSourceId: number;
  dataSourceName: string;
  databaseName?: string;
  schemaName?: string;
  tableName: string;
  objectName: string;
  ruleName: string;
  templateCode: string;
  ruleType: RuleType;
  scope: RuleScope;
  dimension: string;
  columnName?: string;
  triggerType: TriggerType;
  executionStatus: ExecutionStatus;
  checkResult: CheckResult;
  metricValue?: string;
  expectedValue?: string;
  operator: string;
  queuedAt: string;
  startedAt?: string;
  finishedAt?: string;
  durationMs?: number;
  errorMessage?: string;
}

export interface ExecutionWorkspaceRuleView {
  id: number;
  ruleId: number;
  ruleName: string;
  templateCode: string;
  ruleType: RuleType;
  scope: RuleScope;
  dimension: string;
  columnName?: string;
  checkResult: CheckResult;
  metricValue?: string;
  expectedValue?: string;
  executedSql?: string;
  errorMessage?: string;
  durationMs?: number;
  createdAt?: string;
}

export interface ExecutionWorkspaceView extends ExecutionWorkspaceListItem {
  databaseName?: string;
  schemaName?: string;
  tableName: string;
  rules: ExecutionWorkspaceRuleView[];
}

export interface ExecutionWorkspacePageView {
  records: ExecutionWorkspaceListItem[];
  total: number;
  current: number;
  pageSize: number;
}

export interface RuleExecutionWorkspacePageView {
  records: RuleExecutionWorkspaceListItem[];
  total: number;
  current: number;
  pageSize: number;
}

export type ExecutionLogLevel = 'INFO' | 'WARN' | 'ERROR';

export interface ExecutionLogLine {
  timestamp?: string;
  level: ExecutionLogLevel;
  stage: string;
  message: string;
}

export interface ExecutionLogView {
  executionNo: string;
  lines: ExecutionLogLine[];
}

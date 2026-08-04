export type QualityRuleType =
  | 'TABLE_ROW_COUNT'
  | 'COLUMN_NOT_NULL'
  | 'COLUMN_UNIQUE'
  | 'COLUMN_RANGE'
  | 'DATA_FRESHNESS'
  | 'CUSTOM_SQL';

export type QualityRuleScope = 'TABLE' | 'COLUMN';
export type QualityRuleImportance = 'NORMAL' | 'IMPORTANT';
export type QualityRuleResult =
  | 'PASSED'
  | 'NOT_PASSED'
  | 'ERROR'
  | 'RUNNING'
  | 'NOT_RUN';
export type QualityTriggerType = 'MANUAL' | 'SCHEDULE';
export type QualityExecutionStatus =
  | 'WAITING'
  | 'RUNNING'
  | 'SUCCESS'
  | 'FAILED';
export type QualityCheckResult = 'PASSED' | 'NOT_PASSED' | 'UNKNOWN';
export type QualityOperator = '>' | '>=' | '=' | '<=' | '<' | 'BETWEEN';

export interface CommonApiResponse<T> {
  code: number;
  data: T;
  message?: string;
  msg?: string;
}

export interface QualityRule {
  id: string;
  name: string;
  description?: string;
  dataSourceId: string;
  dataSourceName: string;
  catalogName?: string;
  schemaName?: string;
  databaseName: string;
  tableName: string;
  columnName?: string;
  scope: QualityRuleScope;
  ruleType: QualityRuleType;
  dimension: string;
  operator: QualityOperator;
  threshold: number;
  thresholdEnd?: number;
  unit?: string;
  scheduleMode: QualityTriggerType;
  schedulePreset?: string;
  scheduleLabel: string;
  cronExpression?: string;
  enabled: boolean;
  importance: QualityRuleImportance;
  lastResult: QualityRuleResult;
  lastMetric?: string;
  lastRunTime?: string;
  duration?: number;
  owner: string;
  customSql?: string;
  createTime?: string;
  updateTime?: string;
}

export interface QualityRuleFormValues {
  name: string;
  description?: string;
  importance: QualityRuleImportance;
  dataSourceId: string;
  dataSourceName?: string;
  catalogName?: string;
  schemaName?: string;
  databaseName: string;
  tableName: string;
  columnName?: string;
  ruleType: QualityRuleType;
  operator: QualityOperator;
  threshold: number;
  thresholdEnd?: number;
  scheduleMode: QualityTriggerType;
  schedulePreset?: string;
  cronExpression?: string;
  enabled: boolean;
  customSql?: string;
}

export interface QualityRuleFilters {
  keyword: string;
  dataSourceId?: string;
  ruleType?: QualityRuleType;
  result?: QualityRuleResult;
  enabled?: boolean;
}

export interface QualityRulePageParams extends QualityRuleFilters {
  current: number;
  pageSize: number;
}

export interface QualityRuleSummary {
  total: number;
  enabled: number;
  todayRuns: number;
  attention: number;
}

export interface QualityRulePageResult {
  records: QualityRule[];
  total: number;
  current: number;
  pageSize: number;
  summary: QualityRuleSummary;
}

export interface QualitySelectOption {
  label: string;
  value: string;
  description?: string;
}

export interface QualityCatalogTable {
  name?: string;
  tableName?: string;
  value?: string;
  label?: string;
  comment?: string;
  remarks?: string;
  description?: string;
  database?: string;
  schema?: string;
  type?: string;
}

export interface QualityCatalogColumn {
  name?: string;
  columnName?: string;
  value?: string;
  label?: string;
  comment?: string;
  remarks?: string;
  description?: string;
  dataType?: string;
  typeName?: string;
  type?: string;
}

export interface QualityExecutionRecord {
  id: string;
  ruleId: string;
  ruleName: string;
  dataSourceName: string;
  objectName: string;
  ruleType: QualityRuleType;
  triggerType: QualityTriggerType;
  executionStatus: QualityExecutionStatus;
  checkResult: QualityCheckResult;
  metricValue?: string;
  expectedValue: string;
  startedAt: string;
  finishedAt?: string;
  duration?: number;
  operator: string;
  sql: string;
  errorMessage?: string;
}

export interface QualityExecutionFilters {
  keyword: string;
  status?: QualityExecutionStatus;
  checkResult?: QualityCheckResult;
  triggerType?: QualityTriggerType;
}

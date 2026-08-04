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

export interface QualityRule {
  id: string;
  name: string;
  description?: string;
  dataSourceId: string;
  dataSourceName: string;
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
}

export interface QualityRuleFormValues {
  name: string;
  description?: string;
  importance: QualityRuleImportance;
  dataSourceId: string;
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

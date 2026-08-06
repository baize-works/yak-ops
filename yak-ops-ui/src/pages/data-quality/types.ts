export type RuleScope = 'TABLE' | 'COLUMN';
export type RuleType =
  | 'TABLE_ROW_COUNT'
  | 'COLUMN_NOT_NULL'
  | 'COLUMN_UNIQUE'
  | 'COLUMN_RANGE'
  | 'COLUMN_ENUM'
  | 'CUSTOM_SQL';
export type ComparisonOperator = 'GT' | 'GTE' | 'EQ' | 'LTE' | 'LT' | 'BETWEEN';
export type ExecutionStatus = 'WAITING' | 'RUNNING' | 'SUCCESS' | 'FAILED';
export type CheckResult = 'PASSED' | 'NOT_PASSED' | 'ERROR' | 'RUNNING' | 'NOT_RUN';
export type TriggerType = 'MANUAL' | 'SCHEDULE';
export type RunMode = 'MANUAL' | 'SCHEDULE';
export type ScheduleFrequency = 'DAILY' | 'WEEKLY' | 'CRON';
export type ScheduleWeekday = 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT' | 'SUN';
export type RuleFailureAction = 'CONTINUE' | 'STOP';
export type NotifyChannel = 'MESSAGE' | 'EMAIL' | 'WEBHOOK';
export type AlertLevel = 'WARNING' | 'CRITICAL';

export interface CommonApiResponse<T> {
  code: number;
  data: T;
  msg?: string;
  message?: string;
}

export interface TemplateView {
  id: number;
  code: string;
  name: string;
  description?: string;
  ruleType: RuleType;
  scope: RuleScope;
  dimension: string;
  parameterSchema: string;
  builtin: boolean;
  enabled: boolean;
  ruleCount: number;
  sortOrder: number;
}

export interface TemplateListView {
  records: TemplateView[];
  summary: { total: number; dimensions: Record<string, number> };
}

export interface SaveRulePayload {
  templateId: number;
  name: string;
  columnName?: string;
  operator?: ComparisonOperator;
  threshold?: number;
  thresholdEnd?: number;
  enumValues?: string[];
  customSql?: string;
  enabled?: boolean;
}

export interface MonitorSettingsPayload {
  runMode: RunMode;
  scheduleFrequency?: ScheduleFrequency;
  scheduleTime?: string;
  scheduleWeekday?: ScheduleWeekday;
  cronExpression?: string;
  ruleFailureAction: RuleFailureAction;
  notifyEnabled: boolean;
  notifyChannel: NotifyChannel;
  notifyTarget?: string;
  alertLevel: AlertLevel;
}

export interface MonitorSettingsView extends MonitorSettingsPayload {
  nextRunTime?: string;
}

export interface SaveMonitorPayload {
  name: string;
  description?: string;
  dataSourceId: number;
  dataSourceName: string;
  databaseName?: string;
  schemaName?: string;
  tableName: string;
  whereClause?: string;
  owner: string;
  enabled?: boolean;
  settings: MonitorSettingsPayload;
  rules: SaveRulePayload[];
}

export interface RuleView extends SaveRulePayload {
  id: number;
  monitorId: number;
  templateCode: string;
  ruleType: RuleType;
  scope: RuleScope;
  dimension: string;
  sortOrder: number;
  enabled: boolean;
}

export interface MonitorListItem {
  id: number;
  name: string;
  description?: string;
  dataSourceId: number;
  dataSourceName: string;
  databaseName?: string;
  schemaName?: string;
  tableName: string;
  owner: string;
  enabled: boolean;
  ruleCount: number;
  lastResult: CheckResult;
  lastExecutionNo?: string;
  lastRunTime?: string;
  createTime: string;
  updateTime: string;
}

export interface MonitorView extends Omit<MonitorListItem, 'ruleCount'> {
  whereClause?: string;
  rules: RuleView[];
}

export interface MonitorPageView {
  records: MonitorListItem[];
  total: number;
  current: number;
  pageSize: number;
}

export interface TableMonitorSummary {
  tableName: string;
  monitorId?: number;
  monitorName?: string;
  monitorCount: number;
  ruleCount: number;
  lastResult: CheckResult;
  lastRunTime?: string;
}

export interface TableAssetView {
  id: number;
  dataSourceId: number;
  dataSourceName: string;
  databaseName?: string;
  schemaName?: string;
  tableName: string;
  tableType?: string;
  remarks?: string;
  monitorId?: number;
  monitorName?: string;
  monitorCount: number;
  ruleCount: number;
  lastResult: CheckResult;
  lastRunTime?: string;
  registeredBy: string;
  registeredAt: string;
}

export interface TableAssetPageView {
  records: TableAssetView[];
  total: number;
  current: number;
  pageSize: number;
}

export interface TableCandidateView {
  databaseName?: string;
  schemaName?: string;
  tableName: string;
  tableType?: string;
  remarks?: string;
}

export interface TableCandidatePageView {
  records: TableCandidateView[];
  total: number;
  current: number;
  pageSize: number;
}

export interface RegisterTableItem {
  databaseName?: string;
  schemaName?: string;
  tableName: string;
  tableType?: string;
  remarks?: string;
}

export interface RegisterTablesPayload {
  dataSourceId: number;
  dataSourceName: string;
  databaseName?: string;
  tables: RegisterTableItem[];
}

export interface RegisterTablesView {
  requested: number;
  registered: number;
}

export interface RunView {
  executionNo: string;
  executionStatus: ExecutionStatus;
  checkResult: CheckResult;
}

export interface RuleExecutionView {
  id: number;
  ruleId: number;
  ruleName: string;
  templateCode: string;
  ruleType: RuleType;
  columnName?: string;
  checkResult: CheckResult;
  metricValue?: string;
  expectedValue?: string;
  executedSql?: string;
  errorMessage?: string;
  durationMs?: number;
}

export interface ExecutionListItem {
  executionNo: string;
  monitorId: number;
  monitorName: string;
  dataSourceName: string;
  objectName: string;
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

export interface ExecutionView extends ExecutionListItem {
  databaseName?: string;
  schemaName?: string;
  tableName: string;
  rules: RuleExecutionView[];
}

export interface ExecutionPageView {
  records: ExecutionListItem[];
  total: number;
  current: number;
  pageSize: number;
}

export interface CatalogTable {
  database?: string;
  schema?: string;
  name: string;
  type?: string;
  remarks?: string;
}

export interface CatalogColumn {
  name: string;
  typeName?: string;
  jdbcType?: number;
  size?: number;
  scale?: number;
  nullable?: boolean;
  ordinalPosition?: number;
  primaryKey?: boolean;
  remarks?: string;
}

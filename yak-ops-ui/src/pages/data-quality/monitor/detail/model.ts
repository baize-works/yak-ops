import type {
  AlertLevel,
  CheckResult,
  MonitorSettingsPayload,
  MonitorSettingsView,
  MonitorView,
  NotifyChannel,
  RuleFailureAction,
  RuleView,
  RunMode,
  SaveMonitorPayload,
  SaveRulePayload,
  ScheduleFrequency,
  ScheduleWeekday,
} from '../../types';

export type WorkspaceTab = 'rules' | 'monitors' | 'report';

export const DIMENSION_ORDER = [
  '完整性',
  '准确性',
  '一致性',
  '唯一性',
  '时效性',
  '有效性',
];

export const CHECK_RESULT_LABEL: Record<CheckResult, string> = {
  PASSED: '通过',
  NOT_PASSED: '未通过',
  ERROR: '异常',
  RUNNING: '运行中',
  NOT_RUN: '未运行',
};

export const RUN_MODE_LABEL: Record<RunMode, string> = {
  MANUAL: '手动触发',
  SCHEDULE: '生产调度触发',
};

export const ACTION_TYPE_LABEL: Record<string, string> = {
  CREATE_MONITOR: '创建监控',
  UPDATE_MONITOR: '更新监控',
  SAVE_RULE: '保存规则',
  RUN_MONITOR: '运行监控',
};

export const objectName = (monitor?: MonitorView) =>
  [monitor?.databaseName, monitor?.schemaName, monitor?.tableName]
    .filter(Boolean)
    .join('.');

export const scopeLabel = (rule: RuleView) =>
  rule.scope === 'TABLE' ? '表级' : rule.columnName || '字段级';

export const ruleParameter = (rule: RuleView) => {
  if (rule.ruleType === 'COLUMN_RANGE') {
    return `${rule.threshold ?? '--'} ~ ${rule.thresholdEnd ?? '--'}`;
  }
  if (rule.ruleType === 'COLUMN_ENUM') {
    return (rule.enumValues || []).join(', ') || '--';
  }
  if (rule.ruleType === 'CUSTOM_SQL') {
    return '自定义 SQL';
  }
  return `${rule.operator || '='} ${rule.threshold ?? '--'}`;
};

const toRulePayload = (rule: RuleView): SaveRulePayload => ({
  templateId: rule.templateId,
  name: rule.name,
  columnName: rule.columnName,
  operator: rule.operator,
  threshold: rule.threshold,
  thresholdEnd: rule.thresholdEnd,
  enumValues: rule.enumValues,
  customSql: rule.customSql,
  enabled: rule.enabled,
});

const toSettingsPayload = (
  settings: MonitorSettingsView,
): MonitorSettingsPayload => ({
  runMode: settings.runMode,
  scheduleFrequency: settings.scheduleFrequency,
  scheduleTime: settings.scheduleTime,
  scheduleWeekday: settings.scheduleWeekday,
  cronExpression: settings.cronExpression,
  ruleFailureAction: settings.ruleFailureAction,
  notifyEnabled: settings.notifyEnabled,
  notifyChannel: settings.notifyChannel,
  notifyTarget: settings.notifyTarget,
  alertLevel: settings.alertLevel,
});

export const toSavePayload = (
  monitor: MonitorView,
  settings: MonitorSettingsView,
  rules: RuleView[],
): SaveMonitorPayload => ({
  name: monitor.name,
  description: monitor.description,
  dataSourceId: monitor.dataSourceId,
  dataSourceName: monitor.dataSourceName,
  databaseName: monitor.databaseName,
  schemaName: monitor.schemaName,
  tableName: monitor.tableName,
  whereClause: monitor.whereClause,
  owner: monitor.owner,
  enabled: monitor.enabled,
  settings: toSettingsPayload(settings),
  rules: rules.map(toRulePayload),
});

export const defaultsForSettings = (): MonitorSettingsView => ({
  runMode: 'MANUAL' as RunMode,
  ruleFailureAction: 'CONTINUE' as RuleFailureAction,
  notifyEnabled: false,
  notifyChannel: 'MESSAGE' as NotifyChannel,
  alertLevel: 'WARNING' as AlertLevel,
});

export type {
  AlertLevel,
  NotifyChannel,
  RuleFailureAction,
  ScheduleFrequency,
  ScheduleWeekday,
};

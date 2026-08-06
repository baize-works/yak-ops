import type {
  AlertLevel,
  ComparisonOperator,
  MonitorSettingsPayload,
  MonitorSettingsView,
  MonitorView,
  NotifyChannel,
  RuleFailureAction,
  RuleType,
  RunMode,
  SaveRulePayload,
  ScheduleFrequency,
  ScheduleWeekday,
  TemplateView,
} from '../../types';

export interface EditorRule extends SaveRulePayload {
  key: string;
  templateCode: string;
  ruleType: RuleType;
  scope: 'TABLE' | 'COLUMN';
  dimension: string;
}

export interface RuntimeFormState {
  runMode: RunMode;
  scheduleFrequency: ScheduleFrequency;
  scheduleTime: string;
  scheduleWeekday: ScheduleWeekday;
  cronExpression: string;
}

export interface IssueStrategyState {
  ruleFailureAction: RuleFailureAction;
  notifyEnabled: boolean;
  notifyChannel: NotifyChannel;
  notifyTarget: string;
  alertLevel: AlertLevel;
}

export const DEFAULT_RUNTIME: RuntimeFormState = {
  runMode: 'MANUAL',
  scheduleFrequency: 'DAILY',
  scheduleTime: '09:00',
  scheduleWeekday: 'MON',
  cronExpression: '0 0 9 * * *',
};

export const DEFAULT_STRATEGY: IssueStrategyState = {
  ruleFailureAction: 'CONTINUE',
  notifyEnabled: false,
  notifyChannel: 'MESSAGE',
  notifyTarget: '',
  alertLevel: 'WARNING',
};

export const OPERATORS: Array<{ value: ComparisonOperator; label: string }> = [
  { value: 'GT', label: '>' },
  { value: 'GTE', label: '>=' },
  { value: 'EQ', label: '=' },
  { value: 'LTE', label: '<=' },
  { value: 'LT', label: '<' },
  { value: 'BETWEEN', label: '区间' },
];

export const ruleDefaults = (template: TemplateView): EditorRule => {
  const percentRule =
    template.ruleType === 'COLUMN_NOT_NULL' || template.ruleType === 'COLUMN_UNIQUE';
  return {
    key: `${template.id}-${Date.now()}-${Math.random()}`,
    templateId: template.id,
    templateCode: template.code,
    name: template.name,
    ruleType: template.ruleType,
    scope: template.scope,
    dimension: template.dimension,
    operator: template.ruleType === 'TABLE_ROW_COUNT' ? 'GT' : percentRule ? 'GTE' : 'EQ',
    threshold: percentRule ? 100 : 0,
    enumValues: [],
    customSql:
      template.ruleType === 'CUSTOM_SQL'
        ? 'SELECT COUNT(*) AS metric_value FROM ${table} WHERE ${where}'
        : undefined,
    enabled: true,
  };
};

export const monitorRules = (monitor: MonitorView): EditorRule[] =>
  monitor.rules.map((rule) => ({
    key: String(rule.id),
    templateId: rule.templateId,
    templateCode: rule.templateCode,
    name: rule.name,
    ruleType: rule.ruleType,
    scope: rule.scope,
    dimension: rule.dimension,
    columnName: rule.columnName,
    operator: (rule.operator || 'EQ') as ComparisonOperator,
    threshold: rule.threshold,
    thresholdEnd: rule.thresholdEnd,
    enumValues: rule.enumValues || [],
    customSql: rule.customSql,
    enabled: rule.enabled,
  }));

export const runtimeFromSettings = (settings: MonitorSettingsView): RuntimeFormState => ({
  runMode: settings.runMode || 'MANUAL',
  scheduleFrequency: settings.scheduleFrequency || 'DAILY',
  scheduleTime: settings.scheduleTime || '09:00',
  scheduleWeekday: settings.scheduleWeekday || 'MON',
  cronExpression: settings.cronExpression || '0 0 9 * * *',
});

export const strategyFromSettings = (settings: MonitorSettingsView): IssueStrategyState => ({
  ruleFailureAction: settings.ruleFailureAction || 'CONTINUE',
  notifyEnabled: Boolean(settings.notifyEnabled),
  notifyChannel: settings.notifyChannel || 'MESSAGE',
  notifyTarget: settings.notifyTarget || '',
  alertLevel: settings.alertLevel || 'WARNING',
});

export const buildSettings = (
  runtime: RuntimeFormState,
  strategy: IssueStrategyState,
): MonitorSettingsPayload => ({
  runMode: runtime.runMode,
  scheduleFrequency:
    runtime.runMode === 'SCHEDULE' ? runtime.scheduleFrequency : undefined,
  scheduleTime:
    runtime.runMode === 'SCHEDULE' && runtime.scheduleFrequency !== 'CRON'
      ? runtime.scheduleTime
      : undefined,
  scheduleWeekday:
    runtime.runMode === 'SCHEDULE' && runtime.scheduleFrequency === 'WEEKLY'
      ? runtime.scheduleWeekday
      : undefined,
  cronExpression:
    runtime.runMode === 'SCHEDULE' && runtime.scheduleFrequency === 'CRON'
      ? runtime.cronExpression.trim()
      : undefined,
  ruleFailureAction: strategy.ruleFailureAction,
  notifyEnabled: strategy.notifyEnabled,
  notifyChannel: strategy.notifyChannel,
  notifyTarget: strategy.notifyTarget.trim() || undefined,
  alertLevel: strategy.alertLevel,
});

export const validateEditorSettings = (
  runtime: RuntimeFormState,
  strategy: IssueStrategyState,
) => {
  if (runtime.runMode === 'SCHEDULE') {
    if (runtime.scheduleFrequency === 'CRON' && !runtime.cronExpression.trim()) {
      throw new Error('请输入 Cron 表达式');
    }
    if (runtime.scheduleFrequency !== 'CRON' && !runtime.scheduleTime) {
      throw new Error('请选择执行时间');
    }
  }
  if (
    strategy.notifyEnabled &&
    strategy.notifyChannel !== 'MESSAGE' &&
    !strategy.notifyTarget.trim()
  ) {
    throw new Error(
      strategy.notifyChannel === 'EMAIL'
        ? '请输入告警接收邮箱'
        : '请输入 Webhook 地址',
    );
  }
};

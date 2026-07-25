import type { FormInstance } from 'antd';

/** 通用响应结构，与 data-source 页保持一致 */
export interface CommonApiResponse<T> {
  code: number;
  data: T;
  message?: string;
}

/** 分页信息 */
export interface PaginationInfo {
  pageNo: number;
  pageSize: number;
  total: number;
}

/** 操作类型 */
export enum AlarmOperateType {
  Create = 'CREATE',
  Edit = 'EDIT',
}

/** 字段类型（与后端 FieldType 枚举对应） */
export type FormFieldType =
  | 'INPUT'
  | 'PASSWORD'
  | 'SELECT'
  | 'NUMBER'
  | 'SWITCH'
  | 'TEXTAREA'
  | 'CUSTOM_SELECT';

/** 动态表单字段校验规则（与后端 FormFieldConfig.Rule 对应） */
export interface FormFieldRule {
  required?: boolean;
  pattern?: string;
  min?: number;
  max?: number;
  message: string;
}

/** 动态表单选项（与后端 FormFieldConfig.Option 对应） */
export interface FormFieldOption {
  label: string;
  value: string | number;
}

/**
 * 动态表单字段配置，由后端 SPI 通过 /channel-types 接口下发。
 * 对应 io.yak.ops.spi.form.FormFieldConfig
 */
export interface FormFieldConfig {
  key: string;
  label: string;
  type: FormFieldType;
  placeholder?: string;
  defaultValue?: unknown;
  options?: FormFieldOption[];
  rules?: FormFieldRule[];
  order?: number;
}

/** 通道类型（SPI 工厂），对应 AlarmController.ChannelTypeVO */
export interface ChannelTypeVO {
  channelType: string;
  displayName: string;
  configFields: FormFieldConfig[];
}

/** 告警通道实例，对应 AlarmChannelEntity */
export interface AlarmChannelRecord {
  id?: number;
  name?: string;
  /** SPI key，如 WEBHOOK / DINGTALK */
  channelType?: string;
  /** 通道配置 JSON 字符串 */
  configJson?: string;
  /** 0 禁用，1 启用 */
  enabled?: number;
  description?: string;
  createTime?: string;
  updateTime?: string;
}

/** 告警规则，对应 AlarmRuleEntity */
export interface AlarmRuleRecord {
  id?: number;
  name?: string;
  /** 逗号分隔的目标任务定义 id，null 表示全部任务 */
  targetJobs?: string;
  /** 逗号分隔的 JobStatus 名，如 "FAILED,CANCELED" */
  triggerStatuses?: string;
  /** 逗号分隔的需排除任务定义 id */
  excludes?: string;
  /** INFO / WARN / CRITICAL */
  severity?: string;
  /** 0 禁用，1 启用 */
  enabled?: number;
  description?: string;
  createTime?: string;
  updateTime?: string;
}

/** 告警记录，对应 AlarmRecordEntity */
export interface AlarmRecordRecord {
  id?: number;
  ruleId?: number;
  channelId?: number;
  channelType?: string;
  jobInstanceId?: number;
  jobDefinitionId?: number;
  jobName?: string;
  newStatus?: string;
  severity?: string;
  /** 1 成功，0 失败 */
  success?: number;
  errorMessage?: string;
  content?: string;
  sentTime?: string;
  createTime?: string;
  updateTime?: string;
}

/** 告警记录分页结果，对应 AlarmController.RecordPageVO */
export interface AlarmRecordPage {
  list: AlarmRecordRecord[];
  total: number;
}

/** 告警记录查询参数 */
export interface AlarmRecordQuery {
  pageNo: number;
  pageSize: number;
  jobInstanceId?: number;
  channelType?: string;
  severity?: string;
  success?: number;
}

/** 保存规则的请求体，对应 AlarmRuleService.AlarmRuleCommand */
export interface AlarmRuleCommand {
  id?: number | null;
  name?: string;
  targetJobs?: string;
  triggerStatuses?: string;
  excludes?: string;
  severity?: string;
  enabled?: number;
  description?: string;
  channelIds?: number[];
}

/** 保存通道的请求体，对应 AlarmChannelEntity */
export interface AlarmChannelCommand {
  id?: number | null;
  name?: string;
  channelType?: string;
  configJson?: string;
  enabled?: number;
  description?: string;
}

/** 任务定义下拉项 */
export interface JobDefinitionOption {
  id: number;
  jobName: string;
  /** 仅支持离线批任务。 */
  type: 'batch';
}

/** 弹窗打开参数 */
export interface AlarmModalOpenPayload {
  operateType: AlarmOperateType;
  currentRecord?: AlarmChannelRecord | AlarmRuleRecord;
  onSuccess?: () => void;
}

/** 弹窗对外暴露的方法 */
export interface AlarmModalRef {
  open: (payload: AlarmModalOpenPayload) => void;
  close: () => void;
}

/** 通道弹窗表单值（基础信息） */
export interface ChannelFormValues {
  name: string;
  enabled: boolean;
  description?: string;
}

/** 规则弹窗表单值 */
export interface RuleFormValues {
  name: string;
  targetJobs?: number[];
  triggerStatuses: string[];
  severity: string;
  enabled: boolean;
  description?: string;
  channelIds: number[];
  excludes?: number[];
}

/** 动态表单 props */
export interface DynamicAlarmFormProps {
  channelType: string;
  configFields: FormFieldConfig[];
  configForm: FormInstance;
  operateType: AlarmOperateType;
  initialConfig?: Record<string, unknown>;
}

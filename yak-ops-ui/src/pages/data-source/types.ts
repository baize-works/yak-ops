import type { FormInstance } from 'antd';

export enum DataSourceOperateType {
  Create = 'CREATE',
  Edit = 'EDIT',
}

export type DataSourceId = number | string;
export type DataSourceConnectionStatus =
  | 'UNKNOWN'
  | 'CONNECTED'
  | 'DISCONNECTED'
  | string;

export interface CommonApiResponse<T> {
  code: number;
  data: T;
  msg?: string;
  message?: string;
}

export interface PaginationInfo {
  pageNo: number;
  pageSize: number;
  total: number;
  pages?: number;
}

export interface DataSourceRecord {
  id?: DataSourceId;
  name?: string;
  dbType?: string;
  jdbcUrl?: string;
  environment?: string;
  environmentName?: string;
  connStatus?: DataSourceConnectionStatus;
  remark?: string;
  /** 仅详情接口返回，敏感字段使用 ****** 回显。 */
  originalJson?: string;
  createTime?: string;
  updateTime?: string;
}

export interface DataSourcePageResult {
  bizData: DataSourceRecord[];
  pagination: PaginationInfo;
}

export interface DataSourcePageParams {
  pageNo: number;
  pageSize: number;
  dbType?: string;
  name?: string;
  keyword?: string;
  environment?: string;
  connStatus?: string;
}

export interface DataSourceSummary {
  total: number;
  connected: number;
  disconnected: number;
  unknown: number;
  environmentCount: number;
}

export interface DataSourceFormValues {
  name: string;
  environment: string;
  remark?: string;
}

export type DataSourceConnectionFormValues = Record<string, unknown>;

export interface DataSourceSavePayload extends DataSourceFormValues {
  dbType: string;
  connectionParams: string;
}

export interface DataSourceConnectTestPayload {
  dataSourceId?: DataSourceId;
  dbType?: string;
  connJson: string;
}

export interface DataSourceModalOpenPayload {
  operateType: DataSourceOperateType;
  currentRecord?: DataSourceRecord;
  onSuccess?: () => void;
  /**
   * 外部创建入口已确定 dbType 时传入。
   * 传入后弹窗会跳过数据源类型选择页。
   */
  dbType?: string;

  /**
   * 是否隐藏“上一步”按钮。
   * 从任务配置页创建来源/去向数据源时建议为 true。
   */
  hideBack?: boolean;
}

export interface DataSourceModalRef {
  open: (payload: DataSourceModalOpenPayload) => void;
  close: () => void;
}

export interface DynamicFormFieldRule {
  required?: boolean;
  pattern?: string;
  min?: number;
  max?: number;
  message: string;
}

export interface DynamicFormField {
  key: string;
  label: string;
  type:
    | 'INPUT'
    | 'PASSWORD'
    | 'SELECT'
    | 'NUMBER'
    | 'SWITCH'
    | 'TEXTAREA'
    | 'CUSTOM_SELECT';
  placeholder?: string;
  options?: Array<{ label: string; value: string | number }>;
  defaultValue?: unknown;
  rules?: DynamicFormFieldRule[];
}

export interface DynamicFormSchemaResponse {
  pluginType?: string;
  formFields: DynamicFormField[];
  installRequired?: boolean;
  installHint?: string;
}

export interface DynamicDataSourceFormProps {
  dbType: string;
  form: FormInstance<DataSourceFormValues>;
  configForm: FormInstance;
  operateType: DataSourceOperateType;
  /** 编辑模式下的初始配置数据。 */
  initialConfig?: Record<string, unknown>;
}

export interface DataSourceOptionItem {
  label: string;
  value: string;
}

export interface DataSourceCatalogItem {
  onlyDiScript: boolean;
  dbType: string;
  type: string;
  connectorType?: string;
  disabled?: boolean;
  img?: string;
  doc?: {
    reader?: string;
    writer?: string;
  };
}

export interface DataSourceGroup {
  groupName: string;
  datasourceList: DataSourceCatalogItem[];
}

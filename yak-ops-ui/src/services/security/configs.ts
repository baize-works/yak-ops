import { securityGetData, securityPostData } from './client';

const CONFIG_API = '/api/v1/config';

export type ConfigStatus = 'ENABLED' | 'DISABLED';
export type ConfigValueType = 'STRING' | 'NUMBER' | 'BOOLEAN' | 'JSON';

export interface SystemConfig {
  id: number;
  configKey: string;
  configName: string;
  groupCode: string;
  valueType: ConfigValueType;
  status: ConfigStatus;
  sensitive: boolean;
  systemBuiltIn?: boolean;
  updateTime?: string;
}

export interface ConfigPageQuery {
  pageNum: number;
  pageSize: number;
  configKey?: string;
  configName?: string;
  groupCode?: string;
  status?: ConfigStatus;
}

export interface ConfigPage { records: SystemConfig[]; total: number }
export interface ConfigInput {
  configKey: string;
  configName: string;
  groupCode: string;
  valueType: ConfigValueType;
  status: ConfigStatus;
  sensitive: boolean;
  configValue?: string;
}
export interface ConfigDeleteCheck {
  deletable: boolean;
  reason?: string;
  references?: Record<string, number>;
  systemBuiltIn?: boolean;
}

const query = (values: object) => {
  const params = new URLSearchParams();
  Object.entries(values as Record<string, unknown>).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value));
  });
  return params.toString();
};

/** Sensitive values are write-only and are intentionally absent from every response model. */
export const pageConfigs = (params: ConfigPageQuery) =>
  securityGetData<ConfigPage>(`${CONFIG_API}/page?${query(params)}`);
export const listConfigGroups = () => securityGetData<string[]>(`${CONFIG_API}/group`);
export const createConfig = (body: ConfigInput) =>
  securityPostData<SystemConfig>(`${CONFIG_API}/create`, body);
export const updateConfig = (id: number, body: Partial<ConfigInput>) =>
  securityPostData<SystemConfig>(`${CONFIG_API}/update`, { id, ...body });
export const toggleConfig = (id: number, status: ConfigStatus) =>
  securityPostData<void>(`${CONFIG_API}/toggle`, { id, status });
export const checkConfigDeletion = (id: number) =>
  securityGetData<ConfigDeleteCheck>(`${CONFIG_API}/delete-check?id=${encodeURIComponent(id)}`);
export const deleteConfig = (id: number) =>
  securityPostData<void>(`${CONFIG_API}/delete`, { id });

/** Empty secret on edit means “unchanged”; placeholder/mask text can never reach the API. */
export const sanitizeConfigInput = (
  values: ConfigInput,
  editingSensitive: boolean,
): ConfigInput => {
  const body = { ...values };
  if (editingSensitive && (!body.configValue?.trim() || /^[*•]+$/.test(body.configValue.trim()))) {
    delete body.configValue;
  }
  return body;
};

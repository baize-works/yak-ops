import HttpUtils from '@/utils/HttpUtils';

const API_PREFIX = '/api/v1/data-development/platform';

interface ApiResponse<T> {
  code: number;
  data: T;
  msg?: string;
  message?: string;
}

export type EnvironmentType =
  | 'DEVELOPMENT'
  | 'TESTING'
  | 'STAGING'
  | 'PRODUCTION';
export type ProbeType = 'LOCAL_PLUGIN' | 'HTTP' | 'TCP';
export type HealthStatus =
  | 'UNKNOWN'
  | 'HEALTHY'
  | 'DEGRADED'
  | 'UNHEALTHY'
  | 'DISABLED';

export interface PlatformOverview {
  projectCount: number;
  taskCount: number;
  executionCount24h: number;
  failedExecutionCount24h: number;
  environmentCount: number;
  secretCount: number;
  templateCount: number;
  healthyEngineCount: number;
  unhealthyEngineCount: number;
  successRate24h: number;
}

export interface RuntimeEnvironment {
  id: number;
  code: string;
  name: string;
  environmentType: EnvironmentType;
  description?: string;
  enabled: boolean;
  variables: Record<string, unknown>;
  lockVersion: number;
  updatedBy?: string;
  updatedAt: string;
}

export interface SecretMetadata {
  id: number;
  environmentId: number;
  secretKey: string;
  description?: string;
  maskedValue: string;
  updatedBy?: string;
  updatedAt: string;
}

export interface ParameterTemplate {
  id: number;
  code: string;
  name: string;
  description?: string;
  enabled: boolean;
  parameters: Record<string, unknown>;
  lockVersion: number;
  updatedBy?: string;
  updatedAt: string;
}

export interface EngineEndpoint {
  id: number;
  taskType: string;
  code: string;
  name: string;
  probeType: ProbeType;
  endpoint?: string;
  enabled: boolean;
  config: Record<string, unknown>;
  healthStatus: HealthStatus;
  healthMessage?: string;
  lastCheckedAt?: string;
  lockVersion: number;
  updatedBy?: string;
  updatedAt: string;
}

export interface AuditEntry {
  id: number;
  action: string;
  resourceType: string;
  resourceId?: string;
  summary: Record<string, unknown>;
  operator: string;
  occurredAt: string;
}

export interface PlatformSnapshot {
  overview: PlatformOverview;
  environments: RuntimeEnvironment[];
  secrets: SecretMetadata[];
  parameterTemplates: ParameterTemplate[];
  engines: EngineEndpoint[];
  recentAudit: AuditEntry[];
  secretEncryptionConfigured: boolean;
}

const unwrap = <T>(response: ApiResponse<T>): T => {
  if (response.code !== 0 && response.code !== 200) {
    throw new Error(response.message ?? response.msg ?? '平台接口调用失败');
  }
  return response.data;
};

export const platformRepository = {
  async snapshot() {
    return unwrap(await HttpUtils.get<PlatformSnapshot>(`${API_PREFIX}/snapshot`));
  },
  async saveEnvironment(payload: Record<string, unknown> & { id?: number }) {
    return unwrap(
      payload.id
        ? await HttpUtils.put<RuntimeEnvironment>(
            `${API_PREFIX}/environments/${payload.id}`,
            payload,
          )
        : await HttpUtils.post<RuntimeEnvironment>(
            `${API_PREFIX}/environments`,
            payload,
          ),
    );
  },
  async deleteEnvironment(id: number) {
    return unwrap(
      await HttpUtils.delete<{ deleted: boolean }>(
        `${API_PREFIX}/environments/${id}`,
      ),
    );
  },
  async saveSecret(payload: Record<string, unknown> & { id?: number }) {
    return unwrap(
      payload.id
        ? await HttpUtils.put<SecretMetadata>(
            `${API_PREFIX}/secrets/${payload.id}`,
            payload,
          )
        : await HttpUtils.post<SecretMetadata>(`${API_PREFIX}/secrets`, payload),
    );
  },
  async deleteSecret(id: number) {
    return unwrap(
      await HttpUtils.delete<{ deleted: boolean }>(
        `${API_PREFIX}/secrets/${id}`,
      ),
    );
  },
  async saveTemplate(payload: Record<string, unknown> & { id?: number }) {
    return unwrap(
      payload.id
        ? await HttpUtils.put<ParameterTemplate>(
            `${API_PREFIX}/parameter-templates/${payload.id}`,
            payload,
          )
        : await HttpUtils.post<ParameterTemplate>(
            `${API_PREFIX}/parameter-templates`,
            payload,
          ),
    );
  },
  async deleteTemplate(id: number) {
    return unwrap(
      await HttpUtils.delete<{ deleted: boolean }>(
        `${API_PREFIX}/parameter-templates/${id}`,
      ),
    );
  },
  async saveEngine(payload: Record<string, unknown> & { id?: number }) {
    return unwrap(
      payload.id
        ? await HttpUtils.put<EngineEndpoint>(
            `${API_PREFIX}/engines/${payload.id}`,
            payload,
          )
        : await HttpUtils.post<EngineEndpoint>(`${API_PREFIX}/engines`, payload),
    );
  },
  async deleteEngine(id: number) {
    return unwrap(
      await HttpUtils.delete<{ deleted: boolean }>(
        `${API_PREFIX}/engines/${id}`,
      ),
    );
  },
  async checkEngine(id: number) {
    return unwrap(
      await HttpUtils.post<EngineEndpoint>(`${API_PREFIX}/engines/${id}/check`, {}),
    );
  },
  async checkAllEngines() {
    return unwrap(
      await HttpUtils.post<EngineEndpoint[]>(`${API_PREFIX}/engines/check-all`, {}),
    );
  },
};

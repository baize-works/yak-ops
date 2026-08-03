import type { DataSourceRecord } from '@/pages/data-source/types';
import { API_SUCCESS_CODE } from '@/services/http/response';

import { connectorIdForDataSourceType } from './form-schema/valueAdapter';

export type SyncMode = 'GUIDE_SINGLE' | 'GUIDE_MULTI';
export type EndpointKind = 'source' | 'sink';

export interface SyncTaskBasic {
  jobName: string;
  jobDesc: string;
  mode: SyncMode;
}

export interface SyncEndpoint {
  connectorId: string;
  pluginName: string;
  dbType: string;
  dataSourceId: string;
  config: Record<string, any>;
}

export interface SyncChannel {
  parallelism: number;
  speedLimitEnabled: boolean;
  recordsPerSecond: number;
  dirtyDataPolicy: 'stop' | 'skip';
  dirtyDataLimit: number;
}

export interface SyncEditorState {
  id: string;
  mode: SyncMode;
  basic: SyncTaskBasic;
  source: SyncEndpoint;
  sink: SyncEndpoint;
  channel: SyncChannel;
  state?: Record<string, any>;
}

export interface CreateSyncTaskValues {
  jobName: string;
  jobDesc?: string;
  mode: SyncMode;
}

export interface CreateSyncEndpoint {
  connectorId: string;
  pluginName: string;
  dbType: string;
}

export const DEFAULT_CHANNEL_CONFIG: SyncChannel = {
  parallelism: 1,
  speedLimitEnabled: false,
  recordsPerSecond: 10000,
  dirtyDataPolicy: 'stop',
  dirtyDataLimit: 0,
};

export const isApiSuccess = (response: any): boolean =>
  response?.code === API_SUCCESS_CODE;

export const responseMessage = (response: any, fallback: string): string =>
  response?.message || response?.msg || fallback;

export const extractGeneratedId = (response: any): string => {
  const data = response?.data;
  const value = data && typeof data === 'object' ? data.id : data;
  return value === undefined || value === null ? '' : String(value);
};

export const extractSavedId = (response: any, fallback: string): string => {
  const data = response?.data;
  const value = data && typeof data === 'object' ? data.id : data;
  return value === undefined || value === null || value === ''
    ? fallback
    : String(value);
};

const endpointFromType = (
  endpoint?: Partial<CreateSyncEndpoint> | null,
): SyncEndpoint => {
  const dbType = String(endpoint?.dbType || '');
  const connectorId =
    String(endpoint?.connectorId || '') || connectorIdForDataSourceType(dbType);

  return {
    connectorId,
    pluginName: String(endpoint?.pluginName || dbType),
    dbType,
    dataSourceId: '',
    config: {},
  };
};

export const buildCreatePayload = (
  taskId: string,
  values: CreateSyncTaskValues,
  source: CreateSyncEndpoint,
  sink: CreateSyncEndpoint,
) => ({
  id: taskId,
  basic: {
    jobName: values.jobName.trim(),
    jobDesc: values.jobDesc?.trim() || '',
    mode: values.mode,
  },
  source: endpointFromType(source),
  sink: endpointFromType(sink),
  channel: DEFAULT_CHANNEL_CONFIG,
});

const legacyEndpoint = (
  raw: any,
  kind: EndpointKind,
): Partial<SyncEndpoint> | null => {
  const workflow = raw?.workflow || {};
  const node = Array.isArray(workflow?.nodes)
    ? workflow.nodes.find(
        (item: any) =>
          item?.data?.nodeType === kind || item?.type === kind,
      )
    : undefined;

  if (!node) return null;

  const data = node?.data || {};
  const config = data?.config || {};
  const workflowType = kind === 'source'
    ? workflow?.sourceType
    : workflow?.targetType;

  return {
    connectorId:
      config?.connectorId ||
      data?.connectorId ||
      workflowType?.connectorId ||
      config?.connectorType ||
      data?.connectorType ||
      workflowType?.connectorType,
    pluginName:
      config?.pluginName ||
      data?.pluginName ||
      workflowType?.pluginName,
    dbType:
      config?.dbType ||
      data?.dbType ||
      workflowType?.dbType,
    dataSourceId: String(
      config?.dataSourceId ||
        (kind === 'source'
          ? workflow?.sourceDataSourceId || raw?.basic?.sourceDataSourceId
          : workflow?.targetDataSourceId || raw?.basic?.targetDataSourceId) ||
        '',
    ),
    config,
  };
};

const normalizeEndpoint = (
  raw: any,
  kind: EndpointKind,
): SyncEndpoint => {
  const direct = raw?.[kind];
  const legacy = legacyEndpoint(raw, kind);
  const value = direct && typeof direct === 'object' ? direct : legacy || {};
  const basicType = kind === 'source'
    ? raw?.basic?.sourceType
    : raw?.basic?.targetType;
  const dbType = String(value?.dbType || basicType || '');
  const connectorId = String(
    value?.connectorId ||
      value?.connectorType ||
      connectorIdForDataSourceType(dbType),
  );

  return {
    connectorId,
    pluginName: String(value?.pluginName || dbType),
    dbType,
    dataSourceId: String(value?.dataSourceId || ''),
    config:
      value?.config && typeof value.config === 'object'
        ? value.config
        : {},
  };
};

export const normalizeEditDetail = (
  raw: any,
  fallbackId: string,
): SyncEditorState => {
  const id = String(raw?.id || fallbackId);
  const basicRaw = raw?.basic || {};
  const mode = (
    basicRaw?.mode || raw?.mode || 'GUIDE_SINGLE'
  ) as SyncMode;
  const legacyChannel = raw?.workflow?.channelConfig || {};
  const channelRaw = raw?.channel || {};

  return {
    id,
    mode,
    basic: {
      jobName: basicRaw?.jobName || raw?.jobName || '',
      jobDesc: basicRaw?.jobDesc || raw?.jobDesc || '',
      mode,
    },
    source: normalizeEndpoint(raw, 'source'),
    sink: normalizeEndpoint(raw, 'sink'),
    channel: {
      ...DEFAULT_CHANNEL_CONFIG,
      ...legacyChannel,
      ...channelRaw,
      parallelism: Number(
        channelRaw?.parallelism || raw?.env?.parallelism || 1,
      ),
      dirtyDataPolicy:
        (channelRaw?.dirtyDataPolicy || legacyChannel?.dirtyDataPolicy) === 'skip'
          ? 'skip'
          : 'stop',
    },
    state: raw?.state,
  };
};

export const endpoint = (
  editor: SyncEditorState,
  kind: EndpointKind,
): SyncEndpoint => editor[kind];

const resetEndpointConfig = (
  kind: EndpointKind,
  config: Record<string, any>,
): Record<string, any> =>
  kind === 'source'
    ? {
        ...config,
        table: '',
        tables: [],
        tablePattern: '',
        sql: '',
      }
    : {
        ...config,
        table: '',
        targetTableName: '',
        sql: '',
        primaryKey: '',
      };

const connectorMeta = (record: DataSourceRecord) => {
  const dbType = String(record.dbType || '');

  return {
    dbType,
    connectorId: connectorIdForDataSourceType(dbType),
    pluginName:
      String((record as any).pluginName || '') ||
      (dbType ? `JDBC-${dbType}` : String(record.name || '')),
  };
};

export const applyEndpointSelection = (
  editor: SyncEditorState,
  kind: EndpointKind,
  record: DataSourceRecord,
): SyncEditorState => {
  const current = editor[kind];
  const recordId = String(record.id || '');
  const dataSourceChanged = current.dataSourceId !== recordId;
  const meta = connectorMeta(record);

  return {
    ...editor,
    [kind]: {
      ...current,
      ...meta,
      dataSourceId: recordId,
      config: dataSourceChanged
        ? resetEndpointConfig(kind, current.config)
        : current.config,
    },
  };
};

export const updateEndpointConfig = (
  editor: SyncEditorState,
  kind: EndpointKind,
  patch: Record<string, any>,
): SyncEditorState => ({
  ...editor,
  [kind]: {
    ...editor[kind],
    config: {
      ...editor[kind].config,
      ...patch,
    },
  },
});

export const buildSavePayload = (
  editor: SyncEditorState,
) => ({
  id: editor.id,
  basic: {
    jobName: editor.basic.jobName.trim(),
    jobDesc: editor.basic.jobDesc.trim(),
    mode: editor.mode,
  },
  source: editor.source,
  sink: editor.sink,
  channel: editor.channel,
});

import type { DataSourceRecord } from '@/pages/data-source/types';
import type {
  EnvConfig,
  ScheduleConfig,
} from '../workflow/components/ScheduleConfigContent/types';

export type SyncMode = 'GUIDE_SINGLE' | 'GUIDE_MULTI';
export type EndpointKind = 'source' | 'sink';

export interface SyncTaskBasic {
  jobName: string;
  jobDesc: string;
  clientId: string;
  mode: SyncMode;
  sourceType: string;
  targetType: string;
  sourceDataSourceId: string;
  targetDataSourceId: string;
}

export interface SyncWorkflow {
  nodes: any[];
  edges: any[];
  sourceType?: Record<string, any> | null;
  targetType?: Record<string, any> | null;
  sourceDataSourceId?: string;
  targetDataSourceId?: string;
  channelConfig?: Record<string, any>;
}

export interface SyncEditorState {
  id: string;
  mode: SyncMode;
  basic: SyncTaskBasic;
  workflow: SyncWorkflow;
  schedule: ScheduleConfig;
  env: EnvConfig;
  state?: Record<string, any>;
}

export interface CreateSyncTaskValues {
  jobName: string;
  jobDesc?: string;
  mode: SyncMode;
}

export const DEFAULT_SCHEDULE_CONFIG: ScheduleConfig = {
  paramsList: [],
  instanceGenerateMode: 'nextDay',
  scheduleRunType: 'pause',
  timeoutMode: 'system',
  timeoutValue: 1,
  timeoutUnit: 'hour',
  rerunPolicy: 'success_or_fail',
  autoRetry: true,
  retryTimes: 1,
  retryInterval: 1,
  scheduleType: 'day',
  hourMode: 'range',
  hourlyRangeValue: {
    startTime: '00:00',
    intervalHour: 1,
    endTime: '23:59',
  },
  hourlyAppointValue: {
    hours: [0],
    minute: '00',
  },
  dailyValue: {
    time: '00:00',
  },
  weeklyValue: {
    weekdays: ['MON'],
    time: '00:00',
  },
  effectType: 'forever',
  cronExpression: '0 0 0 * * ?',
};

export const DEFAULT_ENV_CONFIG: EnvConfig = {
  jobMode: 'BATCH',
  parallelism: 1,
};

export const isApiSuccess = (response: any): boolean =>
  response?.code === 200 || response?.code === 0;

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

const connectorMeta = (record?: DataSourceRecord | null) => {
  if (!record) return null;

  const dbType = record.dbType || '';
  return {
    dbType,
    connectorType: dbType,
    pluginName: dbType || record.name || '',
  };
};

const createEndpointNode = (
  taskId: string,
  kind: EndpointKind,
  record?: DataSourceRecord | null,
) => {
  const meta = connectorMeta(record);
  const isSource = kind === 'source';
  const nodeId = `${kind}-${taskId}`;

  return {
    id: nodeId,
    type: kind,
    position: isSource ? { x: 120, y: 180 } : { x: 660, y: 180 },
    data: {
      nodeType: kind,
      title: isSource ? '数据来源' : '数据去向',
      description: isSource ? '读取源端数据' : '写入目标端数据',
      dbType: meta?.dbType || '',
      connectorType: meta?.connectorType || '',
      pluginName: meta?.pluginName || '',
      config: isSource
        ? {
            dataSourceId: record?.id ? String(record.id) : '',
            dbType: meta?.dbType || '',
            connectorType: meta?.connectorType || '',
            pluginName: meta?.pluginName || '',
            readMode: 'table',
            table: '',
            tables: [],
            sql: '',
            extraParams: [],
          }
        : {
            dataSourceId: record?.id ? String(record.id) : '',
            dbType: meta?.dbType || '',
            connectorType: meta?.connectorType || '',
            pluginName: meta?.pluginName || '',
            autoCreateTable: false,
            targetMode: 'table',
            table: '',
            targetTableName: '',
            tableNamingRule: 'same_name',
            sql: '',
            writeMode: 'append',
            primaryKey: '',
            batchSize: 1000,
            extraParams: [],
          },
    },
  };
};

export const buildDirectWorkflow = (
  taskId: string,
  source?: DataSourceRecord | null,
  target?: DataSourceRecord | null,
): SyncWorkflow => {
  const sourceNode = createEndpointNode(taskId, 'source', source);
  const sinkNode = createEndpointNode(taskId, 'sink', target);

  return {
    nodes: [sourceNode, sinkNode],
    edges: [
      {
        id: `edge-${sourceNode.id}-${sinkNode.id}`,
        source: sourceNode.id,
        target: sinkNode.id,
      },
    ],
    sourceType: connectorMeta(source),
    targetType: connectorMeta(target),
    sourceDataSourceId: source?.id ? String(source.id) : '',
    targetDataSourceId: target?.id ? String(target.id) : '',
    channelConfig: {
      speedLimitEnabled: false,
      recordsPerSecond: 10000,
      dirtyDataPolicy: 'stop',
      dirtyDataLimit: 0,
    },
  };
};

export const buildCreatePayload = (
  taskId: string,
  values: CreateSyncTaskValues,
) => {
  const basic: SyncTaskBasic = {
    jobName: values.jobName.trim(),
    jobDesc: values.jobDesc?.trim() || '',
    clientId: '',
    mode: values.mode,
    sourceType: '',
    targetType: '',
    sourceDataSourceId: '',
    targetDataSourceId: '',
  };

  return {
    id: taskId,
    basic,
    workflow: buildDirectWorkflow(taskId),
    schedule: DEFAULT_SCHEDULE_CONFIG,
    env: DEFAULT_ENV_CONFIG,
  };
};

const mergeSchedule = (schedule?: Partial<ScheduleConfig>): ScheduleConfig => ({
  ...DEFAULT_SCHEDULE_CONFIG,
  ...(schedule || {}),
  hourlyRangeValue: {
    ...DEFAULT_SCHEDULE_CONFIG.hourlyRangeValue!,
    ...(schedule?.hourlyRangeValue || {}),
  },
  hourlyAppointValue: {
    ...DEFAULT_SCHEDULE_CONFIG.hourlyAppointValue!,
    ...(schedule?.hourlyAppointValue || {}),
  },
  dailyValue: {
    ...DEFAULT_SCHEDULE_CONFIG.dailyValue!,
    ...(schedule?.dailyValue || {}),
  },
  weeklyValue: {
    ...DEFAULT_SCHEDULE_CONFIG.weeklyValue!,
    ...(schedule?.weeklyValue || {}),
  },
});

export const normalizeEditDetail = (
  raw: any,
  fallbackId: string,
): SyncEditorState => {
  const id = String(raw?.id || fallbackId);
  const basicRaw = raw?.basic || {};
  const workflowRaw = raw?.workflow || {};
  const mode = (basicRaw?.mode || raw?.mode || 'GUIDE_SINGLE') as SyncMode;
  const workflow =
    Array.isArray(workflowRaw?.nodes) && workflowRaw.nodes.length > 0
      ? {
          ...workflowRaw,
          nodes: workflowRaw.nodes,
          edges: Array.isArray(workflowRaw.edges) ? workflowRaw.edges : [],
          channelConfig: {
            speedLimitEnabled: false,
            recordsPerSecond: 10000,
            dirtyDataPolicy: 'stop',
            dirtyDataLimit: 0,
            ...(workflowRaw.channelConfig || {}),
          },
        }
      : buildDirectWorkflow(id);

  return {
    id,
    mode,
    basic: {
      jobName: basicRaw?.jobName || raw?.jobName || '',
      jobDesc: basicRaw?.jobDesc || raw?.jobDesc || '',
      clientId: basicRaw?.clientId ? String(basicRaw.clientId) : '',
      mode,
      sourceType: basicRaw?.sourceType || workflow.sourceType?.dbType || '',
      targetType: basicRaw?.targetType || workflow.targetType?.dbType || '',
      sourceDataSourceId: String(
        basicRaw?.sourceDataSourceId ||
          workflow.sourceDataSourceId ||
          workflow.sourceId ||
          '',
      ),
      targetDataSourceId: String(
        basicRaw?.targetDataSourceId ||
          workflow.targetDataSourceId ||
          workflow.targetId ||
          '',
      ),
    },
    workflow,
    schedule: mergeSchedule(raw?.schedule),
    env: {
      ...DEFAULT_ENV_CONFIG,
      ...(raw?.env || {}),
      jobMode: 'BATCH',
    },
    state: raw?.state,
  };
};

export const endpointNode = (
  workflow: SyncWorkflow,
  kind: EndpointKind,
): any | undefined =>
  workflow.nodes.find(
    (node) => node?.data?.nodeType === kind || node?.type === kind,
  );

const replaceEndpointNode = (
  workflow: SyncWorkflow,
  kind: EndpointKind,
  record: DataSourceRecord,
): SyncWorkflow => {
  const recordId = String(record.id || '');
  const meta = connectorMeta(record)!;
  const existing = endpointNode(workflow, kind);
  const nextNode = existing || createEndpointNode('draft', kind, record);
  const nextData = {
    ...(nextNode.data || {}),
    dbType: meta.dbType,
    connectorType: meta.connectorType,
    pluginName: meta.pluginName,
    config: {
      ...(nextNode.data?.config || {}),
      dataSourceId: recordId,
      dbType: meta.dbType,
      connectorType: meta.connectorType,
      pluginName: meta.pluginName,
    },
  };

  return {
    ...workflow,
    nodes: existing
      ? workflow.nodes.map((node) =>
          node.id === existing.id ? { ...node, data: nextData } : node,
        )
      : [...workflow.nodes, { ...nextNode, data: nextData }],
    ...(kind === 'source'
      ? { sourceType: meta, sourceDataSourceId: recordId }
      : { targetType: meta, targetDataSourceId: recordId }),
  };
};

export const applyConnectionSelection = (
  editor: SyncEditorState,
  source: DataSourceRecord,
  target: DataSourceRecord,
): SyncEditorState => {
  let workflow = replaceEndpointNode(editor.workflow, 'source', source);
  workflow = replaceEndpointNode(workflow, 'sink', target);

  return {
    ...editor,
    basic: {
      ...editor.basic,
      sourceType: source.dbType || '',
      targetType: target.dbType || '',
      sourceDataSourceId: String(source.id || ''),
      targetDataSourceId: String(target.id || ''),
    },
    workflow,
  };
};

export const updateEndpointConfig = (
  editor: SyncEditorState,
  kind: EndpointKind,
  patch: Record<string, any>,
): SyncEditorState => {
  const current = endpointNode(editor.workflow, kind);
  if (!current) return editor;

  return {
    ...editor,
    workflow: {
      ...editor.workflow,
      nodes: editor.workflow.nodes.map((node) =>
        node.id === current.id
          ? {
              ...node,
              data: {
                ...(node.data || {}),
                config: {
                  ...(node.data?.config || {}),
                  ...patch,
                },
              },
            }
          : node,
      ),
    },
  };
};

export const buildSavePayload = (editor: SyncEditorState) => ({
  id: editor.id,
  basic: editor.basic,
  workflow: editor.workflow,
  schedule: editor.schedule,
  env: editor.env,
});

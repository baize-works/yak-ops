import HttpUtils from '@/utils/HttpUtils';
import dayjs from 'dayjs';
import {
  DEFAULT_COMMON_RUNTIME,
  type DevelopmentDocument,
  type DevelopmentResource,
  type FormResourceContent,
  type ResourceContent,
  type ResourceStatus,
  type WorkspaceSnapshot,
} from '../core/types';

const API_PREFIX = '/api/v1/data-development';
const DEFAULT_PROJECT_CODE = 'default';
const DEFAULT_PROJECT_NAME = '用户数据平台';

interface ApiResponse<T> {
  code: number;
  data: T;
  msg?: string;
  message?: string;
}

interface ApiProject {
  id: number;
  code: string;
  name: string;
  description?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

interface ApiResource {
  id: number;
  projectId: number;
  parentId?: number | null;
  resourceKind: 'FOLDER' | 'TASK' | 'ASSET';
  name: string;
  description?: string;
  sortOrder: number;
  ownerId?: string;
  createdBy?: string;
  updatedBy?: string;
  lockVersion: number;
  createdAt: string;
  updatedAt: string;
}

interface ApiTask {
  id: number;
  projectId: number;
  taskType: string;
  pluginVersion: string;
  schemaVersion: number;
  status: ResourceStatus;
  draftRevision: number;
  publishedVersionId?: number;
  engineType?: string;
  createdAt: string;
  updatedAt: string;
}

interface ApiDraft {
  taskId: number;
  revision: number;
  pluginVersion: string;
  schemaVersion: number;
  definition: Record<string, unknown>;
  contentDigest: string;
  updatedBy?: string;
  updatedAt: string;
}

interface ApiTaskDetail {
  resource: ApiResource;
  task: ApiTask;
  draft: ApiDraft;
}

interface ApiWorkspace {
  project: ApiProject;
  tasks: ApiTaskDetail[];
}

interface ApiTaskPlugin {
  taskType: string;
  name: string;
  description: string;
  category: string;
  pluginVersion: string;
  schemaVersion: number;
}

interface ApiVersion {
  id: number;
  taskId: number;
  versionNumber: number;
  publishedAt: string;
}

interface ApiExecution {
  id: number;
  taskId: number;
  status:
    | 'CREATED'
    | 'QUEUED'
    | 'RUNNING'
    | 'SUCCEEDED'
    | 'FAILED'
    | 'CANCELED'
    | 'TIMED_OUT'
    | 'LOST';
  createdAt: string;
}

export interface WorkbenchBootstrapResult {
  project: ApiProject;
  supportedTaskTypes: string[];
  snapshot: WorkspaceSnapshot;
}

export interface CreatedExecution {
  id: string;
  status: ApiExecution['status'];
}

const unwrap = <T>(response: ApiResponse<T>): T => {
  if (response.code !== 0 && response.code !== 200) {
    throw new Error(response.message ?? response.msg ?? '数据开发接口调用失败');
  }
  return response.data;
};

const formatDateTime = (value?: string) =>
  value ? dayjs(value).format('YYYY-MM-DD HH:mm') : '-';

const folderIdFor = (taskType: string) =>
  taskType.trim().toLowerCase().replaceAll('_', '-');

const cloneJson = <T>(value: T): T => structuredClone(value);

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const parseJsonRecord = (
  value: unknown,
  label: string,
): Record<string, unknown> => {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  if (typeof value !== 'string' || !value.trim()) return {};
  try {
    const parsed = JSON.parse(value);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error(`${label}必须是 JSON 对象`);
    }
    return parsed as Record<string, unknown>;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`${label}不是合法的 JSON`);
    }
    throw error;
  }
};

const parseIntegerList = (value: unknown): number[] => {
  if (Array.isArray(value)) {
    return value
      .map((item) => Number(item))
      .filter((item) => Number.isInteger(item));
  }
  if (typeof value !== 'string') return [];
  return value
    .split(',')
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isInteger(item));
};

const toEditorContent = (
  taskType: string,
  content: ResourceContent,
  config: Record<string, unknown>,
): ResourceContent => {
  if (taskType === 'SHELL') {
    if (content.kind === 'text') return cloneJson(content);
    const value = content.kind === 'form' ? asRecord(content.value) : {};
    return {
      kind: 'text',
      language: 'shell',
      value: String(value.command ?? config.command ?? ''),
    };
  }

  if (taskType !== 'HTTP' || content.kind !== 'form') return cloneJson(content);
  const value = asRecord(content.value);
  return {
    ...content,
    value: {
      ...value,
      headers:
        typeof value.headers === 'string'
          ? value.headers
          : JSON.stringify(asRecord(value.headers), null, 2),
    },
  } satisfies FormResourceContent;
};

const toEditorRuntimeSpecific = (
  taskType: string,
  runtime: Record<string, unknown>,
): Record<string, unknown> => {
  if (taskType === 'HTTP') {
    return {
      ...runtime,
      successCodes: Array.isArray(runtime.successCodes)
        ? runtime.successCodes.join(',')
        : (runtime.successCodes ?? ''),
    };
  }
  if (taskType === 'SHELL') {
    return {
      ...runtime,
      environment:
        typeof runtime.environment === 'string'
          ? runtime.environment
          : JSON.stringify(asRecord(runtime.environment), null, 2),
    };
  }
  return cloneJson(runtime);
};

const toApiContent = (
  taskType: string,
  content: ResourceContent,
): ResourceContent => {
  if (taskType !== 'HTTP' || content.kind !== 'form') return cloneJson(content);
  const value = asRecord(content.value);
  return {
    ...content,
    value: {
      ...value,
      headers: parseJsonRecord(value.headers, '请求头'),
    },
  };
};

const toApiRuntimeSpecific = (
  taskType: string,
  runtime: Record<string, unknown>,
): Record<string, unknown> => {
  if (taskType === 'HTTP') {
    return {
      requestTimeoutSeconds: Number(runtime.requestTimeoutSeconds ?? 60),
      successCodes: parseIntegerList(runtime.successCodes),
      maxResponseBodyCharacters: Number(
        runtime.maxResponseBodyCharacters ?? 1_000_000,
      ),
    };
  }
  if (taskType === 'SHELL') {
    return {
      workDirectory: String(runtime.workDirectory ?? ''),
      environment: parseJsonRecord(runtime.environment, '环境变量'),
    };
  }
  return cloneJson(runtime);
};

const toDefinition = (
  resource: DevelopmentResource,
  document: DevelopmentDocument,
) => {
  const content = toApiContent(resource.resourceType, document.content);
  const specific = toApiRuntimeSpecific(
    resource.resourceType,
    document.runtime.specific,
  );
  const contentValue = content.kind === 'form' ? content.value : {};
  const config =
    resource.resourceType === 'SHELL' && content.kind === 'text'
      ? { command: content.value, ...specific }
      : { ...asRecord(contentValue), ...specific };

  return {
    schemaVersion: document.schemaVersion,
    taskType: resource.resourceType,
    pluginVersion: String(document.config.pluginVersion ?? ''),
    content,
    config,
    runtime: {
      common: cloneJson(document.runtime.common),
      specific,
    },
    inputs: asRecord(document.config.inputs),
    outputs: asRecord(document.config.outputs),
  };
};

const mapTaskDetail = (
  detail: ApiTaskDetail,
): { resource: DevelopmentResource; document: DevelopmentDocument } => {
  const { resource: source, task, draft } = detail;
  const definition = asRecord(draft.definition);
  const runtime = asRecord(definition.runtime);
  const config = asRecord(definition.config);
  const content =
    (definition.content as ResourceContent | undefined) ??
    ({ kind: 'form', value: {} } satisfies FormResourceContent);

  const resource: DevelopmentResource = {
    id: String(source.id),
    projectId: String(source.projectId),
    parentId: source.parentId ? String(source.parentId) : null,
    folderId: folderIdFor(task.taskType),
    nodeType: 'ARTIFACT',
    resourceType: task.taskType,
    name: source.name,
    description: source.description,
    owner: 'me',
    updatedBy: source.updatedBy ?? source.ownerId ?? 'system',
    favorite: false,
    engine: task.engineType ?? task.taskType,
    status: task.status,
    schemaVersion: task.schemaVersion,
    latestRevision: task.draftRevision,
    publishedVersion: task.publishedVersionId,
    createdAt: formatDateTime(source.createdAt),
    updatedAt: formatDateTime(source.updatedAt),
  };

  const document: DevelopmentDocument = {
    resourceId: String(source.id),
    revision: draft.revision,
    schemaVersion: draft.schemaVersion,
    content: toEditorContent(task.taskType, content, config),
    config: {
      ...config,
      pluginVersion: draft.pluginVersion,
      inputs: asRecord(definition.inputs),
      outputs: asRecord(definition.outputs),
    },
    runtime: {
      common: {
        ...DEFAULT_COMMON_RUNTIME,
        ...asRecord(runtime.common),
      },
      specific: toEditorRuntimeSpecific(task.taskType, {
        ...config,
        ...asRecord(runtime.specific),
      }),
    },
    dirty: false,
    loadStatus: 'READY',
    saveStatus: 'IDLE',
    updatedAt: formatDateTime(draft.updatedAt),
  };

  return { resource, document };
};

const getErrorStatus = (error: unknown): number | undefined => {
  const candidate = error as {
    response?: { status?: number };
    status?: number;
  };
  return candidate?.response?.status ?? candidate?.status;
};

const getErrorMessage = (error: unknown): string => {
  const candidate = error as {
    response?: { data?: { message?: string; msg?: string } };
    message?: string;
  };
  return (
    candidate?.response?.data?.message ??
    candidate?.response?.data?.msg ??
    candidate?.message ??
    '数据开发接口调用失败'
  );
};

export const isWorkbenchConflict = (error: unknown) =>
  getErrorStatus(error) === 409 || getErrorMessage(error).includes('冲突');

export const workbenchErrorMessage = getErrorMessage;

const listProjects = async () =>
  unwrap(await HttpUtils.get<ApiProject[]>(`${API_PREFIX}/projects`));

const ensureProject = async (): Promise<ApiProject> => {
  const existing = await listProjects();
  const defaultProject = existing.find(
    (project) => project.code === DEFAULT_PROJECT_CODE,
  );
  if (defaultProject) return defaultProject;
  if (existing.length > 0) return existing[0];

  try {
    return unwrap(
      await HttpUtils.post<ApiProject>(`${API_PREFIX}/projects`, {
        code: DEFAULT_PROJECT_CODE,
        name: DEFAULT_PROJECT_NAME,
        description: 'Yak Ops 数据开发默认项目',
      }),
    );
  } catch {
    const projects = await listProjects();
    if (projects.length > 0) return projects[0];
    throw new Error('默认数据开发项目创建失败');
  }
};

export const workbenchRepository = {
  async bootstrap(): Promise<WorkbenchBootstrapResult> {
    const [project, plugins] = await Promise.all([
      ensureProject(),
      HttpUtils.get<ApiTaskPlugin[]>(`${API_PREFIX}/task-plugins`).then(unwrap),
    ]);
    const workspace = unwrap(
      await HttpUtils.get<ApiWorkspace>(
        `${API_PREFIX}/projects/${project.id}/workspace`,
      ),
    );
    const mapped = workspace.tasks.map(mapTaskDetail);
    const resources = mapped.map((item) => item.resource);
    const documents = mapped.map((item) => item.document);

    return {
      project: workspace.project,
      supportedTaskTypes: plugins.map((plugin) => plugin.taskType),
      snapshot: {
        resources,
        documents,
        openResourceIds: resources.slice(0, 1).map((resource) => resource.id),
        activeResourceId: resources[0]?.id,
      },
    };
  },

  async createTask(
    projectId: string,
    taskType: string,
    name: string,
    engineType: string,
  ) {
    const detail = unwrap(
      await HttpUtils.post<ApiTaskDetail>(
        `${API_PREFIX}/projects/${projectId}/tasks`,
        {
          parentId: null,
          name: name.trim(),
          taskType,
          engineType,
          sortOrder: 0,
        },
      ),
    );
    return mapTaskDetail(detail);
  },

  async saveDraft(
    resource: DevelopmentResource,
    document: DevelopmentDocument,
  ): Promise<DevelopmentDocument> {
    const draft = unwrap(
      await HttpUtils.put<ApiDraft>(
        `${API_PREFIX}/tasks/${resource.id}/draft`,
        {
          baseRevision: document.revision,
          definition: toDefinition(resource, document),
        },
      ),
    );
    return mapTaskDetail({
      resource: {
        id: Number(resource.id),
        projectId: Number(resource.projectId),
        parentId: resource.parentId ? Number(resource.parentId) : null,
        resourceKind: 'TASK',
        name: resource.name,
        description: resource.description,
        sortOrder: 0,
        ownerId: resource.updatedBy,
        updatedBy: draft.updatedBy,
        lockVersion: 0,
        createdAt: resource.createdAt,
        updatedAt: draft.updatedAt,
      },
      task: {
        id: Number(resource.id),
        projectId: Number(resource.projectId),
        taskType: resource.resourceType,
        pluginVersion: draft.pluginVersion,
        schemaVersion: draft.schemaVersion,
        status: resource.status,
        draftRevision: draft.revision,
        publishedVersionId: resource.publishedVersion,
        engineType: resource.engine,
        createdAt: resource.createdAt,
        updatedAt: draft.updatedAt,
      },
      draft,
    }).document;
  },

  async validate(
    resource: DevelopmentResource,
    document: DevelopmentDocument,
  ) {
    return unwrap(
      await HttpUtils.post<{
        valid: boolean;
        normalizedDefinition: Record<string, unknown>;
        contentDigest: string;
        warnings: string[];
      }>(`${API_PREFIX}/tasks/${resource.id}/validate`, {
        definition: toDefinition(resource, document),
      }),
    );
  },

  async publish(
    resource: DevelopmentResource,
    document: DevelopmentDocument,
    comment?: string,
  ) {
    return unwrap(
      await HttpUtils.post<ApiVersion>(
        `${API_PREFIX}/tasks/${resource.id}/versions`,
        {
          draftRevision: document.revision,
          comment,
        },
      ),
    );
  },

  async createExecution(
    resource: DevelopmentResource,
    document: DevelopmentDocument,
  ): Promise<CreatedExecution> {
    const execution = unwrap(
      await HttpUtils.post<ApiExecution>(
        `${API_PREFIX}/tasks/${resource.id}/executions`,
        {
          sourceType: document.dirty
            ? 'EPHEMERAL_SNAPSHOT'
            : 'DRAFT_REVISION',
          draftRevision: document.dirty ? undefined : document.revision,
          definitionSnapshot: document.dirty
            ? toDefinition(resource, document)
            : undefined,
          runtime: document.runtime,
          input: {},
          idempotencyKey:
            globalThis.crypto?.randomUUID?.() ??
            `${resource.id}-${Date.now()}-${Math.random()}`,
        },
      ),
    );
    return { id: String(execution.id), status: execution.status };
  },

  async cancelExecution(executionId: string): Promise<CreatedExecution> {
    const execution = unwrap(
      await HttpUtils.post<ApiExecution>(
        `${API_PREFIX}/executions/${executionId}/cancel`,
        {},
      ),
    );
    return { id: String(execution.id), status: execution.status };
  },

  async updateResource(
    resource: DevelopmentResource,
    patch: Pick<DevelopmentResource, 'name' | 'description'>,
  ) {
    return unwrap(
      await HttpUtils.put<ApiResource>(
        `${API_PREFIX}/resources/${resource.id}`,
        {
          name: patch.name,
          description: patch.description,
          sortOrder: 0,
        },
      ),
    );
  },

  async deleteResource(resourceId: string) {
    return unwrap(
      await HttpUtils.delete<{ deleted: boolean }>(
        `${API_PREFIX}/resources/${resourceId}`,
      ),
    );
  },
};

import dayjs from 'dayjs';
import {
  DEFAULT_COMMON_RUNTIME,
  type DevelopmentDocument,
  type DevelopmentResource,
  type NodePluginDefinition,
  type ResourceContent,
  type WorkspaceSnapshot,
} from '../core/types';
import { BUILTIN_NODE_PLUGINS } from '../plugins';

const pluginByType = new Map<string, NodePluginDefinition>(
  BUILTIN_NODE_PLUGINS.map((plugin) => [plugin.type, plugin]),
);

const now = '2026-08-05 09:30';
const currentUserName = 'aliyun0124584470';

const createResource = (
  id: string,
  name: string,
  resourceType: string,
  options: Partial<DevelopmentResource> = {},
): DevelopmentResource => {
  const plugin = pluginByType.get(resourceType);
  if (!plugin) throw new Error(`Unknown mock plugin: ${resourceType}`);

  return {
    id,
    projectId: 'user-data-platform',
    parentId: null,
    folderId: plugin.metadata.folderId,
    nodeType: 'ARTIFACT',
    resourceType,
    name,
    description: plugin.metadata.description,
    owner: 'me',
    updatedBy: currentUserName,
    favorite: false,
    engine: plugin.metadata.defaultEngine,
    status: 'DRAFT',
    schemaVersion: plugin.version,
    latestRevision: 1,
    createdAt: now,
    updatedAt: now,
    ...options,
  };
};

const createDocument = (
  resource: DevelopmentResource,
  content?: ResourceContent,
  options: Partial<DevelopmentDocument> = {},
): DevelopmentDocument => {
  const plugin = pluginByType.get(resource.resourceType);
  if (!plugin) throw new Error(`Unknown mock plugin: ${resource.resourceType}`);

  return {
    resourceId: resource.id,
    revision: resource.latestRevision,
    schemaVersion: plugin.version,
    content: content ?? plugin.authoring.createDefaultContent(resource.name),
    config: {},
    runtime: {
      common: { ...DEFAULT_COMMON_RUNTIME },
      specific: plugin.runtime?.defaultValue() ?? {},
    },
    dirty: false,
    loadStatus: 'READY',
    saveStatus: 'IDLE',
    updatedAt: resource.updatedAt,
    ...options,
  };
};

export const createMockWorkspaceSnapshot = (): WorkspaceSnapshot => {
  const resources: DevelopmentResource[] = [
    createResource('sql-user-profile', 'user_profile.sql', 'SQL', {
      favorite: true,
      status: 'PUBLISHED',
      publishedVersion: 3,
      latestRevision: 4,
      updatedAt: '2026-08-05 09:20',
    }),
    createResource('http-user-profile', 'fetch_user_profile_api', 'HTTP', {
      updatedBy: 'api_owner',
      updatedAt: '2026-08-05 09:10',
    }),
  ];

  const documents = resources.map((resource) => createDocument(resource));

  return {
    resources,
    documents,
    openResourceIds: ['sql-user-profile', 'http-user-profile'],
    activeResourceId: 'sql-user-profile',
  };
};

export const createNewResource = (
  plugin: NodePluginDefinition,
  name: string,
): { resource: DevelopmentResource; document: DevelopmentDocument } => {
  const timestamp = Date.now();
  const rawName = name.trim();
  const extension = plugin.metadata.extension ?? '';
  const normalizedName =
    extension && !rawName.endsWith(extension)
      ? `${rawName}${extension}`
      : rawName;
  const id = `${plugin.type.toLowerCase()}-${timestamp}`;
  const updatedAt = dayjs().format('YYYY-MM-DD HH:mm');

  const resource = createResource(id, normalizedName, plugin.type, {
    folderId: plugin.metadata.folderId,
    engine: plugin.metadata.defaultEngine,
    updatedBy: currentUserName,
    updatedAt,
    createdAt: updatedAt,
    latestRevision: 0,
  });

  const document = createDocument(
    resource,
    plugin.authoring.createDefaultContent(normalizedName),
    {
      revision: 0,
      dirty: true,
      updatedAt,
    },
  );

  return { resource, document };
};

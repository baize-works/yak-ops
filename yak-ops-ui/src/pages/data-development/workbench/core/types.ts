import type { ComponentType } from 'react';

export type ResourceType = string;
export type ResourceNodeType = 'FOLDER' | 'ARTIFACT';
export type ResourceStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
export type ResourceOwner = 'me' | 'other';
export type ExplorerFilter = 'all' | 'owned' | 'favorite';
export type RightPanelKey = 'properties' | 'run' | 'schedule' | 'version';
export type ExecutionStatus =
  | 'IDLE'
  | 'QUEUED'
  | 'RUNNING'
  | 'SUCCESS'
  | 'FAILED'
  | 'STOPPED';

export type IconComponent = ComponentType<{
  size?: number;
  className?: string;
}>;

export interface TextResourceContent {
  kind: 'text';
  language: 'sql' | 'python' | 'shell' | 'json' | 'yaml' | 'text';
  value: string;
}

export interface FormResourceContent {
  kind: 'form';
  value: Record<string, unknown>;
}

export interface GraphNode {
  id: string;
  type: string;
  label: string;
  position: { x: number; y: number };
  data: Record<string, unknown>;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  data?: Record<string, unknown>;
}

export interface GraphResourceContent {
  kind: 'graph';
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface NotebookCell {
  id: string;
  language: string;
  source: string;
  output?: string;
}

export interface NotebookResourceContent {
  kind: 'notebook';
  cells: NotebookCell[];
}

export interface CustomResourceContent {
  kind: 'custom';
  rendererKey: string;
  value: unknown;
}

export type ResourceContent =
  | TextResourceContent
  | FormResourceContent
  | GraphResourceContent
  | NotebookResourceContent
  | CustomResourceContent;

export interface DevelopmentResource {
  id: string;
  projectId: string;
  parentId: string | null;
  folderId: string;
  nodeType: ResourceNodeType;
  resourceType: ResourceType;
  name: string;
  description?: string;
  owner: ResourceOwner;
  favorite?: boolean;
  engine: string;
  status: ResourceStatus;
  schemaVersion: number;
  latestRevision: number;
  publishedVersion?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CommonRuntimeConfig {
  environmentId: string;
  timeoutSeconds: number;
  retryTimes: number;
  retryIntervalSeconds: number;
  priority: number;
  workerGroup: string;
  failureStrategy: 'STOP' | 'CONTINUE';
  parameters: Record<string, unknown>;
}

export interface DevelopmentDocument {
  resourceId: string;
  revision: number;
  schemaVersion: number;
  content: ResourceContent;
  config: Record<string, unknown>;
  runtime: {
    common: CommonRuntimeConfig;
    specific: Record<string, unknown>;
  };
  dirty: boolean;
  loadStatus: 'IDLE' | 'LOADING' | 'READY' | 'ERROR';
  saveStatus: 'IDLE' | 'SAVING' | 'ERROR' | 'CONFLICT';
  updatedAt: string;
}

export type FormFieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'select'
  | 'switch';

export interface FormFieldOption {
  label: string;
  value: string | number;
}

export interface FormFieldSchema {
  key: string;
  label: string;
  type: FormFieldType;
  placeholder?: string;
  description?: string;
  required?: boolean;
  options?: FormFieldOption[];
  min?: number;
  max?: number;
  step?: number;
  rows?: number;
  span?: 1 | 2;
}

export interface WorkbenchFormSchema {
  columns?: 1 | 2;
  fields: FormFieldSchema[];
}

export interface NodeCapabilities {
  editable: boolean;
  runnable: boolean;
  stoppable: boolean;
  formatable: boolean;
  publishable: boolean;
  schedulable: boolean;
  versionable: boolean;
  shareable: boolean;
  validatable: boolean;
}

export interface ResourceRendererDefinition {
  rendererKey: string;
  schema?: WorkbenchFormSchema;
}

export interface RuntimeDefinition {
  schema: WorkbenchFormSchema;
  defaultValue: () => Record<string, unknown>;
}

export interface NodePluginDefinition {
  type: ResourceType;
  version: number;
  metadata: {
    label: string;
    description: string;
    category: string;
    folderId: string;
    folderLabel: string;
    folderOrder: number;
    icon: IconComponent;
    iconClassName: string;
    extension?: string;
    defaultEngine: string;
    engineOptions?: Array<{ label: string; value: string }>;
  };
  capabilities: NodeCapabilities;
  authoring: ResourceRendererDefinition & {
    createDefaultContent: (name: string) => ResourceContent;
  };
  runtime?: RuntimeDefinition;
  toolbar: string[];
  migrations?: NodeMigration[];
}

export interface NodeMigration {
  fromVersion: number;
  toVersion: number;
  migrate: (document: DevelopmentDocument) => DevelopmentDocument;
}

export type ToolbarGroup =
  | 'primary'
  | 'edit'
  | 'resource'
  | 'publish'
  | 'more';

export interface WorkbenchActionContext {
  resource: DevelopmentResource;
  document: DevelopmentDocument;
  plugin: NodePluginDefinition;
  executionStatus: ExecutionStatus;
}

export interface WorkbenchActionDefinition {
  id: string;
  label: string;
  icon: IconComponent;
  command: string;
  group: ToolbarGroup;
  order: number;
  danger?: boolean;
  visible?: (context: WorkbenchActionContext) => boolean;
  enabled?: (context: WorkbenchActionContext) => boolean;
  loading?: (context: WorkbenchActionContext) => boolean;
}

export interface ResourceRendererProps {
  resource: DevelopmentResource;
  document: DevelopmentDocument;
  plugin: NodePluginDefinition;
  onChange: (document: DevelopmentDocument) => void;
}

export type ResourceRendererComponent = ComponentType<ResourceRendererProps>;

export interface WorkbenchCommandDefinition {
  id: string;
  execute: (context: WorkbenchActionContext) => void | Promise<void>;
}

export interface WorkbenchFolderDefinition {
  id: string;
  label: string;
  order: number;
}

export interface WorkspaceSnapshot {
  resources: DevelopmentResource[];
  documents: DevelopmentDocument[];
  openResourceIds: string[];
  activeResourceId?: string;
}

export const DEFAULT_COMMON_RUNTIME: CommonRuntimeConfig = {
  environmentId: 'development',
  timeoutSeconds: 3600,
  retryTimes: 1,
  retryIntervalSeconds: 30,
  priority: 5,
  workerGroup: 'default',
  failureStrategy: 'STOP',
  parameters: {},
};

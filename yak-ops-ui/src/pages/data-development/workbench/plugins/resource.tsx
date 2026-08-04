import { FileCog } from 'lucide-react';
import type {
  NodePluginDefinition,
  WorkbenchFormSchema,
} from '../core/types';

const RESOURCE_SCHEMA: WorkbenchFormSchema = {
  columns: 1,
  fields: [
    {
      key: 'format',
      label: '资源格式',
      type: 'select',
      options: [
        { label: 'JSON', value: 'json' },
        { label: 'YAML', value: 'yaml' },
        { label: '文本', value: 'text' },
      ],
    },
    {
      key: 'path',
      label: '资源路径',
      type: 'text',
      placeholder: '/config/dev.env',
    },
    {
      key: 'content',
      label: '资源内容',
      type: 'textarea',
      rows: 16,
    },
  ],
};

export const resourcePlugin: NodePluginDefinition = {
  type: 'RESOURCE',
  version: 1,
  metadata: {
    label: '资源文件',
    description: '保存配置、模板和开发辅助资源。',
    category: '资源',
    folderId: 'resource',
    folderLabel: '资源文件',
    folderOrder: 80,
    icon: FileCog,
    iconClassName: 'text-[#687076]',
    defaultEngine: 'Resource',
    engineOptions: [{ label: 'Resource', value: 'Resource' }],
  },
  capabilities: {
    editable: true,
    runnable: false,
    stoppable: false,
    formatable: true,
    publishable: false,
    schedulable: false,
    versionable: true,
    shareable: true,
    validatable: false,
  },
  authoring: {
    rendererKey: 'schema-form',
    schema: RESOURCE_SCHEMA,
    createDefaultContent: () => ({
      kind: 'form',
      value: {
        format: 'text',
        path: '/config/dev.env',
        content: 'YAK_ENV=development\nYAK_PARALLELISM=4',
      },
    }),
  },
  toolbar: [
    'document.save',
    'document.format',
    'document.refresh',
    'resource.share',
  ],
};

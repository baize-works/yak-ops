import type {
  NodeCapabilities,
  ResourceContent,
  WorkbenchFormSchema,
} from '../core/types';

export const joinLines = (...lines: string[]) => lines.join('\n');

export const CODE_CAPABILITIES: NodeCapabilities = {
  editable: true,
  runnable: true,
  stoppable: true,
  formatable: true,
  publishable: true,
  schedulable: true,
  versionable: true,
  shareable: true,
  validatable: true,
};

export const DEFAULT_RUNTIME_SCHEMA: WorkbenchFormSchema = {
  columns: 1,
  fields: [
    {
      key: 'parallelism',
      label: '并行度',
      type: 'number',
      min: 1,
      max: 1024,
      required: true,
    },
    {
      key: 'queue',
      label: '运行队列',
      type: 'select',
      options: [
        { label: 'default', value: 'default' },
        { label: 'etl-high', value: 'etl-high' },
        { label: 'batch-low', value: 'batch-low' },
      ],
    },
  ],
};

export const createTextContent = (
  language: 'sql' | 'python' | 'shell' | 'json' | 'yaml' | 'text',
  value: string,
): ResourceContent => ({ kind: 'text', language, value });

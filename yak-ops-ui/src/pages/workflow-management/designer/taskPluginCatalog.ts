import type { WorkflowNodeType, WorkflowTaskPluginRecord } from '../types';
import {
  WORKFLOW_NODE_CATALOG,
  type WorkflowNodeMeta,
} from './constants';

const categoryColor: Record<string, string> = {
  GENERAL: '#0ea5e9',
  SYSTEM: '#475569',
  DATA: '#14b8a6',
  AI: '#7c3aed',
};

export const mergeTaskPluginCatalog = (plugins: WorkflowTaskPluginRecord[]) => {
  for (const plugin of plugins) {
    const defaults = extractDefaults(plugin.configurationSchema);
    const existing = WORKFLOW_NODE_CATALOG.find((item) => item.type === plugin.type);
    if (existing) {
      existing.title = plugin.name || existing.title;
      existing.description = plugin.description || existing.description;
      existing.defaults = { ...defaults, ...existing.defaults };
      continue;
    }

    const meta: WorkflowNodeMeta = {
      type: plugin.type as WorkflowNodeType,
      title: plugin.name || plugin.type,
      description: plugin.description || `${plugin.type} 任务插件`,
      category: 'integration',
      color: categoryColor[plugin.category] || '#64748b',
      backendType: plugin.type,
      defaults,
    };
    WORKFLOW_NODE_CATALOG.push(meta);
  }
};

const extractDefaults = (schema: Record<string, unknown>) => {
  const fields = isObject(schema.fields) ? schema.fields : {};
  const defaults: Record<string, unknown> = {};
  Object.entries(fields).forEach(([key, value]) => {
    if (!isObject(value) || !Object.prototype.hasOwnProperty.call(value, 'defaultValue')) return;
    defaults[key] = value.defaultValue;
  });
  return defaults;
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

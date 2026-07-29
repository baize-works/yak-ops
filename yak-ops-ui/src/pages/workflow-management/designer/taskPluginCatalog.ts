import type { WorkflowTaskPluginRecord } from '../types';
import { WORKFLOW_NODE_CATALOG } from './constants';

const SUPPORTED_TASK_TYPES = new Set(['HTTP', 'SHELL']);

export const mergeTaskPluginCatalog = (plugins: WorkflowTaskPluginRecord[]) => {
  for (const plugin of plugins) {
    if (!SUPPORTED_TASK_TYPES.has(plugin.type)) continue;

    const existing = WORKFLOW_NODE_CATALOG.find(
      (item) => item.backendType === plugin.type,
    );
    if (!existing) continue;

    existing.defaults = {
      ...extractDefaults(plugin.configurationSchema),
      ...existing.defaults,
    };
  }
};

const extractDefaults = (schema: Record<string, unknown>) => {
  const fields = isObject(schema.fields) ? schema.fields : {};
  const defaults: Record<string, unknown> = {};

  Object.entries(fields).forEach(([key, value]) => {
    if (
      !isObject(value) ||
      !Object.prototype.hasOwnProperty.call(value, 'defaultValue')
    )
      return;
    defaults[key] = value.defaultValue;
  });

  return defaults;
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

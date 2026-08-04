import type { ExecutionResultDefinition } from './types';

export const BUILTIN_EXECUTION_RESULT_DEFINITIONS: ExecutionResultDefinition[] = [
  { resourceType: 'SQL', rendererKey: 'table-result' },
  { resourceType: 'FLINK_SQL', rendererKey: 'table-result' },
  { resourceType: 'HTTP', rendererKey: 'json-result' },
  { resourceType: 'SHELL', rendererKey: 'terminal-result' },
  { resourceType: 'PYTHON', rendererKey: 'terminal-result' },
  { resourceType: 'NOTEBOOK', rendererKey: 'notebook-result' },
  { resourceType: 'DATA_INTEGRATION', rendererKey: 'pipeline-result' },
  { resourceType: 'RESOURCE', rendererKey: 'text-result' },
];

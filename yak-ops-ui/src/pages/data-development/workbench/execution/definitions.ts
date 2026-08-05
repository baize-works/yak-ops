import type { ExecutionResultDefinition } from './types';

/** Phase-one execution result mapping. */
export const BUILTIN_EXECUTION_RESULT_DEFINITIONS: ExecutionResultDefinition[] = [
  { resourceType: 'SQL', rendererKey: 'table-result' },
  { resourceType: 'HTTP', rendererKey: 'json-result' },
];

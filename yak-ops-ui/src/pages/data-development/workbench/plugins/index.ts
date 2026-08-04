import type { NodePluginDefinition } from '../core/types';
import { dataIntegrationPlugin } from './data-integration';
import { flinkSqlPlugin } from './flink-sql';
import { httpPlugin } from './http';
import { notebookPlugin } from './notebook';
import { pythonPlugin } from './python';
import { resourcePlugin } from './resource';
import { shellPlugin } from './shell';
import { sqlPlugin } from './sql';

export const BUILTIN_NODE_PLUGINS: NodePluginDefinition[] = [
  sqlPlugin,
  flinkSqlPlugin,
  pythonPlugin,
  shellPlugin,
  notebookPlugin,
  dataIntegrationPlugin,
  httpPlugin,
  resourcePlugin,
];

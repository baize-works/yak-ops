import type { NodePluginDefinition } from '../core/types';
import { httpPlugin } from './http';
import { mysqlPlugin } from './mysql';

/** Phase-one data-development nodes. */
export const BUILTIN_NODE_PLUGINS: NodePluginDefinition[] = [
  mysqlPlugin,
  httpPlugin,
];

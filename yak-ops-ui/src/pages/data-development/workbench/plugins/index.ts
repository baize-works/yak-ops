import type { NodePluginDefinition } from '../core/types';
import { httpPlugin } from './http';
import { sqlPlugin } from './sql';

/** Phase-one data-development nodes. */
export const BUILTIN_NODE_PLUGINS: NodePluginDefinition[] = [
  sqlPlugin,
  httpPlugin,
];

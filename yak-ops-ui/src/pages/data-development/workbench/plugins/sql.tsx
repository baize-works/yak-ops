import { Braces } from 'lucide-react';
import type { NodePluginDefinition } from '../core/types';
import {
  CODE_CAPABILITIES,
  DEFAULT_RUNTIME_SCHEMA,
  createTextContent,
  joinLines,
} from './shared';

export const sqlPlugin: NodePluginDefinition = {
  type: 'SQL',
  version: 1,
  metadata: {
    label: 'SQL 脚本',
    description: '编写批处理 SQL，支持多种计算引擎。',
    category: '数据开发',
    folderId: 'sql',
    folderLabel: 'SQL',
    folderOrder: 10,
    icon: Braces,
    iconClassName: 'text-[#22a447]',
    extension: '.sql',
    defaultEngine: 'Spark SQL',
    engineOptions: [
      { label: 'Spark SQL', value: 'Spark SQL' },
      { label: 'Hive', value: 'Hive' },
      { label: 'MySQL', value: 'MySQL' },
    ],
  },
  capabilities: CODE_CAPABILITIES,
  authoring: {
    rendererKey: 'code',
    createDefaultContent: (name) =>
      createTextContent(
        'sql',
        joinLines(
          '-- ================================================================',
          '-- Yak-ops 数据开发 - SQL 脚本',
          `-- 任务名称: ${name}`,
          '-- 创建人: admin',
          '-- ================================================================',
          '',
          'SELECT',
          '  user_id,',
          '  event_type,',
          '  event_time',
          'FROM dwd_user_behavior',
          'WHERE dt = ${bizdate};',
        ),
      ),
  },
  runtime: {
    schema: DEFAULT_RUNTIME_SCHEMA,
    defaultValue: () => ({ parallelism: 4, queue: 'default' }),
  },
  toolbar: [
    'execution.run',
    'execution.stop',
    'document.save',
    'document.format',
    'document.refresh',
    'version.publish',
    'document.validate',
    'resource.share',
  ],
};

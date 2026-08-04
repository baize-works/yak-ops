import { FileCode2 } from 'lucide-react';
import type { NodePluginDefinition } from '../core/types';
import {
  CODE_CAPABILITIES,
  DEFAULT_RUNTIME_SCHEMA,
  createTextContent,
  joinLines,
} from './shared';

export const flinkSqlPlugin: NodePluginDefinition = {
  type: 'FLINK_SQL',
  version: 1,
  metadata: {
    label: 'Flink SQL',
    description: '编写实时计算 SQL，支持 Checkpoint 与流式运行参数。',
    category: '数据开发',
    folderId: 'flink',
    folderLabel: 'Flink',
    folderOrder: 20,
    icon: FileCode2,
    iconClassName: 'text-[#ff8a00]',
    extension: '.sql',
    defaultEngine: 'Flink SQL',
    engineOptions: [{ label: 'Flink SQL', value: 'Flink SQL' }],
  },
  capabilities: CODE_CAPABILITIES,
  authoring: {
    rendererKey: 'code',
    createDefaultContent: (name) =>
      createTextContent(
        'sql',
        joinLines(
          '-- ================================================================',
          '-- Yak-ops 数据开发 - Flink SQL 脚本',
          `-- 任务名称: ${name}`,
          '-- 创建人: admin',
          '-- ================================================================',
          '',
          "SET 'execution.checkpointing.interval' = '60s';",
          "SET 'parallelism.default' = '4';",
          '',
          'CREATE TABLE src_user_behavior (',
          '  user_id BIGINT,',
          '  event_type STRING,',
          '  event_time TIMESTAMP(3)',
          ') WITH (',
          "  'connector' = 'mysql-cdc',",
          "  'hostname' = 'rm-example.mysql.rds.aliyuncs.com',",
          "  'table-name' = 'user_behavior'",
          ');',
          '',
          'INSERT INTO dwd_user_behavior',
          'SELECT user_id, UPPER(event_type), event_time',
          'FROM src_user_behavior;',
        ),
      ),
  },
  runtime: {
    schema: {
      columns: 1,
      fields: [
        ...DEFAULT_RUNTIME_SCHEMA.fields,
        {
          key: 'checkpointIntervalSeconds',
          label: 'Checkpoint 间隔（秒）',
          type: 'number',
          min: 10,
          max: 3600,
        },
        {
          key: 'savepointPath',
          label: 'Savepoint 路径',
          type: 'text',
          placeholder: 's3://bucket/savepoints/job-001',
        },
      ],
    },
    defaultValue: () => ({
      parallelism: 4,
      queue: 'default',
      checkpointIntervalSeconds: 60,
      savepointPath: '',
    }),
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

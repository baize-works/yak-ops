import { FileCode2 } from 'lucide-react';
import type { NodePluginDefinition } from '../core/types';
import {
  CODE_CAPABILITIES,
  createTextContent,
  joinLines,
} from './shared';

export const flinkSqlPlugin: NodePluginDefinition = {
  type: 'FLINK_SQL',
  version: 1,
  metadata: {
    label: 'Flink SQL',
    description: '通过 Flink SQL Gateway 提交流批 SQL 并读取结果。',
    category: '数据开发',
    folderId: 'flink',
    folderLabel: 'Flink',
    folderOrder: 20,
    icon: FileCode2,
    iconClassName: 'text-[#ff8a00]',
    extension: '.sql',
    defaultEngine: 'Flink SQL Gateway',
    engineOptions: [
      { label: 'Flink SQL Gateway', value: 'Flink SQL Gateway' },
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
          '-- Yak Ops 数据开发 - Flink SQL Gateway',
          `-- 任务名称: ${name}`,
          '-- ================================================================',
          '',
          'SELECT CURRENT_TIMESTAMP AS current_time;',
        ),
      ),
  },
  runtime: {
    schema: {
      columns: 1,
      fields: [
        {
          key: 'gatewayUrl',
          label: 'SQL Gateway 地址',
          type: 'text',
          required: true,
          placeholder: 'http://127.0.0.1:8083',
        },
        {
          key: 'sessionName',
          label: 'Session 名称',
          type: 'text',
          placeholder: 'yak-ops',
        },
        {
          key: 'sessionProperties',
          label: 'Session 属性',
          type: 'textarea',
          rows: 6,
          placeholder:
            'execution.runtime-mode=streaming\nparallelism.default=4',
          description: '每行一个 key=value。',
        },
        {
          key: 'requestTimeoutSeconds',
          label: '请求超时（秒）',
          type: 'number',
          min: 1,
          max: 3600,
        },
        {
          key: 'pollIntervalMillis',
          label: '结果轮询间隔（毫秒）',
          type: 'number',
          min: 100,
          max: 10000,
        },
        {
          key: 'maxRows',
          label: '最大返回行数',
          type: 'number',
          min: 1,
          max: 100000,
        },
      ],
    },
    defaultValue: () => ({
      gatewayUrl: 'http://127.0.0.1:8083',
      sessionName: 'yak-ops',
      sessionProperties: '',
      requestTimeoutSeconds: 60,
      pollIntervalMillis: 500,
      maxRows: 1000,
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

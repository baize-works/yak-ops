import { Braces } from 'lucide-react';
import type { NodePluginDefinition } from '../core/types';
import {
  CODE_CAPABILITIES,
  createTextContent,
  joinLines,
} from './shared';

export const sqlPlugin: NodePluginDefinition = {
  type: 'SQL',
  version: 1,
  metadata: {
    label: 'JDBC SQL',
    description: '通过 JDBC 执行查询或 DML，并返回结构化表格结果。',
    category: '数据开发',
    folderId: 'sql',
    folderLabel: 'SQL',
    folderOrder: 10,
    icon: Braces,
    iconClassName: 'text-[#22a447]',
    extension: '.sql',
    defaultEngine: 'JDBC SQL',
    engineOptions: [
      { label: 'MySQL', value: 'MySQL' },
      { label: 'ORACLE', value: 'Oracle' },
      { label: 'PostgreSQL', value: 'PostgreSQL' },
      { label: 'Doris', value: 'Doris' },
      { label: '通用 JDBC', value: 'JDBC SQL' },
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
          '-- Yak Ops 数据开发 - JDBC SQL',
          `-- 任务名称: ${name}`,
          '-- ================================================================',
          '',
          'SELECT 1 AS yak_ops_ready;',
        ),
      ),
  },
  runtime: {
    schema: {
      columns: 1,
      fields: [
        {
          key: 'jdbcUrl',
          label: 'JDBC 地址',
          type: 'text',
          required: true,
          placeholder: 'jdbc:mysql://127.0.0.1:3306/yak_security',
        },
        {
          key: 'username',
          label: '用户名',
          type: 'text',
          placeholder: 'root',
        },
        {
          key: 'password',
          label: '密码',
          type: 'text',
        },
        {
          key: 'driverClassName',
          label: '驱动类',
          type: 'text',
          placeholder: 'com.mysql.cj.jdbc.Driver',
        },
        {
          key: 'maxRows',
          label: '最大返回行数',
          type: 'number',
          min: 1,
          max: 100000,
        },
        {
          key: 'fetchSize',
          label: 'Fetch Size',
          type: 'number',
          min: 1,
          max: 100000,
        },
        {
          key: 'queryTimeoutSeconds',
          label: '查询超时（秒）',
          type: 'number',
          min: 1,
          max: 86400,
        },
        {
          key: 'readOnly',
          label: '只读连接',
          type: 'switch',
        },
      ],
    },
    defaultValue: () => ({
      jdbcUrl: 'jdbc:mysql://127.0.0.1:3306/yak_security',
      username: 'root',
      password: '',
      driverClassName: 'com.mysql.cj.jdbc.Driver',
      maxRows: 1000,
      fetchSize: 200,
      queryTimeoutSeconds: 60,
      readOnly: true,
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

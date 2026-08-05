import { Database } from 'lucide-react';
import type { NodePluginDefinition } from '../core/types';
import {
  CODE_CAPABILITIES,
  createTextContent,
  joinLines,
} from './shared';

export const mysqlPlugin: NodePluginDefinition = {
  type: 'MYSQL',
  version: 1,
  metadata: {
    label: 'MySQL',
    description: '执行 MySQL 查询或 DML，并返回结构化表格结果。',
    category: '数据库',
    folderId: 'mysql',
    folderLabel: 'MySQL',
    folderOrder: 10,
    icon: Database,
    iconClassName: 'text-[var(--yak-brand-color)]',
    extension: '.sql',
    defaultEngine: 'MYSQL',
  },
  capabilities: CODE_CAPABILITIES,
  authoring: {
    rendererKey: 'code',
    createDefaultContent: (name) =>
      createTextContent(
        'sql',
        joinLines(
          '-- ================================================================',
          '-- Yak Ops 数据开发 - MySQL',
          `-- 节点名称: ${name}`,
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
          label: 'MySQL 地址',
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
          label: 'MySQL 驱动类',
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

import { Database } from 'lucide-react';
import type { NodePluginDefinition } from '../core/types';
import { CODE_CAPABILITIES } from './shared';

export const dataIntegrationPlugin: NodePluginDefinition = {
  type: 'DATA_INTEGRATION',
  version: 1,
  metadata: {
    label: '数据集成任务',
    description: '通过可视化节点和连线配置数据同步。',
    category: '数据集成',
    folderId: 'integration',
    folderLabel: '数据集成任务',
    folderOrder: 60,
    icon: Database,
    iconClassName: 'text-[#13a8a8]',
    defaultEngine: 'Link-Up',
    engineOptions: [{ label: 'Link-Up', value: 'Link-Up' }],
  },
  capabilities: {
    ...CODE_CAPABILITIES,
    formatable: false,
  },
  authoring: {
    rendererKey: 'integration',
    createDefaultContent: () => ({
      kind: 'graph',
      nodes: [
        {
          id: 'source-1',
          type: 'MYSQL_SOURCE',
          label: 'MySQL Source',
          position: { x: 120, y: 160 },
          data: {
            datasourceId: 'mysql-prod',
            tableName: 'user_behavior',
          },
        },
        {
          id: 'target-1',
          type: 'ODPS_SINK',
          label: 'ODPS Sink',
          position: { x: 540, y: 160 },
          data: {
            datasourceId: 'odps-dev',
            tableName: 'dwd_user_behavior',
          },
        },
      ],
      edges: [
        {
          id: 'edge-1',
          source: 'source-1',
          target: 'target-1',
        },
      ],
    }),
  },
  runtime: {
    schema: {
      columns: 1,
      fields: [
        {
          key: 'parallelism',
          label: '同步并行度',
          type: 'number',
          min: 1,
          max: 128,
        },
        {
          key: 'speedLimit',
          label: '速度上限（行/秒）',
          type: 'number',
          min: 0,
        },
        {
          key: 'errorLimit',
          label: '脏数据上限',
          type: 'number',
          min: 0,
        },
      ],
    },
    defaultValue: () => ({
      parallelism: 4,
      speedLimit: 10000,
      errorLimit: 100,
    }),
  },
  toolbar: [
    'execution.run',
    'execution.stop',
    'document.save',
    'integration.auto-layout',
    'document.validate',
    'integration.preview',
    'version.publish',
    'resource.share',
  ],
};

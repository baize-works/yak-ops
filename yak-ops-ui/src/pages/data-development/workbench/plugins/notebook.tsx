import { BookOpen } from 'lucide-react';
import type { NodePluginDefinition } from '../core/types';
import { CODE_CAPABILITIES } from './shared';

export const notebookPlugin: NodePluginDefinition = {
  type: 'NOTEBOOK',
  version: 1,
  metadata: {
    label: 'Notebook',
    description: '以 Cell 组织交互式数据分析。',
    category: '数据分析',
    folderId: 'notebook',
    folderLabel: 'Notebook',
    folderOrder: 50,
    icon: BookOpen,
    iconClassName: 'text-[#8b5cf6]',
    extension: '.ipynb',
    defaultEngine: 'PySpark',
    engineOptions: [
      { label: 'PySpark', value: 'PySpark' },
      { label: 'Python', value: 'Python' },
    ],
  },
  capabilities: {
    ...CODE_CAPABILITIES,
    formatable: false,
    schedulable: false,
  },
  authoring: {
    rendererKey: 'notebook',
    createDefaultContent: () => ({
      kind: 'notebook',
      cells: [
        {
          id: 'cell-1',
          language: 'python',
          source: 'from pyspark.sql import functions as F',
        },
        {
          id: 'cell-2',
          language: 'python',
          source:
            'profiles = spark.table("dim_user_profile")\nprofiles.groupBy("user_level").count().show()',
        },
      ],
    }),
  },
  runtime: {
    schema: {
      columns: 1,
      fields: [
        {
          key: 'sessionMode',
          label: '会话模式',
          type: 'select',
          options: [
            { label: '共享 Session', value: 'shared' },
            { label: '独立 Session', value: 'isolated' },
          ],
        },
        {
          key: 'idleTimeoutMinutes',
          label: '空闲回收时间（分钟）',
          type: 'number',
          min: 5,
          max: 240,
        },
      ],
    },
    defaultValue: () => ({
      sessionMode: 'isolated',
      idleTimeoutMinutes: 30,
    }),
  },
  toolbar: [
    'notebook.run-all',
    'execution.stop',
    'document.save',
    'notebook.clear-output',
    'version.publish',
    'resource.share',
  ],
};

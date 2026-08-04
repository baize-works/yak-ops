import { BookOpen } from 'lucide-react';
import type { NodePluginDefinition } from '../core/types';
import { CODE_CAPABILITIES } from './shared';

export const notebookPlugin: NodePluginDefinition = {
  type: 'NOTEBOOK',
  version: 1,
  metadata: {
    label: 'Notebook',
    description: '顺序执行 Python、Shell 和 Markdown Cell。',
    category: '数据分析',
    folderId: 'notebook',
    folderLabel: 'Notebook',
    folderOrder: 50,
    icon: BookOpen,
    iconClassName: 'text-[#8b5cf6]',
    extension: '.ipynb',
    defaultEngine: 'Local Notebook',
    engineOptions: [
      { label: 'Local Notebook', value: 'Local Notebook' },
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
          language: 'markdown',
          source: '# Yak Ops Notebook',
        },
        {
          id: 'cell-2',
          language: 'python',
          source: 'print("hello yak-ops notebook")',
        },
      ],
    }),
  },
  runtime: {
    schema: {
      columns: 1,
      fields: [
        {
          key: 'pythonExecutable',
          label: 'Python 可执行文件',
          type: 'text',
          placeholder: 'python3',
        },
        {
          key: 'workingDirectory',
          label: '工作目录',
          type: 'text',
        },
        {
          key: 'environment',
          label: '环境变量',
          type: 'textarea',
          rows: 6,
          placeholder: 'PYTHONPATH=/data/libs\nENV=prod',
          description: '每行一个 KEY=VALUE。',
        },
        {
          key: 'continueOnError',
          label: '失败后继续',
          type: 'switch',
        },
        {
          key: 'cellTimeoutSeconds',
          label: '单 Cell 超时（秒）',
          type: 'number',
          min: 1,
          max: 86400,
        },
        {
          key: 'maxOutputLines',
          label: '单 Cell 最大输出行数',
          type: 'number',
          min: 100,
          max: 100000,
        },
      ],
    },
    defaultValue: () => ({
      pythonExecutable: 'python3',
      workingDirectory: '',
      environment: '',
      continueOnError: false,
      cellTimeoutSeconds: 300,
      maxOutputLines: 5000,
    }),
  },
  toolbar: [
    'notebook.run-all',
    'execution.stop',
    'document.save',
    'notebook.clear-output',
    'document.refresh',
    'version.publish',
    'document.validate',
    'resource.share',
  ],
};

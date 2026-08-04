import { Terminal } from 'lucide-react';
import type { NodePluginDefinition } from '../core/types';
import {
  CODE_CAPABILITIES,
  createTextContent,
  joinLines,
} from './shared';

export const shellPlugin: NodePluginDefinition = {
  type: 'SHELL',
  version: 1,
  metadata: {
    label: 'Shell 脚本',
    description: '执行受控的 Shell 运维和数据处理命令。',
    category: '数据开发',
    folderId: 'shell',
    folderLabel: 'Shell',
    folderOrder: 40,
    icon: Terminal,
    iconClassName: 'text-[#3b82f6]',
    extension: '.sh',
    defaultEngine: 'Shell',
    engineOptions: [{ label: 'Shell', value: 'Shell' }],
  },
  capabilities: CODE_CAPABILITIES,
  authoring: {
    rendererKey: 'code',
    createDefaultContent: (name) =>
      createTextContent(
        'shell',
        joinLines(
          '#!/usr/bin/env bash',
          'set -euo pipefail',
          '',
          `echo "running ${name}"`,
        ),
      ),
  },
  runtime: {
    schema: {
      columns: 1,
      fields: [
        {
          key: 'shell',
          label: 'Shell',
          type: 'select',
          options: [
            { label: 'bash', value: 'bash' },
            { label: 'sh', value: 'sh' },
          ],
        },
        {
          key: 'workingDirectory',
          label: '工作目录',
          type: 'text',
          placeholder: '/data/yak-ops/work',
        },
        {
          key: 'environmentVariables',
          label: '环境变量（JSON）',
          type: 'textarea',
          rows: 6,
        },
      ],
    },
    defaultValue: () => ({
      shell: 'bash',
      workingDirectory: '',
      environmentVariables: '{}',
    }),
  },
  toolbar: [
    'execution.run',
    'execution.stop',
    'document.save',
    'document.format',
    'version.publish',
    'resource.share',
  ],
};

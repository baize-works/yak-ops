import { Code2 } from 'lucide-react';
import type { NodePluginDefinition } from '../core/types';
import {
  CODE_CAPABILITIES,
  createTextContent,
  joinLines,
} from './shared';

export const pythonPlugin: NodePluginDefinition = {
  type: 'PYTHON',
  version: 1,
  metadata: {
    label: 'Python 任务',
    description: '在受控本地进程中执行 Python 脚本。',
    category: '数据开发',
    folderId: 'python',
    folderLabel: 'Python',
    folderOrder: 30,
    icon: Code2,
    iconClassName: 'text-[#3478c9]',
    extension: '.py',
    defaultEngine: 'Local Python',
    engineOptions: [{ label: 'Local Python', value: 'Local Python' }],
  },
  capabilities: CODE_CAPABILITIES,
  authoring: {
    rendererKey: 'code',
    createDefaultContent: (name) =>
      createTextContent(
        'python',
        joinLines(
          `"""Yak Ops task: ${name}"""`,
          '',
          '',
          'def main() -> None:',
          '    print("hello yak-ops")',
          '',
          '',
          'if __name__ == "__main__":',
          '    main()',
        ),
      ),
  },
  runtime: {
    schema: {
      columns: 1,
      fields: [
        {
          key: 'pythonExecutable',
          label: 'Python 可执行文件',
          type: 'text',
          required: true,
          placeholder: 'python3',
        },
        {
          key: 'arguments',
          label: '运行参数',
          type: 'text',
          placeholder: '--bizdate ${bizdate}',
        },
        {
          key: 'workingDirectory',
          label: '工作目录',
          type: 'text',
          placeholder: '/data/yak-ops/python',
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
          key: 'maxOutputLines',
          label: '最大输出行数',
          type: 'number',
          min: 100,
          max: 100000,
        },
      ],
    },
    defaultValue: () => ({
      pythonExecutable: 'python3',
      arguments: '',
      workingDirectory: '',
      environment: '',
      maxOutputLines: 5000,
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

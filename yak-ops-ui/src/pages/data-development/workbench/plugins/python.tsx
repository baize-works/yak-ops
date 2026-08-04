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
    description: '编写 Python 数据处理任务。',
    category: '数据开发',
    folderId: 'python',
    folderLabel: 'Python',
    folderOrder: 30,
    icon: Code2,
    iconClassName: 'text-[#3478c9]',
    extension: '.py',
    defaultEngine: 'Python',
    engineOptions: [
      { label: 'Python', value: 'Python' },
      { label: 'PySpark', value: 'PySpark' },
    ],
  },
  capabilities: CODE_CAPABILITIES,
  authoring: {
    rendererKey: 'code',
    createDefaultContent: (name) =>
      createTextContent(
        'python',
        joinLines(
          `"""Yak-ops task: ${name}"""`,
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
          key: 'pythonVersion',
          label: 'Python 版本',
          type: 'select',
          options: [
            { label: 'Python 3.11', value: '3.11' },
            { label: 'Python 3.12', value: '3.12' },
          ],
        },
        {
          key: 'requirements',
          label: '依赖包',
          type: 'textarea',
          rows: 6,
          placeholder: 'pandas==2.2.2\nrequests==2.32.3',
        },
        {
          key: 'arguments',
          label: '运行参数',
          type: 'text',
          placeholder: '--bizdate ${bizdate}',
        },
      ],
    },
    defaultValue: () => ({
      pythonVersion: '3.11',
      requirements: '',
      arguments: '',
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

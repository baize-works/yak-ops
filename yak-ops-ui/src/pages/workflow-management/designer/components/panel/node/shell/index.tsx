import { Input } from 'antd';
import type { WorkflowNodeData } from '../../../../../types';
import {
  KeyValueEditor,
  OutputVariables,
  PanelField,
  PanelSection,
} from '../shared';

interface ShellPanelProps {
  data: WorkflowNodeData;
  onConfigChange: (key: string, value: unknown) => void;
}

const ShellPanel = ({ data, onConfigChange }: ShellPanelProps) => (
  <>
    <PanelSection
      title="执行命令"
      description="命令由工作流执行节点运行，请避免在脚本中直接写入敏感信息。"
    >
      <PanelField label="命令或脚本" required>
        <Input.TextArea
          rows={12}
          className="font-mono text-[10px] leading-[18px] !bg-[#101828] !text-[#e4e7ec]"
          value={String(data.config.command || '')}
          placeholder={'#!/usr/bin/env bash\necho "hello yak ops"'}
          onChange={(event) => onConfigChange('command', event.target.value)}
        />
      </PanelField>
      <PanelField label="工作目录">
        <Input
          value={String(data.config.workDirectory || '')}
          placeholder="/opt/yak/jobs"
          onChange={(event) =>
            onConfigChange('workDirectory', event.target.value)
          }
        />
      </PanelField>
    </PanelSection>

    <PanelSection
      title="环境变量"
      description="节点级环境变量会在执行命令时注入。"
    >
      <KeyValueEditor
        value={data.config.environment}
        onChange={(value) => onConfigChange('environment', value)}
        keyPlaceholder="变量名"
      />
    </PanelSection>

    <PanelSection
      title="输出变量"
      description="Shell 节点完成后可供下游节点引用。"
    >
      <OutputVariables
        items={[
          { name: 'exitCode', type: 'Number', description: '进程退出码' },
          { name: 'stdout', type: 'String', description: '标准输出' },
          { name: 'stderr', type: 'String', description: '错误输出' },
        ]}
      />
    </PanelSection>
  </>
);

export default ShellPanel;

import { Input, Select } from 'antd';
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

const normalizeArgs = (value: unknown): string[] =>
  Array.isArray(value) ? value.map(String) : [];

const ShellPanel = ({ data, onConfigChange }: ShellPanelProps) => (
  <>
    <PanelSection
      title="执行命令"
      description="command 与 args 至少填写一项；配置 args 后会优先按完整进程参数执行。"
    >
      <PanelField label="命令或脚本" required>
        <Input.TextArea
          rows={12}
          className="font-mono text-[10px] leading-[18px] !bg-[#101828] !text-[#e4e7ec]"
          value={String(data.config.command || '')}
          placeholder={'#!/usr/bin/env bash\necho "${message}"'}
          onChange={(event) => onConfigChange('command', event.target.value)}
        />
      </PanelField>

      <PanelField
        label="进程参数"
        hint="按 Enter 添加；配置后优先于命令或脚本"
      >
        <Select
          mode="tags"
          value={normalizeArgs(data.config.args)}
          placeholder="例如 /bin/sh、-c、echo ${message}"
          tokenSeparators={['\n']}
          onChange={(value) => onConfigChange('args', value)}
          options={[]}
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
      description="Shell 节点完成后可供下游节点引用。进程输出会写入任务日志。"
    >
      <OutputVariables
        items={[
          { name: 'processId', type: 'Number', description: '操作系统进程 ID' },
          { name: 'exitCode', type: 'Number', description: '进程退出码' },
        ]}
      />
    </PanelSection>
  </>
);

export default ShellPanel;

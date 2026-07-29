import { Input } from 'antd';
import type { WorkflowNodeData } from '../../../../../types';
import {
  AddButton,
  PanelField,
  PanelSection,
  RowDeleteButton,
} from '../shared';

interface OutputVariable {
  name: string;
  value: string;
}

interface EndPanelProps {
  data: WorkflowNodeData;
  onConfigChange: (key: string, value: unknown) => void;
}

const EndPanel = ({ data, onConfigChange }: EndPanelProps) => {
  const outputs = normalizeOutputs(data.config.outputs);

  const update = (index: number, values: Partial<OutputVariable>) => {
    onConfigChange(
      'outputs',
      outputs.map((item, current) =>
        current === index ? { ...item, ...values } : item,
      ),
    );
  };

  return (
    <PanelSection
      title="输出变量"
      description="将上游节点结果映射为工作流最终输出。"
      operation={
        <AddButton
          onClick={() =>
            onConfigChange('outputs', [
              ...outputs,
              {
                name: `output_${outputs.length + 1}`,
                value: '',
              },
            ])
          }
        >
          添加输出
        </AddButton>
      }
    >
      <div className="space-y-2">
        {outputs.map((output, index) => (
          <div
            key={`${output.name}-${index}`}
            className="grid grid-cols-[124px_minmax(0,1fr)_32px] gap-2 rounded-lg border border-[#e4e7ec] bg-[#fcfcfd] p-2.5"
          >
            <PanelField label="输出名" required>
              <Input
                value={output.name}
                placeholder="result"
                onChange={(event) =>
                  update(index, { name: event.target.value })
                }
              />
            </PanelField>
            <PanelField label="变量或表达式" required>
              <Input
                value={output.value}
                placeholder="{{http.body}}"
                onChange={(event) =>
                  update(index, { value: event.target.value })
                }
              />
            </PanelField>
            <div className="pt-[21px]">
              <RowDeleteButton
                onClick={() =>
                  onConfigChange(
                    'outputs',
                    outputs.filter((_, current) => current !== index),
                  )
                }
              />
            </div>
          </div>
        ))}

        {!outputs.length && (
          <div className="rounded-lg border border-dashed border-[#d0d5dd] py-8 text-center text-[10px] text-[#98a2b3]">
            至少添加一个输出变量
          </div>
        )}
      </div>
    </PanelSection>
  );
};

const normalizeOutputs = (value: unknown): OutputVariable[] => {
  if (!Array.isArray(value)) return [];

  return value.map((item, index) => {
    const record =
      item && typeof item === 'object'
        ? (item as Record<string, unknown>)
        : {};

    return {
      name: String(record.name || `output_${index + 1}`),
      value: String(record.value || ''),
    };
  });
};

export default EndPanel;

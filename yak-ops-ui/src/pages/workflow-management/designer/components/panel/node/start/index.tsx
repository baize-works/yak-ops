import { Input, Select, Switch } from 'antd';
import type { WorkflowNodeData } from '../../../../../types';
import {
  AddButton,
  PanelField,
  PanelSection,
  RowDeleteButton,
} from '../shared';

interface InputVariable {
  name: string;
  type: string;
  required: boolean;
  description?: string;
}

interface StartPanelProps {
  data: WorkflowNodeData;
  onConfigChange: (key: string, value: unknown) => void;
}

const StartPanel = ({ data, onConfigChange }: StartPanelProps) => {
  const variables = normalizeVariables(data.config.inputVariables);

  const update = (index: number, values: Partial<InputVariable>) => {
    onConfigChange(
      'inputVariables',
      variables.map((item, current) =>
        current === index ? { ...item, ...values } : item,
      ),
    );
  };

  return (
    <PanelSection
      title="输入字段"
      description="定义启动工作流时需要填写的参数，可在后续节点中引用。"
      operation={
        <AddButton
          onClick={() =>
            onConfigChange('inputVariables', [
              ...variables,
              {
                name: `input_${variables.length + 1}`,
                type: 'string',
                required: false,
                description: '',
              },
            ])
          }
        >
          添加变量
        </AddButton>
      }
    >
      <div className="space-y-2">
        {variables.map((variable, index) => (
          <div
            key={`${variable.name}-${index}`}
            className="rounded-lg border border-[#e4e7ec] bg-[#fcfcfd] p-2.5"
          >
            <div className="grid grid-cols-[minmax(0,1fr)_104px_32px] gap-2">
              <PanelField label="变量名" required>
                <Input
                  value={variable.name}
                  placeholder="例如：orderId"
                  onChange={(event) =>
                    update(index, { name: event.target.value })
                  }
                />
              </PanelField>
              <PanelField label="类型">
                <Select
                  value={variable.type}
                  options={[
                    { label: 'String', value: 'string' },
                    { label: 'Number', value: 'number' },
                    { label: 'Boolean', value: 'boolean' },
                    { label: 'JSON', value: 'json' },
                  ]}
                  onChange={(value) => update(index, { type: value })}
                />
              </PanelField>
              <div className="pt-[21px]">
                <RowDeleteButton
                  onClick={() =>
                    onConfigChange(
                      'inputVariables',
                      variables.filter((_, current) => current !== index),
                    )
                  }
                />
              </div>
            </div>
            <PanelField label="说明">
              <Input
                value={variable.description}
                placeholder="说明这个变量的用途"
                onChange={(event) =>
                  update(index, { description: event.target.value })
                }
              />
            </PanelField>
            <div className="flex items-center justify-between text-[9px] text-[#667085]">
              <span>必填参数</span>
              <Switch
                size="small"
                checked={variable.required}
                onChange={(checked) => update(index, { required: checked })}
              />
            </div>
          </div>
        ))}

        {!variables.length && (
          <div className="rounded-lg border border-dashed border-[#d0d5dd] py-8 text-center text-[10px] text-[#98a2b3]">
            暂无输入变量
          </div>
        )}
      </div>
    </PanelSection>
  );
};

const normalizeVariables = (value: unknown): InputVariable[] => {
  if (!Array.isArray(value)) return [];

  return value.map((item, index) => {
    const record =
      item && typeof item === 'object'
        ? (item as Record<string, unknown>)
        : {};

    return {
      name: String(record.name || `input_${index + 1}`),
      type: String(record.type || 'string'),
      required: Boolean(record.required),
      description: String(record.description || ''),
    };
  });
};

export default StartPanel;

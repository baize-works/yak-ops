import { Input, Select, Switch, Tooltip } from 'antd';
import { Braces } from 'lucide-react';

import type { WorkflowNodeData } from '../../../../../types';
import {
  AddButton,
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

const variableTypeOptions = [
  {
    label: 'String',
    value: 'string',
  },
  {
    label: 'Number',
    value: 'number',
  },
  {
    label: 'Boolean',
    value: 'boolean',
  },
  {
    label: 'JSON',
    value: 'json',
  },
  {
    label: 'Array',
    value: 'array',
  },
];

const StartPanel = ({
  data,
  onConfigChange,
}: StartPanelProps) => {
  const variables = normalizeVariables(data.config.inputVariables);

  const updateVariable = (
    index: number,
    values: Partial<InputVariable>,
  ) => {
    onConfigChange(
      'inputVariables',
      variables.map((item, currentIndex) =>
        currentIndex === index
          ? {
              ...item,
              ...values,
            }
          : item,
      ),
    );
  };

  const addVariable = () => {
    onConfigChange('inputVariables', [
      ...variables,
      {
        name: `input_${variables.length + 1}`,
        type: 'string',
        required: false,
        description: '',
      },
    ]);
  };

  const removeVariable = (index: number) => {
    onConfigChange(
      'inputVariables',
      variables.filter(
        (_, currentIndex) => currentIndex !== index,
      ),
    );
  };

  return (
    <PanelSection
      title="输入字段"
      operation={
        <AddButton
          iconOnly
          title="添加输入变量"
          onClick={addVariable}
        />
      }
    >
      <div className="mb-3 text-center text-[12px] leading-5 text-[#667085]">
        设置的输入可在工作流程中使用
      </div>

      <div className="space-y-2">
        {variables.map((variable, index) => (
          <div
            key={`${variable.name}-${index}`}
            className={[
              'group overflow-hidden rounded-lg',
              'border border-[#e4e7ec] bg-white',
              'shadow-[0_1px_2px_rgba(16,24,40,0.04)]',
              'transition-[border-color,box-shadow] duration-150',
              'hover:border-[#d0d5dd]',
              'hover:shadow-[0_2px_5px_rgba(16,24,40,0.06)]',
            ].join(' ')}
          >
            <div
              className={[
                'grid min-h-[42px]',
                'grid-cols-[24px_minmax(0,1fr)_86px_auto_28px]',
                'items-center gap-1.5 px-2',
              ].join(' ')}
            >
              <span
                className={[
                  'flex h-6 w-6 shrink-0 items-center justify-center',
                  'rounded-md bg-[#eef4ff] text-[#155eef]',
                ].join(' ')}
              >
                <Braces size={13} strokeWidth={2} />
              </span>

              <Input
                bordered={false}
                value={variable.name}
                placeholder="变量名称"
                className={[
                  '!h-8 !px-1',
                  '!text-[13px] !font-medium !text-[#344054]',
                  '[&_.ant-input]:!text-[13px]',
                ].join(' ')}
                onChange={(event) =>
                  updateVariable(index, {
                    name: event.target.value,
                  })
                }
              />

              <Select
                bordered={false}
                value={variable.type}
                options={variableTypeOptions}
                popupMatchSelectWidth={120}
                className={[
                  'w-full',
                  '[&_.ant-select-selector]:!h-8',
                  '[&_.ant-select-selector]:!px-1.5',
                  '[&_.ant-select-selection-item]:!text-[12px]',
                  '[&_.ant-select-selection-item]:!text-[#667085]',
                ].join(' ')}
                onChange={(value) =>
                  updateVariable(index, {
                    type: value,
                  })
                }
              />

              <Tooltip
                title={variable.required ? '必填参数' : '非必填参数'}
              >
                <div className="flex items-center px-1">
                  <Switch
                    size="small"
                    checked={variable.required}
                    onChange={(checked) =>
                      updateVariable(index, {
                        required: checked,
                      })
                    }
                  />
                </div>
              </Tooltip>

              <RowDeleteButton
                onClick={() => removeVariable(index)}
              />
            </div>

            <div
              className={[
                'flex min-h-[36px] items-center',
                'border-t border-[#f2f4f7]',
                'bg-[#fcfcfd] px-2',
              ].join(' ')}
            >
              <Input
                bordered={false}
                value={variable.description}
                placeholder="添加变量说明，可选"
                className={[
                  '!h-8 !px-1',
                  '!text-[12px] !text-[#667085]',
                  '[&_.ant-input::placeholder]:!text-[#b0b7c3]',
                ].join(' ')}
                onChange={(event) =>
                  updateVariable(index, {
                    description: event.target.value,
                  })
                }
              />
            </div>
          </div>
        ))}

        {variables.length === 0 && (
          <button
            type="button"
            onClick={addVariable}
            className={[
              'flex h-[72px] w-full flex-col',
              'items-center justify-center',
              'rounded-lg border border-dashed border-[#d0d5dd]',
              'bg-[#fcfcfd] text-[#98a2b3]',
              'transition-colors duration-150',
              'hover:border-[#84adff]',
              'hover:bg-[#f8faff]',
              'hover:text-[#155eef]',
            ].join(' ')}
          >
            <Braces size={17} strokeWidth={1.8} />

            <span className="mt-1.5 text-[12px]">
              添加输入变量
            </span>
          </button>
        )}
      </div>
    </PanelSection>
  );
};

const normalizeVariables = (
  value: unknown,
): InputVariable[] => {
  if (!Array.isArray(value)) {
    return [];
  }

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
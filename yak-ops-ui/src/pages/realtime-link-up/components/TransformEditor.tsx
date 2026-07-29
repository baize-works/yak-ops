import { Braces, KeyRound, Plus, Sigma, TableProperties, Trash2 } from 'lucide-react';
import { Button, Checkbox, Collapse, Empty, Input, Select, Tag } from 'antd';
import { useMemo, type ReactNode } from 'react';
import { createDefaultUdf, transformFunctionGroups } from '../data';
import type {
  ColumnMapping,
  TableOptionEntry,
  TransformRule,
  UdfDefinition,
  UdfOptionEntry,
} from '../types';

const { TextArea } = Input;
const createId = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const Section = ({
  icon,
  title,
  description,
  extra,
  children,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  extra?: ReactNode;
  children: ReactNode;
}) => (
  <section className="overflow-hidden rounded-[10px] border border-black/[0.07] bg-white">
    <div className="flex items-start justify-between gap-4 border-b border-black/[0.055] px-5 py-4">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-[8px] bg-[#f1f3f6] text-[#424754]">
          {icon}
        </span>
        <div>
          <div className="text-[13px] font-semibold text-[#161823]">{title}</div>
          <div className="mt-1 text-[11px] leading-5 text-[rgba(22,24,35,0.46)]">
            {description}
          </div>
        </div>
      </div>
      {extra}
    </div>
    {children}
  </section>
);

const functionOptions = transformFunctionGroups.map((group) => ({
  label: group.label,
  options: group.options,
}));

const FunctionSelect = ({
  field,
  onSelect,
}: {
  field: string;
  onSelect: (expression: string) => void;
}) => (
  <Select
    value={undefined}
    placeholder="插入函数"
    options={functionOptions}
    onChange={(value) =>
      onSelect(String(value).replaceAll('${field}', field || 'field_name'))
    }
    popupMatchSelectWidth={320}
    className="w-[118px] [&_.ant-select-selector]:!h-8 [&_.ant-select-selector]:!rounded-[7px] [&_.ant-select-selection-placeholder]:!text-[10px] [&_.ant-select-selection-placeholder]:!leading-[30px]"
  />
);

export const TransformRuleEditor = ({
  value,
  onChange,
}: {
  value: TransformRule;
  onChange: (value: TransformRule) => void;
  compact?: boolean;
}) => {
  const outputFields = useMemo(
    () =>
      value.columns
        .filter((column) => column.selected && column.targetName.trim())
        .map((column) => column.targetName.trim()),
    [value.columns],
  );

  const updateColumn = (id: string, values: Partial<ColumnMapping>) =>
    onChange({
      ...value,
      columns: value.columns.map((column) =>
        column.id === id ? { ...column, ...values } : column,
      ),
    });

  const removeColumn = (id: string) =>
    onChange({ ...value, columns: value.columns.filter((column) => column.id !== id) });

  const addComputedColumn = () =>
    onChange({
      ...value,
      columns: [
        ...value.columns,
        {
          id: createId('computed'),
          sourceName: '',
          sourceType: 'COMPUTED',
          selected: true,
          targetName: `computed_field_${value.columns.length + 1}`,
          expression: "CASE WHEN status = 'PAID' THEN 1 ELSE 0 END",
          computed: true,
        },
      ],
    });

  const updateTableOption = (id: string, values: Partial<TableOptionEntry>) =>
    onChange({
      ...value,
      tableOptions: value.tableOptions.map((option) =>
        option.id === id ? { ...option, ...values } : option,
      ),
    });

  return (
    <div className="space-y-4">
      <Section
        icon={<TableProperties size={17} strokeWidth={1.8} />}
        title="字段投影"
        description="选择保留字段、删除字段、重命名目标字段，并使用表达式添加计算字段。"
        extra={
          <Button
            icon={<Plus size={14} />}
            onClick={addComputedColumn}
            className="!h-8 !rounded-[7px] !border-black/[0.08] !text-[11px]"
          >
            计算字段
          </Button>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse">
            <thead>
              <tr className="border-b border-black/[0.055] bg-[#fafafa] text-left text-[10px] font-semibold text-[rgba(22,24,35,0.52)]">
                <th className="w-[58px] px-4 py-3">保留</th>
                <th className="w-[155px] px-3 py-3">来源字段</th>
                <th className="w-[118px] px-3 py-3">类型</th>
                <th className="w-[180px] px-3 py-3">目标字段名</th>
                <th className="min-w-[320px] px-3 py-3">表达式</th>
                <th className="w-[55px] px-3 py-3">操作</th>
              </tr>
            </thead>
            <tbody>
              {value.columns.map((column) => (
                <tr key={column.id} className="border-b border-black/[0.045] last:border-b-0">
                  <td className="px-4 py-2.5">
                    <Checkbox
                      checked={column.selected}
                      onChange={(event) =>
                        updateColumn(column.id, { selected: event.target.checked })
                      }
                    />
                  </td>
                  <td className="px-3 py-2.5 font-mono text-[11px] text-[#252832]">
                    <div className="flex items-center gap-2">
                      {column.sourceName || '—'}
                      {column.computed && (
                        <Tag className="!m-0 !rounded-full !border-[#d9d6fe] !bg-[#f4f3ff] !px-2 !text-[9px] !text-[#6938ef]">
                          计算
                        </Tag>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2.5 font-mono text-[10px] text-[rgba(22,24,35,0.42)]">
                    {column.sourceType}
                  </td>
                  <td className="px-3 py-2.5">
                    <Input
                      value={column.targetName}
                      onChange={(event) =>
                        updateColumn(column.id, { targetName: event.target.value })
                      }
                      className="!h-8 !rounded-[6px] !border-black/[0.075] !font-mono !text-[10px]"
                    />
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex gap-2">
                      <Input
                        value={column.expression}
                        onChange={(event) =>
                          updateColumn(column.id, { expression: event.target.value })
                        }
                        className="!h-8 min-w-0 flex-1 !rounded-[6px] !border-black/[0.075] !font-mono !text-[10px]"
                      />
                      <FunctionSelect
                        field={column.sourceName || outputFields[0] || 'field_name'}
                        onSelect={(expression) => updateColumn(column.id, { expression })}
                      />
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <button
                      type="button"
                      onClick={() => removeColumn(column.id)}
                      className="flex h-7 w-7 items-center justify-center rounded-[6px] border-0 bg-transparent text-[rgba(22,24,35,0.35)] hover:bg-[#fff1f2] hover:text-[#d92d20]"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section
        icon={<Braces size={17} strokeWidth={1.8} />}
        title="行过滤"
        description="使用类似 SQL WHERE 的表达式过滤变更事件，支持内置函数和 UDF。"
        extra={
          <FunctionSelect
            field={outputFields[0] || 'field_name'}
            onSelect={(expression) =>
              onChange({
                ...value,
                filter: value.filter ? `${value.filter} AND ${expression}` : expression,
              })
            }
          />
        }
      >
        <div className="p-5">
          <TextArea
            value={value.filter}
            onChange={(event) => onChange({ ...value, filter: event.target.value })}
            placeholder="status = 'PAID' AND amount > 0"
            autoSize={{ minRows: 4, maxRows: 8 }}
            className="!rounded-[8px] !border-black/[0.075] !font-mono !text-[11px] !leading-6"
          />
        </div>
      </Section>

      <Section
        icon={<KeyRound size={17} strokeWidth={1.8} />}
        title="主键与分区键"
        description="重新指定下游表的主键和分区键，字段来自最终投影结果。"
      >
        <div className="grid grid-cols-2 gap-5 p-5 max-lg:grid-cols-1">
          <label>
            <span className="mb-2 block text-[11px] font-semibold text-[#343741]">目标表主键</span>
            <Select
              mode="multiple"
              value={value.primaryKeys}
              options={outputFields.map((field) => ({ label: field, value: field }))}
              onChange={(primaryKeys) => onChange({ ...value, primaryKeys })}
              className="w-full [&_.ant-select-selector]:!min-h-10 [&_.ant-select-selector]:!rounded-[7px] [&_.ant-select-selector]:!border-black/[0.075]"
            />
          </label>
          <label>
            <span className="mb-2 block text-[11px] font-semibold text-[#343741]">目标表分区键</span>
            <Select
              mode="multiple"
              allowClear
              value={value.partitionKeys}
              options={outputFields.map((field) => ({ label: field, value: field }))}
              onChange={(partitionKeys) => onChange({ ...value, partitionKeys })}
              className="w-full [&_.ant-select-selector]:!min-h-10 [&_.ant-select-selector]:!rounded-[7px] [&_.ant-select-selector]:!border-black/[0.075]"
            />
          </label>
        </div>
      </Section>

      <Section
        icon={<Sigma size={17} strokeWidth={1.8} />}
        title="下游建表参数"
        description="配置自动创建目标表时透传的 table-options。"
        extra={
          <Button
            icon={<Plus size={14} />}
            onClick={() =>
              onChange({
                ...value,
                tableOptions: [
                  ...value.tableOptions,
                  { id: createId('table-option'), key: '', value: '' },
                ],
              })
            }
            className="!h-8 !rounded-[7px] !border-black/[0.08] !text-[11px]"
          >
            新增参数
          </Button>
        }
      >
        <div className="p-5">
          <div className="mb-4 flex items-center gap-3">
            <span className="text-[11px] font-semibold text-[#343741]">参数分隔符</span>
            <Input
              maxLength={1}
              value={value.tableOptionsDelimiter}
              onChange={(event) =>
                onChange({ ...value, tableOptionsDelimiter: event.target.value || ',' })
              }
              className="!h-8 !w-20 !rounded-[6px] !border-black/[0.075] !text-center !font-mono !text-[11px]"
            />
          </div>
          {value.tableOptions.length ? (
            <div className="space-y-2">
              {value.tableOptions.map((option) => (
                <div key={option.id} className="flex items-center gap-2">
                  <Input
                    value={option.key}
                    onChange={(event) =>
                      updateTableOption(option.id, { key: event.target.value })
                    }
                    placeholder="参数名"
                    className="!h-9 !w-[280px] !rounded-[7px] !border-black/[0.075] !font-mono !text-[10px]"
                  />
                  <Input
                    value={option.value}
                    onChange={(event) =>
                      updateTableOption(option.id, { value: event.target.value })
                    }
                    placeholder="参数值"
                    className="!h-9 min-w-0 flex-1 !rounded-[7px] !border-black/[0.075] !font-mono !text-[10px]"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      onChange({
                        ...value,
                        tableOptions: value.tableOptions.filter(
                          (item) => item.id !== option.id,
                        ),
                      })
                    }
                    className="flex h-8 w-8 items-center justify-center border-0 bg-transparent text-[rgba(22,24,35,0.35)] hover:text-[#d92d20]"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂未配置建表参数" />
          )}
        </div>
      </Section>
    </div>
  );
};

export const UdfEditor = ({
  value,
  onChange,
}: {
  value: UdfDefinition[];
  onChange: (value: UdfDefinition[]) => void;
}) => {
  const updateUdf = (id: string, values: Partial<UdfDefinition>) =>
    onChange(value.map((udf) => (udf.id === id ? { ...udf, ...values } : udf)));

  const updateOption = (
    udfId: string,
    optionId: string,
    values: Partial<UdfOptionEntry>,
  ) =>
    onChange(
      value.map((udf) =>
        udf.id === udfId
          ? {
              ...udf,
              options: udf.options.map((option) =>
                option.id === optionId ? { ...option, ...values } : option,
              ),
            }
          : udf,
      ),
    );

  return (
    <Section
      icon={<Sigma size={17} strokeWidth={1.8} />}
      title="用户自定义函数（UDF）"
      description="注册函数名称、实现类及初始化参数。对应 JAR 由后端提交任务时加载。"
      extra={
        <Button
          icon={<Plus size={14} />}
          onClick={() => onChange([...value, createDefaultUdf()])}
          className="!h-8 !rounded-[7px] !border-black/[0.08] !text-[11px]"
        >
          新增 UDF
        </Button>
      }
    >
      <div className="p-5">
        {value.length ? (
          <Collapse
            bordered={false}
            className="!bg-transparent [&_.ant-collapse-item]:!mb-3 [&_.ant-collapse-item]:!rounded-[8px] [&_.ant-collapse-item]:!border [&_.ant-collapse-item]:!border-black/[0.07] [&_.ant-collapse-header]:!bg-[#fafafa]"
            items={value.map((udf, index) => ({
              key: udf.id,
              label: udf.name || `未命名 UDF ${index + 1}`,
              extra: (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onChange(value.filter((item) => item.id !== udf.id));
                  }}
                  className="flex h-7 w-7 items-center justify-center border-0 bg-transparent text-[rgba(22,24,35,0.35)] hover:text-[#d92d20]"
                >
                  <Trash2 size={14} />
                </button>
              ),
              children: (
                <div className="space-y-4 pt-1">
                  <div className="grid grid-cols-2 gap-4 max-lg:grid-cols-1">
                    <Input
                      value={udf.name}
                      onChange={(event) => updateUdf(udf.id, { name: event.target.value })}
                      placeholder="函数名，例如 format_order"
                      className="!h-9 !rounded-[7px] !border-black/[0.075] !font-mono !text-[10px]"
                    />
                    <Input
                      value={udf.classpath}
                      onChange={(event) =>
                        updateUdf(udf.id, { classpath: event.target.value })
                      }
                      placeholder="com.example.cdc.FormatOrderFunction"
                      className="!h-9 !rounded-[7px] !border-black/[0.075] !font-mono !text-[10px]"
                    />
                  </div>
                  <div className="space-y-2">
                    {udf.options.map((option) => (
                      <div key={option.id} className="flex items-center gap-2">
                        <Input
                          value={option.key}
                          onChange={(event) =>
                            updateOption(udf.id, option.id, { key: event.target.value })
                          }
                          placeholder="参数名"
                          className="!h-8 !w-[240px] !rounded-[6px] !border-black/[0.075] !font-mono !text-[10px]"
                        />
                        <Input
                          value={option.value}
                          onChange={(event) =>
                            updateOption(udf.id, option.id, { value: event.target.value })
                          }
                          placeholder="参数值"
                          className="!h-8 min-w-0 flex-1 !rounded-[6px] !border-black/[0.075] !font-mono !text-[10px]"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            updateUdf(udf.id, {
                              options: udf.options.filter((item) => item.id !== option.id),
                            })
                          }
                          className="flex h-7 w-7 items-center justify-center border-0 bg-transparent text-[rgba(22,24,35,0.35)] hover:text-[#d92d20]"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() =>
                        updateUdf(udf.id, {
                          options: [
                            ...udf.options,
                            { id: createId('udf-option'), key: '', value: '' },
                          ],
                        })
                      }
                      className="border-0 bg-transparent text-[10px] font-semibold text-[#315efb]"
                    >
                      + 添加初始化参数
                    </button>
                  </div>
                </div>
              ),
            }))}
          />
        ) : (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="当前任务未注册 UDF" />
        )}
      </div>
    </Section>
  );
};

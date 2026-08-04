import { Input, InputNumber, Select, Switch } from 'antd';
import type { ChangeEvent } from 'react';
import type {
  FormFieldSchema,
  ResourceRendererProps,
  WorkbenchFormSchema,
} from '../core/types';

interface SchemaDrivenFormProps {
  schema: WorkbenchFormSchema;
  value: Record<string, unknown>;
  onChange: (value: Record<string, unknown>) => void;
  compact?: boolean;
}

const renderField = (
  field: FormFieldSchema,
  value: unknown,
  onChange: (value: unknown) => void,
) => {
  switch (field.type) {
    case 'textarea':
      return (
        <Input.TextArea
          variant="filled"
          rows={field.rows ?? 5}
          value={typeof value === 'string' ? value : ''}
          placeholder={field.placeholder}
          onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
            onChange(event.target.value)
          }
        />
      );
    case 'number':
      return (
        <InputNumber
          variant="filled"
          className="w-full"
          min={field.min}
          max={field.max}
          step={field.step}
          value={typeof value === 'number' ? value : undefined}
          placeholder={field.placeholder}
          onChange={(nextValue: number | null) => onChange(nextValue ?? 0)}
        />
      );
    case 'select':
      return (
        <Select
          variant="filled"
          className="w-full"
          value={value as string | number | undefined}
          placeholder={field.placeholder}
          options={field.options}
          onChange={onChange}
        />
      );
    case 'switch':
      return (
        <div className="flex h-8 items-center">
          <Switch checked={Boolean(value)} onChange={onChange} />
        </div>
      );
    case 'text':
    default:
      return (
        <Input
          variant="filled"
          value={typeof value === 'string' ? value : ''}
          placeholder={field.placeholder}
          onChange={(event: ChangeEvent<HTMLInputElement>) =>
            onChange(event.target.value)
          }
        />
      );
  }
};

export const SchemaDrivenForm = ({
  schema,
  value,
  onChange,
  compact = false,
}: SchemaDrivenFormProps) => (
  <div
    className={[
      'grid gap-x-4 gap-y-4',
      schema.columns === 2 ? 'grid-cols-2' : 'grid-cols-1',
    ].join(' ')}
  >
    {schema.fields.map((field) => (
      <label
        key={field.key}
        className={[
          'block min-w-0',
          schema.columns === 2 && field.span === 2 ? 'col-span-2' : '',
        ].join(' ')}
      >
        <span
          className={[
            'mb-1.5 flex items-center gap-1 font-medium text-[rgba(22,24,35,0.68)]',
            compact ? 'text-[11px]' : 'text-[12px]',
          ].join(' ')}
        >
          {field.label}
          {field.required && (
            <span className="text-[var(--yak-brand-color)]">*</span>
          )}
        </span>
        {renderField(field, value[field.key], (nextValue) =>
          onChange({ ...value, [field.key]: nextValue }),
        )}
        {field.description && (
          <span className="mt-1 block text-[11px] leading-4 text-[rgba(22,24,35,0.4)]">
            {field.description}
          </span>
        )}
      </label>
    ))}
  </div>
);

const SchemaFormRenderer = ({
  document,
  plugin,
  onChange,
}: ResourceRendererProps) => {
  const schema = plugin.authoring.schema;
  const content = document.content.kind === 'form' ? document.content : undefined;

  if (!schema || !content) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-[rgba(22,24,35,0.48)]">
        当前插件没有提供可渲染的表单 Schema。
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-[#fafbfc] p-6">
      <div className="mx-auto max-w-[980px] border border-[#e5e7ea] bg-white p-6 shadow-[0_4px_18px_rgba(22,24,35,0.04)]">
        <div className="mb-6 border-b border-[#eceef0] pb-4">
          <h2 className="m-0 text-[17px] font-semibold text-[#161823]">
            {plugin.metadata.label}
          </h2>
          <p className="mb-0 mt-1 text-[12px] leading-5 text-[rgba(22,24,35,0.48)]">
            {plugin.metadata.description}
          </p>
        </div>

        <SchemaDrivenForm
          schema={schema}
          value={content.value}
          onChange={(value) =>
            onChange({
              ...document,
              content: { ...content, value },
              dirty: true,
            })
          }
        />
      </div>
    </div>
  );
};

export default SchemaFormRenderer;

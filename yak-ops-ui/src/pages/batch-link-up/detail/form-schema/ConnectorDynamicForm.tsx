import {
  Collapse,
  Input,
  InputNumber,
  Segmented,
  Select,
  Spin,
  Switch,
  Tooltip,
} from 'antd';
import { CircleHelp } from 'lucide-react';
import { useEffect, useMemo, type ChangeEvent } from 'react';

import { evaluateConnectorForm, isEmptyValue } from './ruleEngine';
import type {
  ConnectorFormField,
  ConnectorFormSchema,
  ConnectorFormValues,
} from './types';
import useRemoteOptions from './useRemoteOptions';

interface ConnectorDynamicFormProps {
  schema: ConnectorFormSchema;
  dataSourceId: string;
  values: ConnectorFormValues;
  excludeKeys?: string[];
  onChange: (key: string, value: unknown) => void;
  onValidationChange?: (errors: string[]) => void;
}

interface FieldControlProps {
  schema: ConnectorFormSchema;
  field: ConnectorFormField;
  dataSourceId: string;
  values: ConnectorFormValues;
  disabled: boolean;
  error: boolean;
  onChange: (value: unknown) => void;
}

const staticOptions = (field: ConnectorFormField) =>
  (field.allowedValues || []).map((value) => ({
    label: String(value),
    value,
  }));

function RemoteSelectControl({
  schema,
  field,
  dataSourceId,
  values,
  disabled,
  error,
  onChange,
}: FieldControlProps) {
  const remote = useRemoteOptions(schema, field, dataSourceId, values);
  const multiple =
    field.optionSource?.multiple ||
    field.widget === 'multi-table-picker' ||
    field.valueType === 'LIST';

  return (
    <Select
      showSearch
      allowClear
      variant="filled"
      mode={multiple ? 'multiple' : undefined}
      value={values[field.key] as any}
      disabled={disabled || !remote.ready}
      loading={remote.loading}
      status={error ? 'error' : undefined}
      filterOption={field.optionSource?.searchable ? false : undefined}
      onSearch={remote.onSearch}
      options={remote.options.map((option) => ({
        label: option.description
          ? `${option.label} · ${option.description}`
          : option.label,
        value: option.value as any,
      }))}
      notFoundContent={remote.loading ? <Spin size="small" /> : undefined}
      placeholder={
        !dataSourceId
          ? '请先选择数据源'
          : !remote.ready
            ? '请先完成依赖配置'
            : field.placeholder || `请选择${field.label}`
      }
      className="w-full"
      onChange={onChange}
    />
  );
}

function JsonControl({
  field,
  values,
  disabled,
  error,
  onChange,
}: FieldControlProps) {
  const value = values[field.key];
  const text = typeof value === 'string'
    ? value
    : value === undefined
      ? ''
      : JSON.stringify(value, null, 2);

  return (
    <Input.TextArea
      rows={5}
      variant="filled"
      className="font-mono"
      value={text}
      disabled={disabled}
      status={error ? 'error' : undefined}
      placeholder={field.placeholder || '请输入 JSON'}
      onChange={(event: ChangeEvent<HTMLTextAreaElement>) => {
        const next = event.target.value;
        if (!next.trim()) {
          onChange(undefined);
          return;
        }
        try {
          onChange(JSON.parse(next));
        } catch {
          onChange(next);
        }
      }}
    />
  );
}

function FieldControl(props: FieldControlProps) {
  const { field, values, disabled, error, onChange } = props;
  const value = values[field.key];

  if (field.optionSource) return <RemoteSelectControl {...props} />;

  if (field.widget === 'switch' || field.valueType === 'BOOLEAN') {
    return <Switch checked={Boolean(value)} disabled={disabled} onChange={onChange} />;
  }

  if (field.widget === 'number' || ['INTEGER', 'LONG', 'FLOAT', 'DOUBLE', 'DECIMAL'].includes(field.valueType)) {
    return (
      <InputNumber
        variant="filled"
        value={value as number | undefined}
        disabled={disabled}
        status={error ? 'error' : undefined}
        className="!w-full"
        placeholder={field.placeholder}
        onChange={onChange}
      />
    );
  }

  if (field.widget === 'segmented') {
    return (
      <Segmented
        block
        value={value as any}
        disabled={disabled}
        options={staticOptions(field) as any}
        onChange={onChange}
      />
    );
  }

  if (field.widget === 'select' || field.valueType === 'ENUM') {
    return (
      <Select
        allowClear
        showSearch
        variant="filled"
        value={value as any}
        disabled={disabled}
        status={error ? 'error' : undefined}
        options={staticOptions(field) as any}
        className="w-full"
        placeholder={field.placeholder || `请选择${field.label}`}
        onChange={onChange}
      />
    );
  }

  if (['key-value', 'json-editor'].includes(field.widget) || ['MAP', 'OBJECT'].includes(field.valueType)) {
    return <JsonControl {...props} />;
  }

  if (field.widget === 'list-editor' || field.valueType === 'LIST') {
    return (
      <Select
        mode="tags"
        variant="filled"
        value={Array.isArray(value) ? value : []}
        disabled={disabled}
        status={error ? 'error' : undefined}
        tokenSeparators={[',', '\n']}
        className="w-full"
        placeholder={field.placeholder || '输入后按回车添加'}
        onChange={onChange}
      />
    );
  }

  if (['sql-editor', 'sql-condition'].includes(field.widget)) {
    return (
      <Input.TextArea
        rows={field.widget === 'sql-editor' ? 7 : 3}
        variant="filled"
        value={(value as string) || ''}
        disabled={disabled}
        status={error ? 'error' : undefined}
        className="font-mono"
        placeholder={field.placeholder || `请输入${field.label}`}
        onChange={(event: ChangeEvent<HTMLTextAreaElement>) => onChange(event.target.value)}
      />
    );
  }

  return (
    <Input
      type={field.widget === 'password' ? 'password' : 'text'}
      variant="filled"
      value={(value as string) || ''}
      disabled={disabled}
      status={error ? 'error' : undefined}
      placeholder={field.placeholder || `请输入${field.label}`}
      onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(event.target.value)}
    />
  );
}

export default function ConnectorDynamicForm({
  schema,
  dataSourceId,
  values,
  excludeKeys = [],
  onChange,
  onValidationChange,
}: ConnectorDynamicFormProps) {
  const effectiveValues = useMemo(() => {
    const defaults = Object.fromEntries(
      schema.fields
        .filter((field) => field.defaultValue !== undefined && field.defaultValue !== null)
        .map((field) => [field.key, field.defaultValue]),
    );
    return { ...defaults, ...values };
  }, [schema.fields, values]);
  const evaluation = useMemo(
    () => evaluateConnectorForm(schema, effectiveValues),
    [effectiveValues, schema],
  );
  const excluded = useMemo(() => new Set(excludeKeys), [excludeKeys]);

  const validationErrors = useMemo(
    () => [
      ...evaluation.formErrors,
      ...Object.values(evaluation.fieldStates).flatMap((state) => state.errors),
    ],
    [evaluation],
  );

  useEffect(() => {
    onValidationChange?.(validationErrors);
  }, [onValidationChange, validationErrors]);

  useEffect(() => {
    for (const field of schema.fields) {
      const state = evaluation.fieldStates[field.key];
      if (
        field.clearWhenHidden &&
        state &&
        !state.visible &&
        !isEmptyValue(values[field.key])
      ) {
        onChange(field.key, undefined);
        break;
      }
    }
  }, [evaluation.fieldStates, onChange, schema.fields, values]);

  const items = schema.groups
    .filter((group) => !group.hidden)
    .map((group) => {
      const fields = schema.fields.filter((field) => {
        const state = evaluation.fieldStates[field.key];
        return (
          field.groupId === group.id &&
          !field.hidden &&
          !excluded.has(field.key) &&
          state?.visible
        );
      });
      if (fields.length === 0) return null;

      return {
        key: group.id,
        label: (
          <span className="text-[13px] font-semibold text-[#344054]">
            {group.title}
          </span>
        ),
        children: (
          <div className="grid grid-cols-2 gap-x-5 gap-y-4 max-md:grid-cols-1">
            {fields.map((field) => {
              const state = evaluation.fieldStates[field.key];
              return (
                <div
                  key={field.key}
                  className={['sql-editor', 'sql-condition', 'json-editor', 'key-value'].includes(field.widget)
                    ? 'col-span-2 max-md:col-span-1'
                    : undefined}
                >
                  <div className="mb-2 flex items-center gap-1 text-[12px] font-medium text-[#475467]">
                    <span>{field.label}</span>
                    {state.required ? (
                      <span className="text-[var(--yak-brand-color)]">*</span>
                    ) : null}
                    {field.help || field.description ? (
                      <Tooltip title={field.help || field.description}>
                        <CircleHelp size={13} className="text-[#98a2b3]" />
                      </Tooltip>
                    ) : null}
                  </div>

                  <FieldControl
                    schema={schema}
                    field={field}
                    dataSourceId={dataSourceId}
                    values={effectiveValues}
                    disabled={state.disabled}
                    error={state.errors.length > 0}
                    onChange={(value) => onChange(field.key, value)}
                  />

                  {state.errors.length > 0 ? (
                    <div className="mt-1 text-[12px] text-[#d92d20]">
                      {state.errors[0]}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        ),
      };
    })
    .filter(Boolean) as any[];

  return (
    <div>
      {evaluation.formErrors.length > 0 ? (
        <div className="mb-3 rounded-lg bg-[#fff1f0] px-3 py-2 text-[12px] text-[#d92d20]">
          {evaluation.formErrors[0]}
        </div>
      ) : null}
      <Collapse
        bordered={false}
        ghost
        defaultActiveKey={schema.groups.filter((group) => !group.collapsed).map((group) => group.id)}
        items={items}
        className="[&_.ant-collapse-content-box]:!px-0 [&_.ant-collapse-header]:!px-0"
      />
    </div>
  );
}

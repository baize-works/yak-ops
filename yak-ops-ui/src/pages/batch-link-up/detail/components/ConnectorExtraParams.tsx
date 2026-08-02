import {
  Button,
  Input,
  InputNumber,
  Select,
  Spin,
  Tooltip,
} from 'antd';
import { Plus, Trash2 } from 'lucide-react';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import type {
  ConnectorFormField,
  ConnectorFormSchema,
  ConnectorFormValues,
  ConnectorRole,
} from '../form-schema/types';
import useConnectorFormSchema from '../form-schema/useConnectorFormSchema';
import useRemoteOptions from '../form-schema/useRemoteOptions';
import {
  applySchemaValue,
  removeSchemaValue,
  toSchemaValues,
} from '../form-schema/valueAdapter';

interface ConnectorExtraParamsProps {
  connectorId: string;
  role: ConnectorRole;
  dataSourceId: string;
  config: Record<string, any>;
  excludeKeys?: string[];
  onChange: (patch: Record<string, any>) => void;
}

interface ExtraParamValueControlProps {
  schema: ConnectorFormSchema;
  field: ConnectorFormField;
  dataSourceId: string;
  values: ConnectorFormValues;
  value: unknown;
  onChange: (value: unknown) => void;
}

const hasValue = (value: unknown) =>
  value !== undefined &&
  value !== null &&
  (typeof value !== 'string' || value.trim().length > 0) &&
  (!Array.isArray(value) || value.length > 0);

const fallbackField = (
  key: string,
  order: number,
): ConnectorFormField => ({
  key,
  label: key,
  valueType: 'STRING',
  allowedValues: [],
  fallbackKeys: [],
  required: false,
  sensitive: false,
  groupId: '__configured__',
  order,
  widget: 'input',
  hidden: false,
  readOnly: false,
  dependsOn: [],
  clearWhenHidden: false,
});

const initialValue = (field: ConnectorFormField) =>
  field.defaultValue !== undefined && field.defaultValue !== null
    ? field.defaultValue
    : undefined;

function ExtraParamValueControl({
  schema,
  field,
  dataSourceId,
  values,
  value,
  onChange,
}: ExtraParamValueControlProps) {
  const remote = useRemoteOptions(
    schema,
    field,
    dataSourceId,
    values,
  );

  if (field.optionSource) {
    const multiple =
      field.optionSource.multiple || field.valueType === 'LIST';

    return (
      <Select
        allowClear
        showSearch
        variant="filled"
        mode={multiple ? 'multiple' : undefined}
        value={value as any}
        loading={remote.loading}
        disabled={!remote.ready}
        filterOption={
          field.optionSource.searchable ? false : undefined
        }
        options={remote.options.map((option) => ({
          label: option.description
            ? `${option.label} · ${option.description}`
            : option.label,
          value: option.value as any,
        }))}
        placeholder={
          !dataSourceId
            ? '请先选择数据源'
            : !remote.ready
              ? '请先完成依赖配置'
              : field.placeholder || '请选择参数值'
        }
        className="w-full"
        onSearch={remote.onSearch}
        onChange={onChange}
      />
    );
  }

  if (field.allowedValues?.length) {
    return (
      <Select
        allowClear
        showSearch
        variant="filled"
        mode={field.valueType === 'LIST' ? 'multiple' : undefined}
        value={value as any}
        options={field.allowedValues.map((item) => ({
          label: String(item),
          value: item as any,
        }))}
        placeholder={field.placeholder || '请选择参数值'}
        className="w-full"
        onChange={onChange}
      />
    );
  }

  if (field.valueType === 'BOOLEAN' || field.widget === 'switch') {
    return (
      <Select
        allowClear
        variant="filled"
        value={value as boolean | undefined}
        options={[
          { label: 'true', value: true },
          { label: 'false', value: false },
        ]}
        placeholder="请选择参数值"
        className="w-full"
        onChange={onChange}
      />
    );
  }

  if (
    field.widget === 'number' ||
    [
      'INTEGER',
      'LONG',
      'FLOAT',
      'DOUBLE',
      'DECIMAL',
    ].includes(field.valueType)
  ) {
    const numberValue =
      typeof value === 'number'
        ? value
        : value === undefined || value === null || value === ''
          ? undefined
          : Number(value);

    return (
      <InputNumber
        variant="filled"
        value={Number.isNaN(numberValue) ? undefined : numberValue}
        placeholder={field.placeholder || '请输入参数值'}
        className="!w-full"
        onChange={onChange}
      />
    );
  }

  if (field.valueType === 'LIST' || field.widget === 'list-editor') {
    return (
      <Select
        mode="tags"
        variant="filled"
        value={Array.isArray(value) ? value : []}
        tokenSeparators={[',']}
        placeholder={field.placeholder || '输入后按回车添加'}
        className="w-full"
        onChange={onChange}
      />
    );
  }

  if (
    ['MAP', 'OBJECT'].includes(field.valueType) ||
    ['key-value', 'json-editor'].includes(field.widget)
  ) {
    const text =
      typeof value === 'string'
        ? value
        : value === undefined || value === null
          ? ''
          : JSON.stringify(value);

    return (
      <Input
        variant="filled"
        value={text}
        placeholder={field.placeholder || '请输入 JSON 参数值'}
        onChange={(event) => {
          const next = event.target.value;
          try {
            onChange(JSON.parse(next));
          } catch {
            onChange(next);
          }
        }}
      />
    );
  }

  const Control = field.widget === 'password'
    ? Input.Password
    : Input;

  return (
    <Control
      variant="filled"
      value={value === undefined || value === null ? '' : String(value)}
      placeholder={field.placeholder || '请输入参数值'}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

export default function ConnectorExtraParams({
  connectorId,
  role,
  dataSourceId,
  config,
  excludeKeys = [],
  onChange,
}: ConnectorExtraParamsProps) {
  const { schema, loading, error } = useConnectorFormSchema(
    connectorId,
    role,
  );
  const [draftRows, setDraftRows] = useState<string[]>([]);
  const draftIdRef = useRef(0);

  useEffect(() => {
    setDraftRows([]);
  }, [connectorId, role]);

  const excluded = useMemo(
    () => new Set(excludeKeys),
    [excludeKeys],
  );
  const connectorOptions = config.connectorOptions || {};
  const values = useMemo(
    () => toSchemaValues(config, role),
    [config, role],
  );

  const selectableFields = useMemo(
    () =>
      (schema?.fields || [])
        .filter(
          (field) =>
            !field.hidden &&
            !field.readOnly &&
            !excluded.has(field.key) &&
            field.valueSource !== 'DATASOURCE',
        )
        .sort((left, right) => left.order - right.order),
    [excluded, schema?.fields],
  );

  const fields = useMemo(() => {
    const schemaKeys = new Set(
      selectableFields.map((field) => field.key),
    );
    const unknownFields = Object.keys(connectorOptions)
      .filter(
        (key) => !excluded.has(key) && !schemaKeys.has(key),
      )
      .map((key, index) =>
        fallbackField(key, selectableFields.length + index),
      );

    return [...selectableFields, ...unknownFields];
  }, [connectorOptions, excluded, selectableFields]);

  const fieldMap = useMemo(
    () => new Map(fields.map((field) => [field.key, field])),
    [fields],
  );

  const configuredKeys = useMemo(
    () =>
      fields
        .filter(
          (field) =>
            Object.prototype.hasOwnProperty.call(
              connectorOptions,
              field.key,
            ) || hasValue(values[field.key]),
        )
        .map((field) => field.key),
    [connectorOptions, fields, values],
  );

  const configuredKeySet = useMemo(
    () => new Set(configuredKeys),
    [configuredKeys],
  );

  const optionGroups = useMemo(() => {
    if (!schema) return [];

    const groups = schema.groups
      .filter((group) => !group.hidden)
      .map((group) => ({
        label: group.title,
        options: selectableFields
          .filter((field) => field.groupId === group.id)
          .map((field) => ({
            label: `${field.label} · ${field.key}`,
            value: field.key,
          })),
      }))
      .filter((group) => group.options.length > 0);

    const knownGroupIds = new Set(
      schema.groups.map((group) => group.id),
    );
    const ungrouped = selectableFields
      .filter((field) => !knownGroupIds.has(field.groupId))
      .map((field) => ({
        label: `${field.label} · ${field.key}`,
        value: field.key,
      }));

    return ungrouped.length > 0
      ? [...groups, { label: '其他参数', options: ungrouped }]
      : groups;
  }, [schema, selectableFields]);

  const rows = [
    ...configuredKeys.map((key) => ({
      id: `configured-${key}`,
      key,
    })),
    ...draftRows.map((id) => ({ id, key: undefined })),
  ];

  const canAdd =
    Boolean(schema) &&
    selectableFields.length >
      configuredKeys.filter((key) =>
        selectableFields.some((field) => field.key === key),
      ).length +
        draftRows.length;

  const addRow = () => {
    const id = `draft-${Date.now()}-${draftIdRef.current++}`;
    setDraftRows((current) => [...current, id]);
  };

  const removeRow = (id: string, key?: string) => {
    if (!key) {
      setDraftRows((current) =>
        current.filter((item) => item !== id),
      );
      return;
    }

    onChange(removeSchemaValue(config, role, key));
  };

  const changeKey = (
    id: string,
    currentKey: string | undefined,
    nextKey: string,
  ) => {
    const field = fieldMap.get(nextKey);
    if (!field) return;

    if (!currentKey) {
      onChange(
        applySchemaValue(
          config,
          role,
          nextKey,
          initialValue(field),
        ),
      );
      setDraftRows((current) =>
        current.filter((item) => item !== id),
      );
      return;
    }

    const removedPatch = removeSchemaValue(
      config,
      role,
      currentKey,
    );
    const clearedConfig = {
      ...config,
      ...removedPatch,
    };
    const nextPatch = applySchemaValue(
      clearedConfig,
      role,
      nextKey,
      initialValue(field),
    );

    onChange({
      ...removedPatch,
      ...nextPatch,
    });
  };

  const emptyText = loading
    ? '正在加载可选参数'
    : error
      ? '暂未获取到可用参数'
      : '暂无额外参数';
  const addTooltip = loading
    ? '正在加载参数定义'
    : error || (canAdd ? '添加额外参数' : '暂无更多可添加参数');

  return (
    <div className="border-t border-[#eceef1] pt-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="text-[12px] font-medium text-[#475467]">
          额外参数
        </span>

        <Tooltip title={addTooltip}>
          <span>
            <Button
              type="text"
              size="small"
              disabled={!canAdd}
              aria-label="添加额外参数"
              icon={<Plus size={16} />}
              className="!flex !h-7 !w-7 !items-center !justify-center !rounded-md !p-0 !text-[#667085] hover:!bg-[var(--yak-brand-color-soft)] hover:!text-[var(--yak-brand-color)]"
              onClick={addRow}
            />
          </span>
        </Tooltip>
      </div>

      {rows.length === 0 ? (
        <div className="flex min-h-14 items-center justify-center rounded-lg border border-dashed border-[#e3e6eb] bg-white/70 px-3 text-[12px] text-[#98a2b3]">
          {loading ? <Spin size="small" className="mr-2" /> : null}
          {emptyText}
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((row) => {
            const field = row.key
              ? fieldMap.get(row.key)
              : undefined;
            const keyOptions = optionGroups.map((group) => ({
              ...group,
              options: group.options.map((option) => ({
                ...option,
                disabled:
                  configuredKeySet.has(option.value) &&
                  option.value !== row.key,
              })),
            }));

            return (
              <div
                key={row.id}
                className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_32px] items-center gap-2 max-sm:grid-cols-[minmax(0,1fr)_32px]"
              >
                <Select
                  showSearch
                  variant="filled"
                  value={row.key}
                  options={keyOptions}
                  optionFilterProp="label"
                  placeholder="请选择参数"
                  className="w-full max-sm:col-span-2"
                  onChange={(nextKey) =>
                    changeKey(row.id, row.key, nextKey)
                  }
                />

                <div className="min-w-0 max-sm:col-span-1">
                  {field && schema ? (
                    <ExtraParamValueControl
                      schema={schema}
                      field={field}
                      dataSourceId={dataSourceId}
                      values={values}
                      value={values[field.key]}
                      onChange={(value) =>
                        onChange(
                          applySchemaValue(
                            config,
                            role,
                            field.key,
                            value,
                          ),
                        )
                      }
                    />
                  ) : (
                    <Input
                      disabled
                      variant="filled"
                      placeholder="参数值"
                    />
                  )}
                </div>

                <Button
                  type="text"
                  aria-label="删除额外参数"
                  icon={<Trash2 size={15} />}
                  className="!flex !h-8 !w-8 !items-center !justify-center !p-0 !text-[#98a2b3] hover:!bg-[#f2f3f5] hover:!text-[#475467]"
                  onClick={() => removeRow(row.id, row.key)}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

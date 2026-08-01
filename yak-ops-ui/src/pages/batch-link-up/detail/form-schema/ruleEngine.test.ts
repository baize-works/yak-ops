import { evaluateConnectorForm } from './ruleEngine';
import type { ConnectorFormSchema } from './types';

const schema: ConnectorFormSchema = {
  connectorId: 'jdbc',
  role: 'SINK',
  stale: false,
  capabilities: [],
  warnings: [],
  rules: [],
  groups: [{ id: 'write', title: '写入', order: 1, collapsed: false, hidden: false }],
  fields: [
    {
      key: 'write_mode',
      label: '写入方式',
      valueType: 'ENUM',
      allowedValues: ['INSERT', 'UPSERT'],
      fallbackKeys: [],
      required: true,
      sensitive: false,
      groupId: 'write',
      order: 1,
      widget: 'select',
      hidden: false,
      readOnly: false,
      dependsOn: [],
      clearWhenHidden: false,
    },
    {
      key: 'primary_keys',
      label: '主键字段',
      valueType: 'LIST',
      allowedValues: [],
      fallbackKeys: [],
      required: false,
      sensitive: false,
      groupId: 'write',
      order: 2,
      widget: 'field-selector',
      hidden: false,
      readOnly: false,
      dependsOn: ['table_path'],
      clearWhenHidden: true,
    },
  ],
  interactions: [
    {
      id: 'rule-1',
      effect: 'VISIBLE',
      optionKeys: ['primary_keys'],
      condition: {
        optionKey: 'write_mode',
        operator: 'EQ',
        expectedValue: 'UPSERT',
      },
    },
    {
      id: 'rule-2',
      effect: 'REQUIRED',
      optionKeys: ['primary_keys'],
      condition: {
        optionKey: 'write_mode',
        operator: 'EQ',
        expectedValue: 'UPSERT',
      },
    },
  ],
};

test('applies conditional visibility and required state', () => {
  const insert = evaluateConnectorForm(schema, { write_mode: 'INSERT' });
  expect(insert.fieldStates.primary_keys.visible).toBe(false);
  expect(insert.valid).toBe(true);

  const upsert = evaluateConnectorForm(schema, { write_mode: 'UPSERT' });
  expect(upsert.fieldStates.primary_keys.visible).toBe(true);
  expect(upsert.fieldStates.primary_keys.required).toBe(true);
  expect(upsert.valid).toBe(false);
});

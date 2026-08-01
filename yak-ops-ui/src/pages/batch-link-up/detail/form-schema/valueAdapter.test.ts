import {
  applySchemaValue,
  connectorIdForDataSourceType,
  toSchemaValues,
} from './valueAdapter';

test('maps relational datasource types to jdbc schema', () => {
  expect(connectorIdForDataSourceType('MYSQL')).toBe('jdbc');
  expect(connectorIdForDataSourceType('DORIS')).toBe('jdbc');
  expect(connectorIdForDataSourceType('HTTP')).toBe('http');
});

test('keeps native connector options and legacy fields aligned', () => {
  const patch = applySchemaValue(
    { writeMode: 'append', connectorOptions: {} },
    'SINK',
    'primary_keys',
    ['id', 'tenant_id'],
  );
  expect(patch.primaryKey).toBe('id,tenant_id');
  expect(patch.connectorOptions.primary_keys).toEqual(['id', 'tenant_id']);

  const values = toSchemaValues(
    { table: 'orders', sql: '', fetchSize: 2000 },
    'SOURCE',
  );
  expect(values.table_path).toBe('orders');
  expect(values.fetch_size).toBe(2000);
});

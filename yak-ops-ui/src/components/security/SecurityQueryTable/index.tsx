import { ProTable, type ProTableProps } from '@ant-design/pro-components';

/** Shared defaults for searchable Security administration tables. */
export default function SecurityQueryTable<T extends object, U extends object = Record<string, unknown>>(
  props: ProTableProps<T, U>,
) {
  return (
    <ProTable<T, U>
      rowKey="id"
      search={{ labelWidth: 'auto' }}
      pagination={{ defaultPageSize: 10, showSizeChanger: true }}
      {...props}
    />
  );
}

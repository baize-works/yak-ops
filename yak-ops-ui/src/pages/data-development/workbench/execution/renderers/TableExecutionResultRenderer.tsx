import { Table, Tag } from 'antd';
import type { TableColumnsType } from 'antd';
import type {
  ExecutionResultRendererProps,
  TableExecutionResult,
} from '../types';

const TableExecutionResultRenderer = ({
  payload,
}: ExecutionResultRendererProps) => {
  if (payload.kind !== 'table') return null;

  const tablePayload: TableExecutionResult = payload;
  const columns: TableColumnsType<Record<string, unknown>> =
    tablePayload.columns.map((column) => ({
      title: (
        <span className="flex items-center gap-1.5">
          <span>{column.title}</span>
          <Tag
            bordered={false}
            className="!m-0 !bg-[#f2f3f5] !px-1.5 !text-[9px] !font-normal !text-[rgba(22,24,35,0.42)]"
          >
            {column.dataType}
          </Tag>
        </span>
      ),
      dataIndex: column.key,
      key: column.key,
      ellipsis: true,
      width: 180,
      render: (value: unknown) => (
        <span className="font-mono text-[12px] text-[rgba(22,24,35,0.76)]">
          {value === null || value === undefined ? 'NULL' : String(value)}
        </span>
      ),
    }));

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="flex h-9 shrink-0 items-center justify-between border-b border-[#eceef0] px-3 text-[11px] text-[rgba(22,24,35,0.46)]">
        <span>查询结果</span>
        <span>
          共 {tablePayload.rows.length} 行
          {tablePayload.affectedRows !== undefined
            ? ` · 影响 ${tablePayload.affectedRows} 行`
            : ''}
        </span>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        <Table<Record<string, unknown>>
          rowKey={(_, index) => String(index)}
          size="small"
          pagination={false}
          columns={columns}
          dataSource={tablePayload.rows}
          scroll={{ x: 'max-content' }}
          className="[&_.ant-table-thead>tr>th]:!bg-[#fafbfc] [&_.ant-table-thead>tr>th]:!text-[11px] [&_.ant-table-tbody>tr>td]:!py-2"
        />
      </div>
    </div>
  );
};

export default TableExecutionResultRenderer;

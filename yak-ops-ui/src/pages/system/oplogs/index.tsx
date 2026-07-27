import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { Button, Drawer, Empty, Typography } from 'antd';
import dayjs from 'dayjs';
import { useRef, useState } from 'react';
import { SecurityQueryTable } from '@/components/security';
import {
  formatJsonText,
  getOperationLog,
  type OperationLog,
  type OperationLogDetail,
  pageOperationLogs,
} from '@/services/security/operationLogs';

export default function OperationLogsPage() {
  const actionRef = useRef<ActionType>();
  const [detail, setDetail] = useState<OperationLogDetail>();
  const columns: ProColumns<OperationLog>[] = [
    { title: 'ID', dataIndex: 'id', search: false, copyable: true },
    { title: '操作类型', dataIndex: 'operationType' },
    { title: '操作人', dataIndex: 'operatorName' },
    {
      title: '目标',
      dataIndex: 'target',
      render: (_, row) => [row.targetType, row.targetId].filter(Boolean).join(' / ') || '-',
    },
    { title: '结果', dataIndex: 'result', search: false },
    { title: 'IP', dataIndex: 'ip', search: false },
    {
      title: '时间',
      dataIndex: 'operationTime',
      valueType: 'dateTimeRange',
      render: (_, row) => row.operationTime ?? '-',
    },
    {
      title: '操作',
      valueType: 'option',
      render: (_, row) => (
        <Button type="link" onClick={async () => setDetail(await getOperationLog(row.id))}>
          详情
        </Button>
      ),
    },
  ];
  return (
    <section className="p-6">
      <SecurityQueryTable<OperationLog>
        actionRef={actionRef}
        columns={columns}
        request={async (params) => {
          const range = params.operationTime as [string, string] | undefined;
          const result = await pageOperationLogs({
            pageNum: params.current ?? 1,
            pageSize: params.pageSize ?? 10,
            operationType: params.operationType as string,
            operatorName: params.operatorName as string,
            target: params.target as string,
            // Keep the browser's explicit offset so the backend can interpret the same instant.
            startTime: range?.[0] ? dayjs(range[0]).format() : undefined,
            endTime: range?.[1] ? dayjs(range[1]).format() : undefined,
          });
          return { data: result.records, total: result.total, success: true };
        }}
      />
      <Drawer
        title="操作日志详情"
        width={680}
        open={Boolean(detail)}
        onClose={() => setDetail(undefined)}
        destroyOnClose
      >
        {detail ? (
          Object.entries(detail).map(([key, value]) => (
            <div key={key} className="mb-4">
              <Typography.Text strong>{key}</Typography.Text>
              <pre className="mt-1 max-h-80 overflow-auto whitespace-pre-wrap break-all rounded bg-slate-50 p-3">
                {key.toLowerCase().includes('json') ? formatJsonText(value) : String(value ?? '-')}
              </pre>
            </div>
          ))
        ) : (
          <Empty />
        )}
      </Drawer>
    </section>
  );
}

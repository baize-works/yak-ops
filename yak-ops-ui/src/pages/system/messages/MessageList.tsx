import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { history, useModel } from '@umijs/max';
import { Alert, Button, Drawer, message, Space, Tag, Typography } from 'antd';
import dayjs from 'dayjs';
import { useRef, useState } from 'react';
import { SecurityQueryTable } from '@/components/security';
import {
  batchReadMessages,
  getMessageDetail,
  type MessageDetail,
  type MessageStatus,
  markMessageRead,
  pageMessages,
  type SecurityMessage,
} from '@/services/security/messages';
import { satisfiesPermissionRequirement } from '@/utils/security/permission';

export const MESSAGE_COUNT_CHANGED_EVENT = 'yak-message-count-changed';
const notifyCountChanged = () => window.dispatchEvent(new Event(MESSAGE_COUNT_CHANGED_EVENT));

export default function MessageList({ compact = false }: { compact?: boolean }) {
  const actionRef = useRef<ActionType>();
  const { initialState } = useModel('@@initialState');
  const canReadLogs = satisfiesPermissionRequirement(initialState?.currentUser?.permissionCodes, {
    mode: 'one',
    permission: 'security:operation-log:read',
  });
  const [selected, setSelected] = useState<Array<number | string>>([]);
  const [detail, setDetail] = useState<MessageDetail>();
  const read = async (row: SecurityMessage) => {
    if (row.status === 'UNREAD') {
      await markMessageRead(row.id);
      notifyCountChanged();
      actionRef.current?.reload();
    }
    setDetail(await getMessageDetail(row.id));
  };
  const columns: ProColumns<SecurityMessage>[] = [
    {
      title: '标题',
      dataIndex: 'title',
      search: false,
      render: (_, row) => (
        <Button type="link" className={row.status === 'UNREAD' ? 'font-semibold' : ''} onClick={() => read(row)}>
          {row.title}
        </Button>
      ),
    },
    { title: '摘要', dataIndex: 'summary', search: false, ellipsis: true },
    { title: '类型', dataIndex: 'type', valueType: 'select' },
    {
      title: '状态',
      dataIndex: 'status',
      valueType: 'select',
      valueEnum: { UNREAD: { text: '未读', status: 'Processing' }, READ: { text: '已读', status: 'Default' } },
    },
    {
      title: '创建时间',
      dataIndex: 'createTime',
      valueType: 'dateTimeRange',
      render: (_, row) => row.createTime ?? '-',
    },
    {
      title: '关联日志',
      search: false,
      render: (_, row) =>
        row.operationLogId ? (
          canReadLogs ? (
            <Button
              type="link"
              onClick={() => history.push(`/system/oplogs?messageLogId=${encodeURIComponent(row.operationLogId!)}`)}
            >
              查看日志
            </Button>
          ) : (
            <Typography.Text type="secondary">不可访问</Typography.Text>
          )
        ) : (
          '-'
        ),
    },
  ];
  return (
    <>
      <SecurityQueryTable<SecurityMessage>
        actionRef={actionRef}
        columns={
          compact ? columns.filter((column) => column.dataIndex !== 'summary' && column.dataIndex !== 'type') : columns
        }
        search={compact ? false : undefined}
        pagination={{ defaultPageSize: compact ? 5 : 10, showSizeChanger: !compact }}
        rowSelection={{
          selectedRowKeys: selected,
          onChange: (keys) => setSelected(keys as Array<number | string>),
          getCheckboxProps: (row) => ({ disabled: row.status === 'READ' }),
        }}
        request={async (params) => {
          const range = params.createTime as [string, string] | undefined;
          const result = await pageMessages({
            pageNum: params.current ?? 1,
            pageSize: params.pageSize ?? (compact ? 5 : 10),
            status: params.status as MessageStatus,
            type: params.type as string,
            startTime: range?.[0] ? dayjs(range[0]).format() : undefined,
            endTime: range?.[1] ? dayjs(range[1]).format() : undefined,
          });
          return { data: result.records, total: result.total, success: true };
        }}
        tableAlertRender={() => `已选择 ${selected.length} 条未读消息`}
        tableAlertOptionRender={() => (
          <Button
            disabled={!selected.length}
            onClick={async () => {
              await batchReadMessages(selected);
              setSelected([]);
              message.success('已标记为已读');
              notifyCountChanged();
              actionRef.current?.reload();
            }}
          >
            批量已读
          </Button>
        )}
      />
      <Drawer
        title={detail?.title ?? '消息详情'}
        width={560}
        open={Boolean(detail)}
        onClose={() => setDetail(undefined)}
        destroyOnClose
      >
        {detail && (
          <Space direction="vertical" size="middle" className="w-full">
            <Space>
              <Tag>{detail.type ?? '消息'}</Tag>
              <Typography.Text type="secondary">{detail.createTime}</Typography.Text>
            </Space>
            <Typography.Paragraph className="whitespace-pre-wrap break-words">
              {detail.content ?? detail.summary ?? '-'}
            </Typography.Paragraph>
            {detail.operationLogId &&
              (canReadLogs ? (
                <Button
                  onClick={() =>
                    history.push(`/system/oplogs?messageLogId=${encodeURIComponent(detail.operationLogId!)}`)
                  }
                >
                  查看关联操作日志
                </Button>
              ) : (
                <Alert
                  type="warning"
                  showIcon
                  message="关联日志不可访问"
                  description="当前身份没有操作日志查看权限。"
                />
              ))}
          </Space>
        )}
      </Drawer>
    </>
  );
}

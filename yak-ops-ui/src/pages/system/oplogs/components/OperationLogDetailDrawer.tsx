import {
  ClockCircleOutlined,
  CodeOutlined,
  GlobalOutlined,
  UserOutlined,
} from '@ant-design/icons';
import {
  Alert,
  Descriptions,
  Drawer,
  Empty,
  Space,
  Spin,
  Tag,
  Typography,
  message,
} from 'antd';
import dayjs from 'dayjs';
import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';

import {
  formatJsonText,
  getOperationLog,
  isJsonText,
  type OperationLogDetail,
} from '@/services/security/operationLogs';

export interface OperationLogDetailDrawerRef {
  open: (id: number) => Promise<void>;
}

const errorText = (error: unknown, fallback: string): string =>
  error instanceof Error && error.message
    ? error.message
    : fallback;

const displayTime = (value?: string): string => {
  if (!value) return '-';
  const time = dayjs(value);
  return time.isValid()
    ? time.format('YYYY-MM-DD HH:mm:ss')
    : value;
};

const displayValue = (value?: string | number): string =>
  value === undefined || value === null || value === ''
    ? '-'
    : String(value);

const OperationLogDetailDrawer = forwardRef<
  OperationLogDetailDrawerRef
>((_, ref) => {
  const requestSequenceRef = useRef(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] =
    useState<OperationLogDetail>();

  const show = useCallback(async (id: number) => {
    const sequence = ++requestSequenceRef.current;
    setOpen(true);
    setLoading(true);
    setDetail(undefined);

    try {
      const value = await getOperationLog(id);
      if (sequence === requestSequenceRef.current) {
        setDetail(value);
      }
    } catch (error) {
      if (sequence === requestSequenceRef.current) {
        
      }
    } finally {
      if (sequence === requestSequenceRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useImperativeHandle(ref, () => ({ open: show }), [show]);

  const close = () => {
    requestSequenceRef.current += 1;
    setOpen(false);
    setLoading(false);
    setDetail(undefined);
  };

  const formattedDetail = formatJsonText(detail?.detail);
  const detailIsJson = isJsonText(detail?.detail);

  return (
    <Drawer
      open={open}
      title="操作日志详情"
      width={760}
      destroyOnClose
      onClose={close}
    >
      <Spin spinning={loading}>
        {!loading && !detail ? (
          <Empty description="暂无日志详情" />
        ) : detail ? (
          <div className="space-y-6">
            <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <Space size={8} wrap>
                    <Typography.Title
                      level={5}
                      className="!mb-0 !text-slate-800"
                    >
                      {displayValue(detail.operateType)}
                    </Typography.Title>
                    {detail.operationMethods && (
                      <Tag icon={<CodeOutlined />}>
                        {detail.operationMethods}
                      </Tag>
                    )}
                    {detail.targetType && (
                      <Tag>{detail.targetType}</Tag>
                    )}
                  </Space>
                  <div className="mt-2 text-sm text-slate-500">
                    {displayValue(detail.target)}
                  </div>
                </div>

                <Typography.Text
                  type="secondary"
                  copyable={{ text: String(detail.id) }}
                >
                  ID {detail.id}
                </Typography.Text>
              </div>
            </div>

            <Descriptions
              bordered
              size="small"
              column={{ xs: 1, sm: 2 }}
              items={[
                {
                  key: 'operator',
                  label: (
                    <Space size={6}>
                      <UserOutlined />
                      操作人
                    </Space>
                  ),
                  children: displayValue(detail.operator),
                },
                {
                  key: 'operatorIp',
                  label: (
                    <Space size={6}>
                      <GlobalOutlined />
                      IP 地址
                    </Space>
                  ),
                  children: detail.operatorIp ? (
                    <Typography.Text
                      copyable={{ text: detail.operatorIp }}
                    >
                      {detail.operatorIp}
                    </Typography.Text>
                  ) : (
                    '-'
                  ),
                },
                {
                  key: 'operatePage',
                  label: '操作页面',
                  children: displayValue(detail.operatePage),
                },
                {
                  key: 'operationMethods',
                  label: '操作方法',
                  children: displayValue(
                    detail.operationMethods,
                  ),
                },
                {
                  key: 'targetType',
                  label: '目标类型',
                  children: displayValue(detail.targetType),
                },
                {
                  key: 'target',
                  label: '操作目标',
                  children: detail.target ? (
                    <Typography.Text
                      copyable={{ text: detail.target }}
                    >
                      {detail.target}
                    </Typography.Text>
                  ) : (
                    '-'
                  ),
                },
                {
                  key: 'createTime',
                  label: (
                    <Space size={6}>
                      <ClockCircleOutlined />
                      操作时间
                    </Space>
                  ),
                  children: displayTime(detail.createTime),
                },
                {
                  key: 'updateTime',
                  label: '更新时间',
                  children: displayTime(detail.updateTime),
                },
              ]}
            />

            <div>
              <div className="mb-2 flex items-center justify-between gap-3">
                <div className="text-sm font-medium text-slate-800">
                  操作详情
                </div>
                {formattedDetail && (
                  <Typography.Text
                    type="secondary"
                    copyable={{ text: formattedDetail }}
                  >
                    复制详情
                  </Typography.Text>
                )}
              </div>

              {!formattedDetail ? (
                <div className="rounded-lg border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-400">
                  本条日志没有记录操作详情
                </div>
              ) : (
                <pre className="max-h-[420px] overflow-auto whitespace-pre-wrap break-all rounded-lg border border-slate-200 bg-slate-950 px-4 py-3 font-mono text-xs leading-6 text-slate-100">
                  {formattedDetail}
                </pre>
              )}
            </div>

           
          </div>
        ) : null}
      </Spin>
    </Drawer>
  );
});

OperationLogDetailDrawer.displayName =
  'OperationLogDetailDrawer';

export default OperationLogDetailDrawer;

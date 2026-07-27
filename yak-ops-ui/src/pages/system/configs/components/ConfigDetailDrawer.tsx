import { SettingOutlined } from '@ant-design/icons';
import {
  Avatar,
  Descriptions,
  Drawer,
  Empty,
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
  type SystemConfig,
  formatConfigValue,
  getConfig,
} from '@/services/security/configs';

export interface ConfigDetailDrawerRef {
  open: (config: SystemConfig) => void;
}

const errorText = (error: unknown, fallback: string): string =>
  error instanceof Error && error.message
    ? error.message
    : fallback;

const dateText = (value?: string): string =>
  value && dayjs(value).isValid()
    ? dayjs(value).format('YYYY-MM-DD HH:mm:ss')
    : '-';

const ConfigDetailDrawer = forwardRef<ConfigDetailDrawerRef>(
  (_, ref) => {
    const requestSequenceRef = useRef(0);
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [detail, setDetail] = useState<SystemConfig>();

    const show = useCallback((config: SystemConfig) => {
      const sequence = ++requestSequenceRef.current;
      setOpen(true);
      setLoading(true);
      setDetail(config);

      void getConfig(config.id)
        .then((value) => {
          if (sequence === requestSequenceRef.current) {
            setDetail(value);
          }
        })
        .catch((error) => {
          if (sequence === requestSequenceRef.current) {
            message.error(errorText(error, '配置详情加载失败'));
          }
        })
        .finally(() => {
          if (sequence === requestSequenceRef.current) {
            setLoading(false);
          }
        });
    }, []);

    useImperativeHandle(ref, () => ({ open: show }), [show]);

    const close = () => {
      requestSequenceRef.current += 1;
      setOpen(false);
      setLoading(false);
      setDetail(undefined);
    };

    const formattedValue = formatConfigValue(detail?.value ?? '');

    return (
      <Drawer
        open={open}
        title="配置详情"
        width={680}
        destroyOnClose
        onClose={close}
      >
        <Spin spinning={loading}>
          {detail ? (
            <div className="space-y-6">
              <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50/60 px-4 py-3">
                <Avatar
                  size={44}
                  icon={<SettingOutlined />}
                  className="shrink-0 !bg-slate-600"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Typography.Title
                      level={5}
                      className="!mb-0 !text-slate-800"
                    >
                      {detail.valueName || '未命名配置'}
                    </Typography.Title>
                    <Tag
                      color={detail.status === 1 ? 'processing' : 'default'}
                    >
                      {detail.status === 1 ? '已启用' : '已停用'}
                    </Tag>
                  </div>
                  <div className="mt-1 text-xs text-slate-400">
                    {detail.valueGroup || '未分组'} · ID {detail.id}
                  </div>
                </div>
              </div>

              <Descriptions
                bordered
                size="small"
                column={2}
                items={[
                  {
                    key: 'id',
                    label: '配置 ID',
                    children: (
                      <Typography.Text copyable>
                        {detail.id}
                      </Typography.Text>
                    ),
                  },
                  {
                    key: 'status',
                    label: '配置状态',
                    children:
                      detail.status === 1 ? '启用' : '停用',
                  },
                  {
                    key: 'group',
                    label: '配置分组',
                    children: detail.valueGroup || '-',
                  },
                  {
                    key: 'name',
                    label: '配置名称',
                    children: (
                      <Typography.Text copyable>
                        {detail.valueName || '-'}
                      </Typography.Text>
                    ),
                  },
                  {
                    key: 'operator',
                    label: '最后操作人',
                    children: detail.operator || '-',
                  },
                  {
                    key: 'createTime',
                    label: '创建时间',
                    children: dateText(detail.createTime),
                  },
                  {
                    key: 'updateTime',
                    label: '更新时间',
                    children: dateText(detail.updateTime),
                    span: 2,
                  },
                ]}
              />

              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-slate-800">
                    配置值
                  </span>
                  <Typography.Text
                    copyable={{ text: detail.value ?? '' }}
                    className="text-xs"
                  >
                    复制原值
                  </Typography.Text>
                </div>
                <pre className="max-h-[360px] min-h-24 overflow-auto whitespace-pre-wrap break-all rounded-lg border border-slate-200 bg-slate-950 px-4 py-3 font-mono text-xs leading-6 text-slate-100">
                  {formattedValue || '(空字符串)'}
                </pre>
              </div>

              <div>
                <div className="mb-2 text-sm font-medium text-slate-800">
                  备注
                </div>
                <div className="min-h-20 whitespace-pre-wrap break-words rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-600">
                  {detail.memo || '暂无备注'}
                </div>
              </div>
            </div>
          ) : (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />
          )}
        </Spin>
      </Drawer>
    );
  },
);

ConfigDetailDrawer.displayName = 'ConfigDetailDrawer';

export default ConfigDetailDrawer;

import {BellOutlined, DeleteOutlined, EditOutlined, ThunderboltOutlined,} from '@ant-design/icons';
import {useIntl} from '@umijs/max';
import {Button, Empty, message, Modal, Spin, Switch, Tooltip,} from 'antd';
import {ArrowRight, RadioTower} from 'lucide-react';
import React, {useEffect, useMemo, useRef, useState} from 'react';
import {deleteChannel, fetchChannels, saveChannel, testChannel,} from '../service';
import type {AlarmChannelRecord, AlarmModalRef, AlarmOperateType,} from '../types';
import {formatTime} from '../utils';
import AddOrEditChannelModal from './AddOrEditChannelModal';

const {confirm} = Modal;

interface ChannelTabProps {
  keyword?: string;
}

const ChannelTab: React.FC<ChannelTabProps> = ({keyword = ''}) => {
  const intl = useIntl();
  const modalRef = useRef<AlarmModalRef>(null);

  const [loading, setLoading] = useState(false);
  const [channelList, setChannelList] = useState<AlarmChannelRecord[]>([]);
  const [testingId, setTestingId] = useState<number | null>(null);

  const fetchList = async () => {
    setLoading(true);

    try {
      const res = await fetchChannels();

      if (res?.code === 0) {
        setChannelList(res.data || []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchList();
  }, []);

  const filteredList = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();

    if (!normalizedKeyword) {
      return channelList;
    }

    return channelList.filter((channel) => {
      const searchableContent = [
        channel.name,
        channel.channelType,
        channel.description,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return searchableContent.includes(normalizedKeyword);
    });
  }, [channelList, keyword]);

  const handleCreate = () => {
    modalRef.current?.open({
      operateType: 'CREATE' as AlarmOperateType,
      onSuccess: fetchList,
    });
  };

  const handleEdit = (record: AlarmChannelRecord) => {
    modalRef.current?.open({
      operateType: 'EDIT' as AlarmOperateType,
      currentRecord: record,
      onSuccess: fetchList,
    });
  };

  const handleDelete = (record: AlarmChannelRecord) => {
    confirm({
      title: intl.formatMessage({
        id: 'pages.alarm.delete.confirmTitle',
        defaultMessage: '确认删除？',
      }),
      centered: true,
      content: intl.formatMessage(
        {
          id: 'pages.alarm.channel.delete.confirmContent',
          defaultMessage: '确认删除告警通道 [{name}] 吗？',
        },
        {
          name: record.name,
        },
      ),
      okText: intl.formatMessage({
        id: 'pages.alarm.delete.okText',
        defaultMessage: '删除',
      }),
      okType: 'primary',
      okButtonProps: {
        danger: true,
      },
      maskClosable: true,
      async onOk() {
        if (!record.id) {
          message.error('通道 ID 不存在');
          return;
        }

        const res = await deleteChannel(record.id);

        if (res?.code === 0) {
          message.success(
            intl.formatMessage({
              id: 'pages.alarm.message.deleteSuccess',
              defaultMessage: '删除成功',
            }),
          );

          await fetchList();
        }
      },
    });
  };

  const handleToggleEnabled = async (
    record: AlarmChannelRecord,
    checked: boolean,
  ) => {
    if (!record.id) {
      return;
    }

    const res = await saveChannel({
      id: record.id,
      name: record.name,
      channelType: record.channelType,
      configJson: record.configJson,
      enabled: checked ? 1 : 0,
      description: record.description,
    });

    if (res?.code === 0) {
      message.success(checked ? '已启用' : '已禁用');
      await fetchList();
    }
  };

  const handleTest = async (record: AlarmChannelRecord) => {
    if (!record.channelType || !record.configJson) {
      message.error('通道配置不完整，无法测试');
      return;
    }

    setTestingId(record.id ?? null);

    try {
      const res = await testChannel({
        channelType: record.channelType,
        configJson: record.configJson,
      });

      if (res?.code === 0 && res.data?.success) {
        message.success(res.data.message || '测试成功');
      } else {
        message.error(res?.data?.message || '测试失败，请检查配置');
      }
    } finally {
      setTestingId(null);
    }
  };

  return (
    <div>
      {/* 工具栏 */}
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <p className="m-0 text-sm font-medium text-slate-700">
            共 {filteredList.length} 个告警通道
          </p>

          <p className="mt-1 text-xs text-slate-400">
            管理任务异常消息的投递方式
          </p>
        </div>

        <Button
          type="primary"
          onClick={handleCreate}
          className="rounded-full"
        >
          新建通道
        </Button>
      </div>

      <Spin spinning={loading}>
        {filteredList.length > 0 ? (
          <div className="grid gap-x-5 sm:grid-cols-2">
            {filteredList.map((channel) => {
              const enabled = channel.enabled === 1;
              const testing = testingId === channel.id;

              return (
                <div
                  key={channel.id}
                  className={[
                    'group relative flex items-start gap-3.5 rounded-xl',
                    'border border-transparent px-3 py-4',
                    'transition-all duration-200',
                    'hover:border-slate-200 hover:bg-slate-50',
                  ].join(' ')}
                >
                  {/* 图标 */}
                  <div
                    className={[
                      'mt-0.5 flex h-10 w-10 shrink-0',
                      'items-center justify-center rounded-xl',
                      'transition-colors duration-200',
                      enabled
                        ? 'bg-slate-100 text-slate-700 group-hover:bg-white'
                        : 'bg-slate-50 text-slate-300',
                    ].join(' ')}
                  >
                    <RadioTower className="h-5 w-5"/>
                  </div>

                  {/* 主体 */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="m-0 truncate text-sm font-semibold text-slate-950">
                            {channel.name || '未命名通道'}
                          </h3>

                          <span
                            className={[
                              'h-1.5 w-1.5 shrink-0 rounded-full',
                              enabled ? 'bg-emerald-500' : 'bg-slate-300',
                            ].join(' ')}
                          />
                        </div>

                        <p className="mt-1.5 line-clamp-2 min-h-12 text-sm leading-6 text-slate-500">
                          {channel.description || '暂无通道说明'}
                        </p>
                      </div>

                      <Switch
                        size="small"
                        checked={enabled}
                        onChange={(checked) =>
                          handleToggleEnabled(channel, checked)
                        }
                      />
                    </div>

                    {/* 元信息 */}
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                      <span className="inline-flex items-center gap-1">
                        <BellOutlined/>
                        {channel.channelType || '-'}
                      </span>

                      <span className="h-1 w-1 rounded-full bg-slate-300"/>

                      <span>
                        {channel.createTime
                          ? formatTime(channel.createTime)
                          : '-'}
                      </span>
                    </div>

                    {/* 操作 */}
                    <div className="mt-3 flex items-center gap-1 border-t border-slate-100 pt-3">
                      <Button
                        type="text"
                        size="small"
                        icon={<ThunderboltOutlined/>}
                        loading={testing}
                        onClick={() => handleTest(channel)}
                        className="text-slate-500"
                      >
                        测试
                      </Button>

                      <Button
                        type="text"
                        size="small"
                        icon={<EditOutlined/>}
                        onClick={() => handleEdit(channel)}
                        className="text-slate-500"
                      >
                        编辑
                      </Button>

                      <Button
                        type="text"
                        size="small"
                        danger
                        icon={<DeleteOutlined/>}
                        onClick={() => handleDelete(channel)}
                      >
                        删除
                      </Button>

                      <Tooltip title="查看详情">
                        <button
                          type="button"
                          onClick={() => handleEdit(channel)}
                          className={[
                            'ml-auto inline-flex h-7 w-7 items-center justify-center',
                            'rounded-lg text-slate-300 transition-all duration-200',
                            'hover:bg-white hover:text-slate-700',
                          ].join(' ')}
                        >
                          <ArrowRight className="h-4 w-4"/>
                        </button>
                      </Tooltip>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-16">
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                keyword
                  ? '没有找到符合条件的告警通道'
                  : '暂时还没有告警通道'
              }
            >
              {!keyword && (
                <Button type="primary" onClick={handleCreate}>
                  新建通道
                </Button>
              )}
            </Empty>
          </div>
        )}
      </Spin>

      <AddOrEditChannelModal ref={modalRef}/>
    </div>
  );
};

export default ChannelTab;

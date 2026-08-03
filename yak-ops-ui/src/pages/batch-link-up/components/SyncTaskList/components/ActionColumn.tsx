import { API_SUCCESS_CODE } from '@/services/http/response';
import {
  CloudDownloadOutlined,
  CloudUploadOutlined,
  DeleteOutlined,
  DownOutlined,
  EditOutlined,
  EyeOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
} from '@ant-design/icons';
import { history, useIntl } from '@umijs/max';
import {
  Button,
  Dropdown,
  Modal,
  Popconfirm,
  Tooltip,
  message,
  type MenuProps,
} from 'antd';
import { useState } from 'react';

import {
  linkupJobDefinitionApi,
  linkupJobExecuteApi,
} from '../../../api';

interface ActionColumnProps {
  record: any;
  cbk: () => void;
  goDetail: (value: any, item: any) => void;
}

const { confirm } = Modal;
const ACTIVE_STATUSES = new Set(['CREATED', 'SUBMITTED', 'QUEUED', 'RUNNING']);

const normalizeStatus = (value?: string) =>
  String(value || '').trim().toUpperCase();

const isReleaseOnline = (releaseState?: string | number) =>
  releaseState === 'ONLINE' || releaseState === 1;

const errorText = (response: any, fallback: string) =>
  response?.msg || response?.message || fallback;

const ActionColumn: React.FC<ActionColumnProps> = ({ record, cbk, goDetail }) => {
  const intl = useIntl();
  const [runOpen, setRunOpen] = useState(false);
  const [runLoading, setRunLoading] = useState(false);

  const isOnline = isReleaseOnline(record?.releaseState);
  const isActive = ACTIVE_STATUSES.has(normalizeStatus(record?.lastJobStatus));
  const canRun = isOnline && !isActive;
  const canEdit = !isOnline && !isActive;
  const canDelete = !isOnline && !isActive;

  const stopPropagation = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
  };

  const openExecutionDetail = () => {
    if (record?.id === undefined || record?.id === null) {
      message.error('任务定义 ID 不存在');
      return;
    }

    const params = new URLSearchParams();
    if (record?.instanceId !== undefined && record?.instanceId !== null) {
      params.set('instanceId', String(record.instanceId));
    }

    const search = params.toString();
    history.push(
      `/sync/batch-link-up/${encodeURIComponent(String(record.id))}/detail${
        search ? `?${search}` : ''
      }`,
    );
  };

  const handleRun = async () => {
    if (!canRun) {
      message.warning(isOnline ? '任务正在执行中' : '请先上线任务，再执行运行操作');
      return;
    }
    if (record?.id === undefined || record?.id === null) {
      message.error('任务定义 ID 不存在');
      return;
    }
    try {
      setRunLoading(true);
      const response = await linkupJobExecuteApi.execute(record.id);
      if (response?.code !== API_SUCCESS_CODE) {
        message.error(errorText(response, '运行失败'));
        return;
      }
      message.success('任务已提交运行');
      setRunOpen(false);
      cbk();
    } catch (error: any) {
      message.error(error?.message || '运行失败');
    } finally {
      setRunLoading(false);
    }
  };

  const handleStop = async () => {
    const instanceId = record?.instanceId;
    if (instanceId === undefined || instanceId === null) {
      message.error('任务实例 ID 不存在');
      return;
    }
    try {
      const response = await linkupJobExecuteApi.pause(instanceId);
      if (response?.code !== API_SUCCESS_CODE) {
        message.error(errorText(response, '停止失败'));
        return;
      }
      message.success('停止请求已提交');
      cbk();
    } catch (error: any) {
      message.error(error?.message || '停止失败');
    }
  };

  const handleOnline = async () => {
    if (record?.id === undefined || record?.id === null) {
      message.error('任务定义 ID 不存在');
      return;
    }
    try {
      const response = await linkupJobDefinitionApi.online(record.id);
      if (response?.code !== API_SUCCESS_CODE) {
        message.error(errorText(response, '上线失败'));
        return;
      }
      message.success('上线成功');
      cbk();
    } catch (error: any) {
      message.error(error?.message || '上线失败');
    }
  };

  const handleOffline = async () => {
    if (isActive) {
      message.warning('任务正在执行中，请先停止任务后再下线');
      return;
    }
    if (record?.id === undefined || record?.id === null) {
      message.error('任务定义 ID 不存在');
      return;
    }
    try {
      const response = await linkupJobDefinitionApi.offline(record.id);
      if (response?.code !== API_SUCCESS_CODE) {
        message.error(errorText(response, '下线失败'));
        return;
      }
      message.success('下线成功');
      cbk();
    } catch (error: any) {
      message.error(error?.message || '下线失败');
    }
  };

  const showOnlineConfirm = () => {
    confirm({
      title: '任务上线',
      centered: true,
      content: '上线后任务可以被手动运行或调度触发，确认上线吗？',
      okText: '确认',
      cancelText: '取消',
      onOk: handleOnline,
    });
  };

  const showOfflineConfirm = () => {
    if (isActive) {
      message.warning('任务正在执行中，请先停止任务后再下线');
      return;
    }
    confirm({
      title: '任务下线',
      centered: true,
      content: '下线后任务将不会再被调度触发，确认下线吗？',
      okText: '确认',
      cancelText: '取消',
      onOk: handleOffline,
    });
  };

  const handleEdit = () => {
    if (!canEdit) {
      message.warning(isOnline ? '任务已上线，请先下线后再编辑' : '任务正在执行中');
      return;
    }
    if (record?.id === undefined || record?.id === null) {
      message.error('任务定义 ID 不存在');
      return;
    }
    goDetail(record.id, record);
  };

  const handleDeleteTask = () => {
    if (!canDelete) {
      message.warning(isOnline ? '任务已上线，请先下线后再删除' : '任务正在执行中');
      return;
    }
    confirm({
      title: '删除任务',
      centered: true,
      content: `确认删除任务 ${record?.jobName || '-'} 吗？删除后无法恢复。`,
      okText: '删除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: async () => {
        const response = await linkupJobDefinitionApi.delete(record.id);
        if (response?.code !== API_SUCCESS_CODE) {
          message.error(errorText(response, '删除失败'));
          return;
        }
        message.success('删除成功');
        cbk();
      },
    });
  };

  const menuItems: MenuProps['items'] = [
    { key: 'view', icon: <EyeOutlined />, label: '查看详情' },
    { key: 'edit', icon: <EditOutlined />, label: '编辑配置', disabled: !canEdit },
    { type: 'divider' },
    {
      key: isOnline ? 'offline' : 'online',
      icon: isOnline ? <CloudDownloadOutlined /> : <CloudUploadOutlined />,
      label: isOnline ? '下线任务' : '上线任务',
      disabled: isActive,
    },
    { type: 'divider' },
    {
      key: 'delete',
      icon: <DeleteOutlined />,
      label: '删除任务',
      danger: true,
      disabled: !canDelete,
    },
  ];

  const handleMenuClick: MenuProps['onClick'] = ({ key, domEvent }) => {
    domEvent.stopPropagation();
    if (key === 'view') openExecutionDetail();
    if (key === 'edit') handleEdit();
    if (key === 'online') showOnlineConfirm();
    if (key === 'offline') showOfflineConfirm();
    if (key === 'delete') handleDeleteTask();
  };

  return (
    <div className="flex items-center gap-1 whitespace-nowrap">
      {isActive ? (
        <Popconfirm
          title="停止任务"
          description="确认停止当前任务吗？"
          okText={intl.formatMessage({ id: 'pages.common.yes', defaultMessage: '确认' })}
          cancelText={intl.formatMessage({ id: 'pages.common.no', defaultMessage: '取消' })}
          onConfirm={handleStop}
        >
          <Button
            size="small"
            color="danger"
            variant="filled"
            icon={<PauseCircleOutlined />}
            className="!h-7 !rounded-md !px-2.5 !text-xs"
            onClick={stopPropagation}
          >
            停止
          </Button>
        </Popconfirm>
      ) : (
        <Tooltip title={canRun ? undefined : '请先上线任务'}>
          <Popconfirm
            title="运行任务"
            description="确认运行当前任务吗？"
            open={canRun && runOpen}
            okText="确认"
            cancelText="取消"
            okButtonProps={{ loading: runLoading }}
            onConfirm={handleRun}
            onOpenChange={(open) => {
              if (!canRun) {
                if (open) message.warning('请先上线任务，再执行运行操作');
                return;
              }
              if (!runLoading) setRunOpen(open);
            }}
          >
            <Button
              size="small"
              color={canRun ? 'primary' : 'default'}
              variant="filled"
              loading={runLoading}
              aria-disabled={!canRun}
              icon={<PlayCircleOutlined />}
              className={[
                '!h-7 !rounded-md !px-2.5 !text-xs',
                !canRun ? '!cursor-not-allowed !text-[#98a2b3]' : '',
              ].join(' ')}
              onClick={stopPropagation}
            >
              运行
            </Button>
          </Popconfirm>
        </Tooltip>
      )}

      <Dropdown
        trigger={['click']}
        placement="bottomRight"
        menu={{ items: menuItems, onClick: handleMenuClick }}
      >
        <Button
          size="small"
          color="default"
          variant="text"
          className="!h-7 !rounded-md !px-2 !text-xs !text-[#667085]"
          onClick={stopPropagation}
        >
          更多
          <DownOutlined className="text-[9px]" />
        </Button>
      </Dropdown>
    </div>
  );
};

export default ActionColumn;

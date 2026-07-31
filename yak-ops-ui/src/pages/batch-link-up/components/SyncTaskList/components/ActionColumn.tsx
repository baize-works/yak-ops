import { API_SUCCESS_CODE } from '@/services/http/response';
import {
  CloudDownloadOutlined,
  CloudUploadOutlined,
  DeleteOutlined,
  DownOutlined,
  EditOutlined,
  EyeOutlined,
  FileSearchOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
} from '@ant-design/icons';
import { useIntl } from '@umijs/max';
import {
  Button,
  Dropdown,
  Modal,
  Popconfirm,
  Tooltip,
  message,
  type MenuProps,
} from 'antd';
import { useRef, useState } from 'react';

import {
  linkupJobDefinitionApi,
  linkupJobExecuteApi,
} from '../../../api';
import TaskViewModal from '../../../TaskViewModal';
import RunLogDrawer from './RunLogDrawer';

interface ActionColumnProps {
  record: any;
  cbk: () => void;
  goDetail: (value: any, item: any) => void;
}

const { confirm } = Modal;

const isReleaseOnline = (releaseState?: string | number) =>
  releaseState === 'ONLINE' || releaseState === 1;

const ActionColumn: React.FC<ActionColumnProps> = ({
  record,
  cbk,
  goDetail,
}) => {
  const intl = useIntl();
  const taskViewRef = useRef<any>(null);

  const [runOpen, setRunOpen] = useState(false);
  const [runLoading, setRunLoading] = useState(false);
  const [logOpen, setLogOpen] = useState(false);

  const isOnline = isReleaseOnline(record?.releaseState);
  const isRunning = record?.lastJobStatus === 'RUNNING';

  const canRun = isOnline && !isRunning;
  const canEdit = !isOnline && !isRunning;
  const canDelete = !isOnline && !isRunning;

  const stopPropagation = (
    event: React.MouseEvent<HTMLElement>,
  ) => {
    event.stopPropagation();
  };

  const yesText = intl.formatMessage({
    id: 'pages.common.yes',
    defaultMessage: '确认',
  });

  const noText = intl.formatMessage({
    id: 'pages.common.no',
    defaultMessage: '取消',
  });

  const handleRun = async () => {
    if (!canRun) {
      message.warning('请先上线任务，再执行运行操作');
      return;
    }

    if (record?.id === undefined || record?.id === null) {
      message.error('任务定义 ID 不存在');
      return;
    }

    try {
      setRunLoading(true);

      const response = await linkupJobExecuteApi.execute(record.id);

      if (response?.code === API_SUCCESS_CODE) {
        message.success(
          intl.formatMessage({
            id: 'pages.common.success',
            defaultMessage: '运行成功',
          }),
        );

        setRunOpen(false);
        cbk();
        return;
      }

      message.error(
        response?.msg ||
          response?.message ||
          '运行失败',
      );
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

    const response =
      await linkupJobExecuteApi.pause(instanceId);

    if (response?.code === API_SUCCESS_CODE) {
      message.success('停止成功');
      cbk();
      return;
    }

    message.error(
      response?.msg ||
        response?.message ||
        '停止失败',
    );
  };

  const handleOnline = async () => {
    if (record?.id === undefined || record?.id === null) {
      message.error('任务定义 ID 不存在');
      return;
    }

    const response =
      await linkupJobDefinitionApi.online(record.id);

    if (response?.code === API_SUCCESS_CODE) {
      message.success('上线成功');
      cbk();
      return;
    }

    message.error(
      response?.msg ||
        response?.message ||
        '上线失败',
    );
  };

  const handleOffline = async () => {
    if (isRunning) {
      message.warning('任务正在运行中，请先停止任务后再下线');
      return;
    }

    if (record?.id === undefined || record?.id === null) {
      message.error('任务定义 ID 不存在');
      return;
    }

    const response =
      await linkupJobDefinitionApi.offline(record.id);

    if (response?.code === API_SUCCESS_CODE) {
      message.success('下线成功');
      cbk();
      return;
    }

    message.error(
      response?.msg ||
        response?.message ||
        '下线失败',
    );
  };

  const showOnlineConfirm = () => {
    confirm({
      title: '任务上线',
      centered: true,
      content: (
        <div className="text-sm leading-6 text-[#667085]">
          上线后任务将恢复可运行状态，并同步恢复调度。
          <br />
          确认上线该任务吗？
        </div>
      ),
      okText: '确认',
      cancelText: '取消',
      onOk: handleOnline,
    });
  };

  const showOfflineConfirm = () => {
    if (isRunning) {
      message.warning('任务正在运行中，请先停止任务后再下线');
      return;
    }

    confirm({
      title: '任务下线',
      centered: true,
      content: (
        <div className="text-sm leading-6 text-[#667085]">
          下线后任务将不会再被调度触发。
          <br />
          确认下线该任务吗？
        </div>
      ),
      okText: '确认',
      cancelText: '取消',
      onOk: handleOffline,
    });
  };

  const handleEdit = async () => {
    if (!canEdit) {
      if (isOnline) {
        message.warning('任务已上线，请先下线后再编辑');
        return;
      }

      if (isRunning) {
        message.warning('任务正在运行中，请先停止后再编辑');
        return;
      }
    }

    if (record?.id === undefined || record?.id === null) {
      message.error('任务定义 ID 不存在');
      return;
    }

    const response =
      await linkupJobDefinitionApi.selectEditDetail(
        record.id,
      );

    if (response?.code === API_SUCCESS_CODE) {
      goDetail(record.id, record);
      return;
    }

    message.error(
      response?.msg ||
        response?.message ||
        '获取任务详情失败',
    );
  };

  const doDeleteTask = async (
    id: string | number,
  ) => {
    const response =
      await linkupJobDefinitionApi.delete(id);

    if (response?.code === API_SUCCESS_CODE) {
      message.success(
        response?.msg || '删除成功',
      );
      cbk();
      return;
    }

    message.error(
      response?.msg ||
        response?.message ||
        '删除失败',
    );
  };

  const handleDeleteTask = () => {
    if (!canDelete) {
      if (isOnline) {
        message.warning('任务已上线，请先下线后再删除');
        return;
      }

      if (isRunning) {
        message.warning('任务正在运行中，请先停止后再删除');
        return;
      }
    }

    confirm({
      title: intl.formatMessage({
        id: 'pages.job.action.delete.confirmTitle',
        defaultMessage: '删除任务',
      }),
      centered: true,
      content: (
        <div className="text-sm leading-6 text-[#667085]">
          确认删除任务
          <span className="mx-1 font-medium text-[#344054]">
            {record?.jobName || '-'}
          </span>
          吗？
          <br />
          删除后将无法恢复。
        </div>
      ),
      okText: intl.formatMessage({
        id: 'pages.job.action.delete.okText',
        defaultMessage: '删除',
      }),
      cancelText: '取消',
      okButtonProps: {
        danger: true,
      },
      maskClosable: true,
      onOk: () => {
        if (
          record?.id === undefined ||
          record?.id === null
        ) {
          message.error('任务定义 ID 不存在');
          return;
        }

        return doDeleteTask(record.id);
      },
    });
  };

  const menuItems: MenuProps['items'] = [
    {
      key: 'view',
      icon: <EyeOutlined />,
      label: '查看详情',
    },
    {
      key: 'edit',
      icon: <EditOutlined />,
      label: '编辑配置',
      disabled: !canEdit,
    },
    {
      key: 'log',
      icon: <FileSearchOutlined />,
      label: '查看日志',
    },
    {
      type: 'divider',
    },
    {
      key: isOnline ? 'offline' : 'online',
      icon: isOnline ? (
        <CloudDownloadOutlined />
      ) : (
        <CloudUploadOutlined />
      ),
      label: isOnline ? '下线任务' : '上线任务',
    },
    {
      type: 'divider',
    },
    {
      key: 'delete',
      icon: <DeleteOutlined />,
      label: '删除任务',
      danger: true,
      disabled: !canDelete,
    },
  ];

  const handleMenuClick: MenuProps['onClick'] = ({
    key,
    domEvent,
  }) => {
    domEvent.stopPropagation();

    switch (key) {
      case 'view':
        taskViewRef.current?.onOpen(
          true,
          record,
          cbk,
        );
        break;

      case 'edit':
        handleEdit();
        break;

      case 'log':
        setLogOpen(true);
        break;

      case 'online':
        showOnlineConfirm();
        break;

      case 'offline':
        showOfflineConfirm();
        break;

      case 'delete':
        handleDeleteTask();
        break;

      default:
        break;
    }
  };

  return (
    <>
      <div className="flex items-center gap-1 whitespace-nowrap">
        {isRunning ? (
          <Popconfirm
            title={intl.formatMessage({
              id: 'pages.job.action.stop.title',
              defaultMessage: '停止任务',
            })}
            description="确认停止当前任务吗？"
            okText={yesText}
            cancelText={noText}
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
          <Tooltip
            title={
              canRun
                ? undefined
                : '请先上线任务'
            }
          >
            <Popconfirm
              title={intl.formatMessage({
                id: 'pages.job.action.run.title',
                defaultMessage: '运行任务',
              })}
              description="确认运行当前任务吗？"
              open={canRun && runOpen}
              okText={yesText}
              cancelText={noText}
              okButtonProps={{
                loading: runLoading,
              }}
              onConfirm={handleRun}
              onOpenChange={(open) => {
                if (!canRun) {
                  if (open) {
                    message.warning(
                      '请先上线任务，再执行运行操作',
                    );
                  }

                  return;
                }

                if (!runLoading) {
                  setRunOpen(open);
                }
              }}
            >
              <Button
                size="small"
                color={
                  canRun ? 'primary' : 'default'
                }
                variant="filled"
                loading={runLoading}
                aria-disabled={!canRun}
                icon={<PlayCircleOutlined />}
                className={[
                  '!h-7 !rounded-md !px-2.5 !text-xs',
                  !canRun
                    ? '!cursor-not-allowed !text-[#98a2b3]'
                    : '',
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
          menu={{
            items: menuItems,
            onClick: handleMenuClick,
          }}
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

      <TaskViewModal ref={taskViewRef} />

      <RunLogDrawer
        open={logOpen}
        jobMode="BATCH"
        instanceId={record?.instanceId}
        onClose={() => setLogOpen(false)}
        title="运行日志"
        subtitle={
          record?.jobName
            ? `任务：${record.jobName}`
            : '查看任务运行输出'
        }
      />
    </>
  );
};

export default ActionColumn;
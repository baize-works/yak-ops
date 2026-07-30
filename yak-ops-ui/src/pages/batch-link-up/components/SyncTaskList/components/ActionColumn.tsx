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
} from "@ant-design/icons";
import { useIntl } from "@umijs/max";
import { Dropdown, Modal, Popconfirm, Space, message } from "antd";
import { useRef, useState } from "react";
import {
  linkupJobDefinitionApi,
  linkupJobExecuteApi,
} from "../../../api";
import TaskViewModal from "../../../TaskViewModal";
import RunLogDrawer from "./RunLogDrawer";

interface ActionColumnProps {
  record: any;
  cbk: () => void;
  goDetail: (value: any, item: any) => void;
}

const { confirm } = Modal;

const actionBaseClass =
  "inline-flex h-7 items-center gap-1 rounded-full px-2.5 text-xs font-medium transition-all duration-150";

const primaryActionClass = `${actionBaseClass} bg-[#eef3ff] text-[#3157d5] hover:bg-[#e1e9ff] hover:text-[#2448c2]`;

const dangerActionClass = `${actionBaseClass} bg-[#fff1f0] text-[#cf1322] hover:bg-[#ffe1de] hover:text-[#a8071a]`;

const secondaryActionClass = `${actionBaseClass} bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900`;

const disabledActionClass = `${actionBaseClass} cursor-not-allowed bg-slate-100 text-slate-400`;

const moreActionClass =
  "inline-flex h-7 items-center gap-1 rounded-full px-2 text-xs font-medium text-slate-500 transition-all duration-150 hover:bg-slate-100 hover:text-slate-800";

const isReleaseOnline = (releaseState?: string | number) => {
  return releaseState === "ONLINE" || releaseState === 1;
};

const ActionColumn: React.FC<ActionColumnProps> = ({
  record,
  cbk,
  goDetail,
}) => {
  const intl = useIntl();

  const ref = useRef<any>(null);

  const [runOpen, setRunOpen] = useState(false);
  const [runLoading, setRunLoading] = useState(false);

  const isOnline = isReleaseOnline(record?.releaseState);
  const isRunning = record?.lastJobStatus === "RUNNING";
  const [logOpen, setLogOpen] = useState(false);
  const canRun = isOnline && !isRunning;

  /**
   * 上线后不能编辑和删除。
   * 运行中一般也不允许编辑和删除。
   */
  const canEdit = !isOnline && !isRunning;
  const canDelete = !isOnline && !isRunning;

  const stopPropagation = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
  };

  const handleStop = () => {
    const instanceId = record?.instanceId;

    if (instanceId === undefined || instanceId === null) {
      message.error("任务实例 ID 不存在");
      return;
    }

    linkupJobExecuteApi.pause(instanceId).then((data) => {
      if (data?.code === API_SUCCESS_CODE) {
        message.success("停止成功");
        cbk();
      } else {
        message.error(data?.msg || "停止失败");
        cbk();
      }
    });
  };

  const handleOnline = async () => {
    if (!record?.id) {
      message.error("任务定义ID 不存在");
      return;
    }

    const response = await linkupJobDefinitionApi.online(record.id);

    if (response?.code === API_SUCCESS_CODE) {
      message.success("上线成功");
      cbk();
      return;
    }

    message.error(response?.msg || response?.message || "上线失败");
  };

  const handleOffline = async () => {
    if (isRunning) {
      message.warning("任务正在运行中，请先停止任务后再下线");
      return;
    }

    if (!record?.id) {
      message.error("任务定义ID 不存在");
      return;
    }

    const response = await linkupJobDefinitionApi.offline(record.id);

    if (response?.code === API_SUCCESS_CODE) {
      message.success("下线成功");
      cbk();
      return;
    }

    message.error(response?.msg || response?.message || "下线失败");
  };

  const doDeleteTask = async (id: string | number) => {
    const response = await linkupJobDefinitionApi.delete(id);

    if (response?.code === API_SUCCESS_CODE) {
      message.success(response?.msg || "删除成功");
      cbk();
    } else {
      message.error(response?.msg || response?.message || "删除失败");
    }
  };

  const handleDeleteTask = async () => {
    if (!canDelete) {
      if (isOnline) {
        message.warning("任务已上线，请先下线后再删除");
        return;
      }

      if (isRunning) {
        message.warning("任务正在运行中，请先停止后再删除");
        return;
      }
    }

    confirm({
      title: intl.formatMessage({
        id: "pages.job.action.delete.confirmTitle",
        defaultMessage: "Confirm delete?",
      }),
      centered: true,
      content: (
        <span>
          {intl.formatMessage(
            {
              id: "pages.job.action.delete.confirmContent",
              defaultMessage:
                "Are you sure you want to delete the task [{name}]?",
            },
            {
              name: <span style={{ color: "orange" }}>{record?.jobName}</span>,
            }
          )}
          <br />
        </span>
      ),
      okText: intl.formatMessage({
        id: "pages.job.action.delete.okText",
        defaultMessage: "Delete",
      }),
      okType: "primary",
      okButtonProps: {
        size: "small",
        danger: true,
      },
      cancelButtonProps: {
        size: "small",
      },
      maskClosable: true,
      onOk() {
        if (record?.id) {
          doDeleteTask(record.id);
        } else {
          message.error(
            intl.formatMessage({
              id: "pages.job.message.idNotExist",
              defaultMessage: "id is not exist",
            })
          );
        }
      },
    });
  };

  const handleEdit = async () => {
    if (!canEdit) {
      if (isOnline) {
        message.warning("任务已上线，请先下线后再编辑");
        return;
      }

      if (isRunning) {
        message.warning("任务正在运行中，请先停止后再编辑");
        return;
      }
    }

    if (!record?.id) {
      message.error("任务定义ID 不存在");
      return;
    }

    const data = await linkupJobDefinitionApi.selectEditDetail(record.id);

    if (data?.code === API_SUCCESS_CODE) {
      goDetail(record.id, record);
    } else {
      message.error(data?.msg || data?.message || "获取任务详情失败");
    }
  };

  const handleMenuClick = (info: any) => {
    info.domEvent.stopPropagation();

    if (info?.key === "view") {
      ref.current?.onOpen(true, record, cbk);
      return;
    }

    if (info?.key === "edit") {
      handleEdit();
      return;
    }

    if (info?.key === "log") {
      setLogOpen(true);
      return;
    }

    if (info?.key === "delete") {
      handleDeleteTask();
    }
  };

  const yesText = intl.formatMessage({
    id: "pages.common.yes",
    defaultMessage: "Yes",
  });

  const noText = intl.formatMessage({
    id: "pages.common.no",
    defaultMessage: "No",
  });

  const menuItems = [
    {
      key: "view",
      icon: <EyeOutlined />,
      label: <span style={{ fontWeight: 500 }}>查看详情</span>,
    },
    {
      key: "edit",
      icon: <EditOutlined />,
      label: <span style={{ fontWeight: 500 }}>编辑配置</span>,
      disabled: !canEdit,
    },
    {
      type: "divider" as const,
    },
    {
      key: "log",
      icon: <FileSearchOutlined />,
      label: <span style={{ fontWeight: 500 }}>查看日志</span>,
      // disabled: !canEdit,
    },
    {
      type: "divider" as const,
    },
    {
      key: "delete",
      icon: <DeleteOutlined />,
      label: <span style={{ fontWeight: 500 }}>删除任务</span>,
      danger: true,
      disabled: !canDelete,
    },
  ];

  return (
    <>
      <Space size={6} className="whitespace-nowrap">
        {isRunning ? (
          <Popconfirm
            title={intl.formatMessage({
              id: "pages.job.action.stop.title",
              defaultMessage: "Stop Task",
            })}
            description={
              <div style={{ marginRight: 12 }}>
                {intl.formatMessage({
                  id: "pages.job.action.stop.desc",
                  defaultMessage: "Are you sure stop this job?",
                })}
              </div>
            }
            okText={yesText}
            cancelText={noText}
            onConfirm={handleStop}
          >
            <button
              type="button"
              className={dangerActionClass}
              onClick={stopPropagation}
            >
              <PauseCircleOutlined />
              停止
            </button>
          </Popconfirm>
        ) : (
          <Popconfirm
            title={intl.formatMessage({
              id: "pages.job.action.run.title",
              defaultMessage: "Run Task",
            })}
            open={canRun ? runOpen : false}
            onOpenChange={(open) => {
              if (!canRun) {
                message.warning("请先上线任务，再执行运行操作");
                return;
              }

              if (!runLoading) {
                setRunOpen(open);
              }
            }}
            okButtonProps={{ loading: runLoading }}
            description={
              <div style={{ marginRight: 12 }}>
                {intl.formatMessage({
                  id: "pages.job.action.run.desc",
                  defaultMessage: "Are you sure to run this job?",
                })}
              </div>
            }
            okText={yesText}
            cancelText={noText}
            onConfirm={async () => {
              if (!canRun) {
                message.warning("请先上线任务，再执行运行操作");
                return;
              }

              try {
                setRunLoading(true);

                const data = await linkupJobExecuteApi.execute(record?.id);

                if (data?.code === API_SUCCESS_CODE) {
                  message.success(
                    intl.formatMessage({
                      id: "pages.common.success",
                      defaultMessage: "Success",
                    })
                  );
                  cbk();
                  setRunOpen(false);
                } else {
                  message.error(data?.msg || "运行失败");
                }
              } finally {
                setRunLoading(false);
              }
            }}
          >
            <button
              type="button"
              disabled={!canRun}
              className={canRun ? primaryActionClass : disabledActionClass}
              onClick={(event) => {
                event.stopPropagation();

                if (!canRun) {
                  message.warning("请先上线任务，再执行运行操作");
                }
              }}
            >
              <PlayCircleOutlined />
              运行
            </button>
          </Popconfirm>
        )}

        {isOnline ? (
          <Popconfirm
            title="任务下线"
            description={
              <div style={{ marginRight: 12 }}>
                下线后任务将不会再被调度触发，
                <br />
                确认下线该任务吗？
              </div>
            }
            okText="确认"
            cancelText="取消"
            onConfirm={handleOffline}
          >
            <button
              type="button"
              className={secondaryActionClass}
              onClick={stopPropagation}
            >
              <CloudDownloadOutlined />
              下线
            </button>
          </Popconfirm>
        ) : (
          <Popconfirm
            title="任务上线"
            description={
              <div style={{ marginRight: 12 }}>
                上线后任务将恢复可运行状态，并同步恢复调度，
                <br />
                确认上线该任务吗？
              </div>
            }
            okText="确认"
            cancelText="取消"
            onConfirm={handleOnline}
          >
            <button
              type="button"
              className={secondaryActionClass}
              onClick={stopPropagation}
            >
              <CloudUploadOutlined />
              上线
            </button>
          </Popconfirm>
        )}

        <Dropdown
          trigger={["click"]}
          menu={{
            items: menuItems,
            onClick: handleMenuClick,
          }}
          placement="bottomLeft"
        >
          <button
            type="button"
            className={moreActionClass}
            onClick={stopPropagation}
          >
            更多
            <DownOutlined style={{ fontSize: 10 }} />
          </button>
        </Dropdown>
      </Space>

      <TaskViewModal ref={ref} />
      <RunLogDrawer
        open={logOpen}
        jobMode="BATCH"
        instanceId={record?.instanceId}
        onClose={() => setLogOpen(false)}
        title="运行日志"
        subtitle={
          record?.jobName ? `任务：${record.jobName}` : "查看任务运行输出"
        }
      />
    </>
  );
};

export default ActionColumn;

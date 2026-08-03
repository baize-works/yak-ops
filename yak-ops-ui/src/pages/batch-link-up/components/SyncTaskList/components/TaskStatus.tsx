import {
  CanceledStatusIcon,
  CreatedStatusIcon,
  FailedStatusIcon,
  IdleStatusIcon,
  LostStatusIcon,
  QueuedStatusIcon,
  RunningStatusIcon,
  SubmittedStatusIcon,
  SucceededStatusIcon,
  UnknownStatusIcon,
} from "./TaskStatusIcons";

import { Button, Popover, Tag, message } from "antd";
import React, { useMemo } from "react";

interface TaskStatusProps {
  status?: string;
  errorMessage?: string;
}

interface StatusMeta {
  label: string;
  color: string;
  icon: React.ReactNode;
  active?: boolean;
}

const STATUS_META: Record<string, StatusMeta> = {
  CREATED: {
    label: "已创建",
    color: "default",
    icon: <CreatedStatusIcon />,
    active: true,
  },

  SUBMITTED: {
    label: "提交中",
    color: "processing",
    icon: <SubmittedStatusIcon />,
    active: true,
  },

  QUEUED: {
    label: "排队中",
    color: "processing",
    icon: <QueuedStatusIcon />,
    active: true,
  },

  RUNNING: {
    label: "运行中",
    color: "processing",
    icon: <RunningStatusIcon />,
    active: true,
  },

  SUCCEEDED: {
    label: "已完成",
    color: "success",
    icon: <SucceededStatusIcon />,
  },

  FAILED: {
    label: "失败",
    color: "error",
    icon: <FailedStatusIcon />,
  },

  CANCELED: {
    label: "已取消",
    color: "default",
    icon: <CanceledStatusIcon />,
  },

  LOST: {
    label: "状态丢失",
    color: "warning",
    icon: <LostStatusIcon />,
  },
};

const LEGACY_ALIASES: Record<string, string> = {
  FINISHED: "SUCCEEDED",
  COMPLETED: "SUCCEEDED",
  CANCELLED: "CANCELED",
  PENDING: "QUEUED",
};

const normalizeStatus = (value?: string) => {
  const normalized = String(value || "")
    .trim()
    .toUpperCase();
  return LEGACY_ALIASES[normalized] || normalized;
};

const TaskStatus: React.FC<TaskStatusProps> = ({ status, errorMessage }) => {
  const normalized = normalizeStatus(status);
  const meta = useMemo<StatusMeta>(
    () =>
      STATUS_META[normalized] || {
        label: normalized || "未运行",
        color: "default",
        icon: normalized ? <UnknownStatusIcon /> : <IdleStatusIcon />,
      },
    [normalized]
  );

  const tag = (
    <Tag
      color={meta.color}
      icon={meta.icon}
      className="!m-0 inline-flex min-w-[76px] items-center justify-center !rounded-md !px-2 !py-0.5 text-xs"
    >
      &nbsp;{meta.label}
    </Tag>
  );

  if (!errorMessage || (normalized !== "FAILED" && normalized !== "LOST")) {
    return tag;
  }

  const copyError = async () => {
    try {
      await navigator.clipboard.writeText(errorMessage);
      message.success("错误信息已复制");
    } catch {
      message.error("复制失败，请手动复制");
    }
  };

  return (
    <Popover
      placement="right"
      trigger="hover"
      content={
        <div className="w-[440px]">
          <div className="max-h-[240px] overflow-auto whitespace-pre-wrap break-words rounded-md bg-[#101828] p-3 font-mono text-xs leading-5 text-[#fda29b]">
            {errorMessage}
          </div>
          <div className="mt-2 flex justify-end">
            <Button size="small" onClick={copyError}>
              复制错误
            </Button>
          </div>
        </div>
      }
    >
      <span className="inline-flex cursor-help">{tag}</span>
    </Popover>
  );
};

export default TaskStatus;

import React from 'react';

export interface StatusIconProps
  extends Omit<React.SVGProps<SVGSVGElement>, 'children'> {
  size?: number;
  title?: string;
}

const buildClassName = (...classNames: Array<string | undefined>) =>
  classNames.filter(Boolean).join(' ');

const IconShell: React.FC<
  StatusIconProps & {
    children: React.ReactNode;
  }
> = ({
  size = 16,
  title,
  className,
  children,
  viewBox = '0 0 16 16',
  ...props
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox={viewBox}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={buildClassName('shrink-0', className)}
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
      {...props}
    >
      {title && <title>{title}</title>}
      {children}
    </svg>
  );
};

/**
 * 已创建
 * 时钟 + 状态点
 */
export const CreatedStatusIcon: React.FC<StatusIconProps> = (props) => {
  return (
    <IconShell {...props}>
      <circle
        cx="8"
        cy="8"
        r="5.75"
        stroke="currentColor"
        strokeWidth="1.5"
      />

      <path
        d="M8 4.7V8L10.25 9.25"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <circle cx="12.65" cy="3.35" r="1.45" fill="currentColor" />
    </IconShell>
  );
};

/**
 * 提交中
 * 向上提交箭头 + 容器
 */
export const SubmittedStatusIcon: React.FC<StatusIconProps> = (props) => {
  return (
    <IconShell {...props}>
      <path
        d="M3 10.25V12.25C3 12.8 3.45 13.25 4 13.25H12C12.55 13.25 13 12.8 13 12.25V10.25"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <g className="animate-pulse">
        <path
          d="M8 10V2.75"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />

        <path
          d="M5.5 5.25L8 2.75L10.5 5.25"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </IconShell>
  );
};

/**
 * 排队中
 * 三个按顺序闪烁的等待点
 */
export const QueuedStatusIcon: React.FC<StatusIconProps> = (props) => {
  return (
    <IconShell {...props}>
      <rect
        x="1.75"
        y="4"
        width="12.5"
        height="8"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.5"
      />

      <circle
        cx="5"
        cy="8"
        r="1"
        fill="currentColor"
        className="animate-pulse"
        style={{ animationDelay: '0ms' }}
      />

      <circle
        cx="8"
        cy="8"
        r="1"
        fill="currentColor"
        className="animate-pulse"
        style={{ animationDelay: '180ms' }}
      />

      <circle
        cx="11"
        cy="8"
        r="1"
        fill="currentColor"
        className="animate-pulse"
        style={{ animationDelay: '360ms' }}
      />
    </IconShell>
  );
};

/**
 * 运行中
 * 自定义旋转轨道
 */
export const RunningStatusIcon: React.FC<StatusIconProps> = ({
  className,
  ...props
}) => {
  return (
    <IconShell {...props}>
      <circle
        cx="8"
        cy="8"
        r="5.75"
        stroke="currentColor"
        strokeWidth="1.5"
        opacity="0.22"
      />

      <g
        className={buildClassName(
          'origin-center animate-spin',
          className,
        )}
      >
        <path
          d="M8 2.25C10.3 2.25 12.35 3.62 13.25 5.7"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />

        <path
          d="M13.25 5.7L13.45 3.45"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />

        <path
          d="M13.25 5.7L11.15 5.05"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </g>

      <circle cx="8" cy="8" r="1.45" fill="currentColor" />
    </IconShell>
  );
};

/**
 * 已完成
 * 八边形状态徽章 + 对勾
 */
export const SucceededStatusIcon: React.FC<StatusIconProps> = (props) => {
  return (
    <IconShell {...props}>
      <path
        d="M5.2 1.75H10.8L14.25 5.2V10.8L10.8 14.25H5.2L1.75 10.8V5.2L5.2 1.75Z"
        fill="currentColor"
        opacity="0.16"
      />

      <path
        d="M5.2 1.75H10.8L14.25 5.2V10.8L10.8 14.25H5.2L1.75 10.8V5.2L5.2 1.75Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />

      <path
        d="M4.75 8.15L7 10.4L11.45 5.85"
        stroke="currentColor"
        strokeWidth="1.65"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </IconShell>
  );
};

/**
 * 失败
 * 自定义故障徽章 + X
 */
export const FailedStatusIcon: React.FC<StatusIconProps> = (props) => {
  return (
    <IconShell {...props}>
      <path
        d="M5.2 1.75H10.8L14.25 5.2V10.8L10.8 14.25H5.2L1.75 10.8V5.2L5.2 1.75Z"
        fill="currentColor"
        opacity="0.14"
      />

      <path
        d="M5.2 1.75H10.8L14.25 5.2V10.8L10.8 14.25H5.2L1.75 10.8V5.2L5.2 1.75Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />

      <path
        d="M5.6 5.6L10.4 10.4M10.4 5.6L5.6 10.4"
        stroke="currentColor"
        strokeWidth="1.65"
        strokeLinecap="round"
      />
    </IconShell>
  );
};

/**
 * 已取消
 * 方形停止容器 + 横线
 */
export const CanceledStatusIcon: React.FC<StatusIconProps> = (props) => {
  return (
    <IconShell {...props}>
      <rect
        x="2.25"
        y="2.25"
        width="11.5"
        height="11.5"
        rx="3"
        fill="currentColor"
        opacity="0.12"
      />

      <rect
        x="2.25"
        y="2.25"
        width="11.5"
        height="11.5"
        rx="3"
        stroke="currentColor"
        strokeWidth="1.5"
      />

      <path
        d="M5 8H11"
        stroke="currentColor"
        strokeWidth="1.65"
        strokeLinecap="round"
      />
    </IconShell>
  );
};

/**
 * 已暂停
 * 暂停按钮
 */
export const PausedStatusIcon: React.FC<StatusIconProps> = (props) => {
  return (
    <IconShell {...props}>
      <rect
        x="2.25"
        y="2.25"
        width="11.5"
        height="11.5"
        rx="3"
        fill="currentColor"
        opacity="0.12"
      />

      <rect
        x="2.25"
        y="2.25"
        width="11.5"
        height="11.5"
        rx="3"
        stroke="currentColor"
        strokeWidth="1.5"
      />

      <rect x="5.25" y="4.75" width="1.8" height="6.5" rx="0.6" fill="currentColor" />
      <rect x="8.95" y="4.75" width="1.8" height="6.5" rx="0.6" fill="currentColor" />
    </IconShell>
  );
};

/**
 * 状态丢失
 * 断开的链路 + 告警点
 */
export const LostStatusIcon: React.FC<StatusIconProps> = (props) => {
  return (
    <IconShell {...props}>
      <path
        d="M5.75 10.25L4.55 11.45C3.72 12.28 2.38 12.28 1.55 11.45C0.72 10.62 0.72 9.28 1.55 8.45L4.45 5.55C5.28 4.72 6.62 4.72 7.45 5.55"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />

      <path
        d="M10.25 5.75L11.45 4.55C12.28 3.72 13.62 3.72 14.45 4.55C15.28 5.38 15.28 6.72 14.45 7.55L11.55 10.45C10.72 11.28 9.38 11.28 8.55 10.45"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />

      <path
        d="M5.65 7.05L4.25 5.65M10.35 8.95L11.75 10.35"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />

      <g className="animate-pulse">
        <circle cx="12.75" cy="2.75" r="2.25" fill="currentColor" />

        <path
          d="M12.75 1.55V2.9"
          stroke="white"
          strokeWidth="1"
          strokeLinecap="round"
        />

        <circle cx="12.75" cy="3.75" r="0.45" fill="white" />
      </g>
    </IconShell>
  );
};

/**
 * 未运行
 */
export const IdleStatusIcon: React.FC<StatusIconProps> = (props) => {
  return (
    <IconShell {...props}>
      <circle
        cx="8"
        cy="8"
        r="5.75"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeDasharray="2.5 2"
      />

      <path
        d="M6.75 5.25L10.75 8L6.75 10.75V5.25Z"
        fill="currentColor"
        opacity="0.75"
      />
    </IconShell>
  );
};

/**
 * 未知状态
 */
export const UnknownStatusIcon: React.FC<StatusIconProps> = (props) => {
  return (
    <IconShell {...props}>
      <path
        d="M5.2 1.75H10.8L14.25 5.2V10.8L10.8 14.25H5.2L1.75 10.8V5.2L5.2 1.75Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />

      <path
        d="M6.35 6.15C6.5 5.2 7.15 4.6 8.1 4.6C9.15 4.6 9.85 5.2 9.85 6.1C9.85 6.75 9.5 7.1 8.85 7.55C8.2 8 8 8.35 8 9"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinecap="round"
      />

      <circle cx="8" cy="11.35" r="0.8" fill="currentColor" />
    </IconShell>
  );
};

export type TaskStatusIconName =
  | 'CREATED'
  | 'SUBMITTED'
  | 'QUEUED'
  | 'RUNNING'
  | 'SUCCEEDED'
  | 'FAILED'
  | 'CANCELED'
  | 'PAUSED'
  | 'LOST'
  | 'IDLE'
  | 'UNKNOWN';

export const STATUS_ICON_COMPONENTS: Record<
  TaskStatusIconName,
  React.FC<StatusIconProps>
> = {
  CREATED: CreatedStatusIcon,
  SUBMITTED: SubmittedStatusIcon,
  QUEUED: QueuedStatusIcon,
  RUNNING: RunningStatusIcon,
  SUCCEEDED: SucceededStatusIcon,
  FAILED: FailedStatusIcon,
  CANCELED: CanceledStatusIcon,
  PAUSED: PausedStatusIcon,
  LOST: LostStatusIcon,
  IDLE: IdleStatusIcon,
  UNKNOWN: UnknownStatusIcon,
};

interface TaskStatusIconProps extends StatusIconProps {
  status?: string;
}

const STATUS_ALIASES: Record<string, TaskStatusIconName> = {
  FINISHED: 'SUCCEEDED',
  COMPLETED: 'SUCCEEDED',
  SUCCESS: 'SUCCEEDED',

  CANCELLED: 'CANCELED',

  PENDING: 'QUEUED',
  WAITING: 'QUEUED',

  STOPPED: 'CANCELED',

  NOT_STARTED: 'IDLE',
  NONE: 'IDLE',
};

/**
 * 可以直接传后端状态值的统一入口
 */
export const TaskStatusIcon: React.FC<TaskStatusIconProps> = ({
  status,
  ...props
}) => {
  const normalized = String(status || '')
    .trim()
    .toUpperCase();

  const iconName: TaskStatusIconName = !normalized
    ? 'IDLE'
    : STATUS_ALIASES[normalized] ||
      (normalized in STATUS_ICON_COMPONENTS
        ? (normalized as TaskStatusIconName)
        : 'UNKNOWN');

  const Icon = STATUS_ICON_COMPONENTS[iconName];

  return <Icon {...props} />;
};

export default TaskStatusIcon;
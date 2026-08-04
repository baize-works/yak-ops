import { Empty, Tag } from 'antd';
import {
  AlertCircle,
  CheckCircle2,
  LoaderCircle,
  Square,
} from 'lucide-react';
import type { ExecutionSession } from '../types';

export const formatExecutionDateTime = (value?: string) => {
  if (!value) return '-';
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(new Date(value));
};

const formatDuration = (durationMs?: number) => {
  if (durationMs === undefined) return '-';
  if (durationMs < 1000) return `${durationMs} ms`;
  return `${(durationMs / 1000).toFixed(2)} s`;
};

export const ExecutionStatusTag = ({
  session,
}: {
  session: ExecutionSession;
}) => {
  const running = session.status === 'RUNNING';
  const success = session.status === 'SUCCESS';
  const stopped = session.status === 'STOPPED';

  return (
    <Tag
      bordered={false}
      icon={
        running ? (
          <LoaderCircle size={12} className="animate-spin" />
        ) : success ? (
          <CheckCircle2 size={12} />
        ) : stopped ? (
          <Square size={12} />
        ) : (
          <AlertCircle size={12} />
        )
      }
      color={
        running
          ? 'processing'
          : success
            ? 'success'
            : stopped
              ? 'default'
              : 'error'
      }
      className="!m-0"
    >
      {running
        ? '运行中'
        : success
          ? '运行成功'
          : stopped
            ? '已停止'
            : '运行失败'}
    </Tag>
  );
};

export const ExecutionSessionSummary = ({
  session,
}: {
  session: ExecutionSession;
}) => (
  <div className="grid shrink-0 grid-cols-[auto_repeat(4,minmax(120px,1fr))] items-center gap-4 border-b border-[#eceef0] bg-[#fafbfc] px-3 py-2 text-[11px]">
    <ExecutionStatusTag session={session} />
    <div>
      <div className="text-[rgba(22,24,35,0.38)]">执行 ID</div>
      <div className="mt-0.5 truncate font-mono text-[rgba(22,24,35,0.7)]">
        {session.id}
      </div>
    </div>
    <div>
      <div className="text-[rgba(22,24,35,0.38)]">开始时间</div>
      <div className="mt-0.5 text-[rgba(22,24,35,0.7)]">
        {formatExecutionDateTime(session.startedAt)}
      </div>
    </div>
    <div>
      <div className="text-[rgba(22,24,35,0.38)]">结束时间</div>
      <div className="mt-0.5 text-[rgba(22,24,35,0.7)]">
        {formatExecutionDateTime(session.finishedAt)}
      </div>
    </div>
    <div>
      <div className="text-[rgba(22,24,35,0.38)]">运行耗时</div>
      <div className="mt-0.5 text-[rgba(22,24,35,0.7)]">
        {formatDuration(session.durationMs)}
      </div>
    </div>
  </div>
);

export const ExecutionEmptyPanel = ({
  description,
}: {
  description: string;
}) => (
  <div className="flex h-full items-center justify-center bg-white">
    <Empty
      image={Empty.PRESENTED_IMAGE_SIMPLE}
      description={
        <span className="text-[12px] text-[rgba(22,24,35,0.42)]">
          {description}
        </span>
      }
    />
  </div>
);

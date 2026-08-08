import {
  getWorkflowInstances,
  type WorkflowInstance,
  type WorkflowNodeInstance,
} from '@/services/workflow';
import { Spin } from 'antd';
import dayjs from 'dayjs';
import { RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

interface WorkflowNodeInspectorLastRunProps {
  definitionId: string;
  nodeId: string;
}

const STATUS_META: Record<string, { label: string; className: string; dotClassName: string }> = {
  SUCCESS: {
    label: 'SUCCESS',
    className: 'border-[#86d9a8] bg-[linear-gradient(110deg,#effcf4,#e7fbf2)] text-[#138a4b]',
    dotClassName: 'bg-[#22c55e]',
  },
  SUCCESS_WITH_WARNINGS: {
    label: 'SUCCESS WITH WARNINGS',
    className: 'border-[#f4d68f] bg-[#fffaf0] text-[#b7791f]',
    dotClassName: 'bg-[#f59e0b]',
  },
  RUNNING: {
    label: 'RUNNING',
    className: 'border-[#a9c7ff] bg-[#f2f7ff] text-[#2563eb]',
    dotClassName: 'bg-[#3b82f6]',
  },
  FAILED: {
    label: 'FAILED',
    className: 'border-[#ffc1ce] bg-[#fff4f6] text-[#d92d4a]',
    dotClassName: 'bg-[#fe2c55]',
  },
  CANCELED: {
    label: 'CANCELED',
    className: 'border-[#dadde3] bg-[#f7f7f8] text-[#667085]',
    dotClassName: 'bg-[#98a2b3]',
  },
  TIMED_OUT: {
    label: 'TIMED OUT',
    className: 'border-[#ffc1ce] bg-[#fff4f6] text-[#d92d4a]',
    dotClassName: 'bg-[#fe2c55]',
  },
};

const jsonText = (value: unknown) => JSON.stringify(value ?? {}, null, 2);

const formatElapsed = (node?: WorkflowNodeInstance) => {
  const attempt = node?.attempts?.[node.attempts.length - 1];
  if (!attempt?.startedAt) return '--';
  const end = attempt.endedAt ? dayjs(attempt.endedAt) : dayjs();
  const duration = Math.max(0, end.diff(dayjs(attempt.startedAt), 'millisecond'));
  if (duration < 1000) return `${duration}ms`;
  return `${(duration / 1000).toFixed(3)}s`;
};

const JsonBlock = ({ title, value }: { title: string; value: unknown }) => (
  <section>
    <div className="mb-2 text-[12px] font-semibold text-[#344054]">{title}</div>
    <div className="max-h-[210px] overflow-auto rounded-xl bg-[#f5f6f7] px-3 py-3">
      <pre className="m-0 whitespace-pre-wrap break-words font-mono text-[11px] leading-[18px] text-[#344054]">
        {jsonText(value)}
      </pre>
    </div>
  </section>
);

const MetaRow = ({ label, value }: { label: string; value?: string | number }) => (
  <div className="flex min-h-7 items-center justify-between gap-4 text-[11px]">
    <span className="shrink-0 text-[rgba(22,24,35,.42)]">{label}</span>
    <span className="min-w-0 truncate text-right font-medium text-[#475467]">{value ?? '--'}</span>
  </div>
);

const WorkflowNodeInspectorLastRun = ({
  definitionId,
  nodeId,
}: WorkflowNodeInspectorLastRunProps) => {
  const [loading, setLoading] = useState(false);
  const [instance, setInstance] = useState<WorkflowInstance>();
  const [nodeRun, setNodeRun] = useState<WorkflowNodeInstance>();
  const [loadError, setLoadError] = useState('');

  const load = useCallback(async () => {
    if (!definitionId || !nodeId) return;
    setLoading(true);
    setLoadError('');
    try {
      const instances = (await getWorkflowInstances()) || [];
      const latest = instances
        .filter((item) => item.definitionId === definitionId)
        .sort((left, right) => dayjs(right.startedAt).valueOf() - dayjs(left.startedAt).valueOf())
        .find((item) => item.nodes?.some((node) => node.id === nodeId));
      setInstance(latest);
      setNodeRun(latest?.nodes?.find((node) => node.id === nodeId));
    } catch (error) {
      setInstance(undefined);
      setNodeRun(undefined);
      setLoadError(error instanceof Error ? error.message : '上次运行加载失败');
    } finally {
      setLoading(false);
    }
  }, [definitionId, nodeId]);

  useEffect(() => {
    void load();
  }, [load]);

  const statusMeta = useMemo(() => {
    const status = nodeRun?.status || '';
    return STATUS_META[status] || {
      label: status || '--',
      className: 'border-[#e4e7ec] bg-[#f7f7f8] text-[#667085]',
      dotClassName: 'bg-[#98a2b3]',
    };
  }, [nodeRun?.status]);

  if (loading) {
    return (
      <div className="flex h-full min-h-[360px] items-center justify-center">
        <Spin size="small" />
      </div>
    );
  }

  if (!nodeRun) {
    return (
      <div className="flex h-full min-h-[360px] flex-col items-center justify-center px-8 text-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f5f6f7] text-[#98a2b3]">
          <RefreshCw size={17} />
        </div>
        <div className="mt-3 text-[13px] font-semibold text-[#344054]">暂无运行记录</div>
        <div className="mt-1 text-[11px] leading-5 text-[rgba(22,24,35,.42)]">
          {loadError || '运行过工作流后，这里会展示该节点最近一次真实的输入、输出和执行状态。'}
        </div>
        <button
          type="button"
          className="mt-4 rounded-lg border border-[#e4e7ec] bg-white px-3 py-1.5 text-[11px] font-medium text-[#475467] shadow-sm hover:bg-[#f7f7f8]"
          onClick={() => void load()}
        >
          重新加载
        </button>
      </div>
    );
  }

  const attempt = nodeRun.attempts?.[nodeRun.attempts.length - 1];

  return (
    <div className="space-y-5 px-4 pb-6 pt-4">
      <div className="flex items-center justify-between">
        <div className="text-[12px] font-semibold text-[#344054]">最近一次运行</div>
        <button
          type="button"
          className="flex h-7 w-7 items-center justify-center rounded-md border-0 bg-transparent text-[#98a2b3] hover:bg-[#f2f4f7] hover:text-[#475467]"
          onClick={() => void load()}
          aria-label="刷新上次运行"
        >
          <RefreshCw size={14} />
        </button>
      </div>

      <div className={`grid grid-cols-3 overflow-hidden rounded-xl border ${statusMeta.className}`}>
        <div className="px-3 py-2.5">
          <div className="text-[9px] text-current opacity-60">状态</div>
          <div className="mt-1 flex items-center gap-1.5 text-[11px] font-semibold">
            <span className={`h-1.5 w-1.5 rounded-full ${statusMeta.dotClassName}`} />
            {statusMeta.label}
          </div>
        </div>
        <div className="border-l border-current/10 px-3 py-2.5">
          <div className="text-[9px] text-current opacity-60">运行时间</div>
          <div className="mt-1 text-[11px] font-semibold">{formatElapsed(nodeRun)}</div>
        </div>
        <div className="border-l border-current/10 px-3 py-2.5">
          <div className="text-[9px] text-current opacity-60">Attempt</div>
          <div className="mt-1 text-[11px] font-semibold">{nodeRun.attemptCount || nodeRun.attempts?.length || 0}</div>
        </div>
      </div>

      <JsonBlock title="输入" value={nodeRun.input} />
      <JsonBlock title="输出" value={nodeRun.output} />

      {(nodeRun.errorMessage || nodeRun.failureReason) ? (
        <section>
          <div className="mb-2 text-[12px] font-semibold text-[#344054]">错误信息</div>
          <div className="rounded-xl border border-[#ffc7d2] bg-[#fff5f7] px-3 py-2.5 text-[11px] leading-5 text-[#b4233f]">
            {nodeRun.errorMessage || nodeRun.failureReason}
          </div>
        </section>
      ) : null}

      <section className="border-t border-[#f0f1f3] pt-4">
        <div className="mb-2 text-[12px] font-semibold text-[#344054]">元数据</div>
        <MetaRow label="节点状态" value={nodeRun.status} />
        <MetaRow label="工作流状态" value={instance?.status} />
        <MetaRow label="当前 Attempt" value={nodeRun.currentAttemptNumber || attempt?.attemptNumber} />
        <MetaRow label="开始时间" value={attempt?.startedAt ? dayjs(attempt.startedAt).format('YYYY-MM-DD HH:mm:ss') : '--'} />
        <MetaRow label="结束时间" value={attempt?.endedAt ? dayjs(attempt.endedAt).format('YYYY-MM-DD HH:mm:ss') : '--'} />
      </section>
    </div>
  );
};

export default WorkflowNodeInspectorLastRun;

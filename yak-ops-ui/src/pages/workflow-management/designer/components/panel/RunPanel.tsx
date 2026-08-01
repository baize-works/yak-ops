import { Input, Progress } from 'antd';
import {
  CheckCircle2,
  Circle,
  Clock3,
  Play,
  RotateCw,
  Square,
  X,
  XCircle,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type {
  WorkflowFlowNode,
  WorkflowNodeData,
  WorkflowRunLog,
} from '../../../types';
import {
  PanelTitle,
  panelContentClass,
  panelHeaderClass,
  panelIconButtonClass,
  panelShellClass,
} from './shared';

interface RunPanelProps {
  nodes: WorkflowFlowNode[];
  onStatusChange: (
    nodeId: string,
    status: WorkflowNodeData['runningStatus'],
  ) => void;
  onClose: () => void;
}

const sleep = (milliseconds: number) =>
  new Promise<void>((resolve) => window.setTimeout(resolve, milliseconds));

const RunPanel = ({ nodes, onStatusChange, onClose }: RunPanelProps) => {
  const [input, setInput] = useState(
    '{\n  "query": "介绍一下 Yak Ops 工作流"\n}',
  );
  const [running, setRunning] = useState(false);
  const [logs, setLogs] = useState<WorkflowRunLog[]>([]);
  const stopRef = useRef(false);

  useEffect(
    () => () => {
      stopRef.current = true;
    },
    [],
  );

  const progress = useMemo(() => {
    if (!logs.length) return 0;
    const completed = logs.filter((item) =>
      ['success', 'failed'].includes(item.status),
    ).length;
    return Math.round((completed / logs.length) * 100);
  }, [logs]);

  const run = async () => {
    stopRef.current = false;
    setRunning(true);
    const executableNodes = nodes.filter(
      (node) => node.data.nodeType !== 'NOTE' && node.data.enabled,
    );
    const nextLogs: WorkflowRunLog[] = executableNodes.map((node) => ({
      id: `run_${node.id}_${Date.now()}`,
      nodeId: node.id,
      nodeTitle: node.data.title,
      status: 'waiting',
    }));
    setLogs(nextLogs);
    executableNodes.forEach((node) => onStatusChange(node.id, 'idle'));

    for (const node of executableNodes) {
      if (stopRef.current) break;
      const startedAt = new Date().toISOString();
      onStatusChange(node.id, 'running');
      setLogs((current) =>
        current.map((item) =>
          item.nodeId === node.id
            ? { ...item, status: 'running', startedAt }
            : item,
        ),
      );
      const duration = 420 + Math.round(Math.random() * 680);
      await sleep(duration);
      if (stopRef.current) break;
      const failed =
        node.data.nodeType === 'HTTP' &&
        !String(node.data.config.url || '').trim();
      onStatusChange(node.id, failed ? 'failed' : 'success');
      setLogs((current) =>
        current.map((item) =>
          item.nodeId === node.id
            ? {
                ...item,
                status: failed ? 'failed' : 'success',
                duration,
                message: failed
                  ? '前端模拟：HTTP 节点尚未配置 URL'
                  : '前端模拟执行成功',
              }
            : item,
        ),
      );
      if (failed) break;
    }
    setRunning(false);
  };

  const stop = () => {
    stopRef.current = true;
    setRunning(false);
    setLogs((current) =>
      current.map((item) =>
        item.status === 'running'
          ? { ...item, status: 'failed', message: '已停止' }
          : item,
      ),
    );
  };

  const statusIcon = (status: WorkflowRunLog['status']) => {
    if (status === 'running')
      return <RotateCw size={15} className="animate-spin" />;
    if (status === 'success') return <CheckCircle2 size={15} />;
    if (status === 'failed') return <XCircle size={15} />;
    return <Circle size={15} />;
  };

  const statusClass = (status: WorkflowRunLog['status']) => {
    if (status === 'running')
      return 'border-[#c7d7fe] bg-[var(--yak-brand-color-soft)] text-[var(--yak-brand-color)]';
    if (status === 'success')
      return 'border-[#abefc6] bg-[#f6fef9] text-[#039855]';
    if (status === 'failed')
      return 'border-[#fecdca] bg-[#fff5f4] text-[#d92d20]';
    return 'border-[#eaecf0] bg-[#fcfcfd] text-[#98a2b3]';
  };

  return (
    <aside className={[panelShellClass, 'w-[460px]'].join(' ')}>
      <header className={panelHeaderClass}>
        <PanelTitle
          title="调试与预览"
          description="仅模拟前端流程，不调用后端执行接口"
        />
        <button type="button" className={panelIconButtonClass} onClick={onClose}>
          <X size={17} />
        </button>
      </header>

      <div className={[panelContentClass, 'p-3.5'].join(' ')}>
        <section className="mb-3.5 rounded-[10px] border border-[#e4e7ec] bg-white p-3">
          <h3 className="mb-2.5 text-[11px] text-[#344054]">输入变量</h3>
          <Input.TextArea
            rows={8}
            className="font-mono text-[10px] leading-[17px] !bg-[#101828] !text-[#e4e7ec]"
            value={input}
            onChange={(event) => setInput(event.target.value)}
          />
          <div className="mt-2.5 flex justify-end">
            {running ? (
              <button
                type="button"
                className="inline-flex h-[30px] items-center gap-1.5 rounded-md border-0 bg-[#d92d20] px-2.5 text-[9px] text-white"
                onClick={stop}
              >
                <Square size={14} /> 停止
              </button>
            ) : (
              <button
                type="button"
                className="inline-flex h-[30px] items-center gap-1.5 rounded-md border-0 bg-[var(--yak-brand-color)] px-2.5 text-[9px] text-white"
                onClick={() => void run()}
              >
                <Play size={14} /> 开始运行
              </button>
            )}
          </div>
        </section>

        <section className="mb-3.5 rounded-[10px] border border-[#e4e7ec] bg-white p-3">
          <div className="flex items-center justify-between">
            <h3 className="mb-2.5 text-[11px] text-[#344054]">运行过程</h3>
            <span className="text-[9px] text-[#667085]">{progress}%</span>
          </div>
          <Progress percent={progress} showInfo={false} size="small" />
          {logs.length ? (
            <div className="mt-2.5 flex flex-col gap-1.5">
              {logs.map((log) => (
                <article
                  key={log.id}
                  className={[
                    'grid grid-cols-[20px_minmax(0,1fr)_auto] items-center gap-2 rounded-lg border p-2',
                    statusClass(log.status),
                  ].join(' ')}
                >
                  <span>{statusIcon(log.status)}</span>
                  <div>
                    <strong className="block text-[9px] text-[#344054]">
                      {log.nodeTitle}
                    </strong>
                    <small className="mt-0.5 block text-[8px] text-[#667085]">
                      {log.message ||
                        (log.status === 'waiting' ? '等待执行' : '正在运行')}
                    </small>
                  </div>
                  {log.duration && (
                    <i className="inline-flex items-center gap-1 text-[8px] not-italic text-[#98a2b3]">
                      <Clock3 size={11} /> {log.duration}ms
                    </i>
                  )}
                </article>
              ))}
            </div>
          ) : (
            <div className="flex min-h-[220px] flex-col items-center justify-center text-[#98a2b3]">
              <Play size={22} />
              <span className="mt-2 text-[9px]">
                点击开始运行查看节点执行过程。
              </span>
            </div>
          )}
        </section>
      </div>
    </aside>
  );
};

export default RunPanel;

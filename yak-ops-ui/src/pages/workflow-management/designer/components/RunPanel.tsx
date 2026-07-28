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
  WorkflowRunLog,
  WorkflowNodeData,
} from '../../types';

interface RunPanelProps {
  nodes: WorkflowFlowNode[];
  onStatusChange: (nodeId: string, status: WorkflowNodeData['runningStatus']) => void;
  onClose: () => void;
}

const sleep = (milliseconds: number) =>
  new Promise<void>((resolve) => window.setTimeout(resolve, milliseconds));

const RunPanel = ({ nodes, onStatusChange, onClose }: RunPanelProps) => {
  const [input, setInput] = useState('{\n  "query": "介绍一下 Yak Ops 工作流"\n}');
  const [running, setRunning] = useState(false);
  const [logs, setLogs] = useState<WorkflowRunLog[]>([]);
  const stopRef = useRef(false);

  useEffect(() => () => { stopRef.current = true; }, []);

  const progress = useMemo(() => {
    if (!logs.length) return 0;
    const completed = logs.filter((item) => ['success', 'failed'].includes(item.status)).length;
    return Math.round((completed / logs.length) * 100);
  }, [logs]);

  const run = async () => {
    stopRef.current = false;
    setRunning(true);
    const executableNodes = nodes.filter((node) => node.data.nodeType !== 'NOTE' && node.data.enabled);
    const nextLogs: WorkflowRunLog[] = executableNodes.map((node) => ({
      id: `run_${node.id}_${Date.now()}`,
      nodeId: node.id,
      nodeTitle: node.data.title,
      status: 'waiting',
    }));
    setLogs(nextLogs);
    executableNodes.forEach((node) => onStatusChange(node.id, 'idle'));

    for (let index = 0; index < executableNodes.length; index += 1) {
      if (stopRef.current) break;
      const node = executableNodes[index];
      const startedAt = new Date().toISOString();
      onStatusChange(node.id, 'running');
      setLogs((current) => current.map((item) =>
        item.nodeId === node.id ? { ...item, status: 'running', startedAt } : item,
      ));
      const duration = 420 + Math.round(Math.random() * 680);
      await sleep(duration);
      if (stopRef.current) break;
      const failed = node.data.nodeType === 'HTTP' && !String(node.data.config.url || '').trim();
      onStatusChange(node.id, failed ? 'failed' : 'success');
      setLogs((current) => current.map((item) =>
        item.nodeId === node.id
          ? {
              ...item,
              status: failed ? 'failed' : 'success',
              duration,
              message: failed ? '前端模拟：HTTP 节点尚未配置 URL' : '前端模拟执行成功',
            }
          : item,
      ));
      if (failed) break;
    }
    setRunning(false);
  };

  const stop = () => {
    stopRef.current = true;
    setRunning(false);
    setLogs((current) => current.map((item) =>
      item.status === 'running' ? { ...item, status: 'failed', message: '已停止' } : item,
    ));
  };

  const statusIcon = (status: WorkflowRunLog['status']) => {
    if (status === 'running') return <RotateCw size={15} className="is-spinning" />;
    if (status === 'success') return <CheckCircle2 size={15} />;
    if (status === 'failed') return <XCircle size={15} />;
    return <Circle size={15} />;
  };

  return (
    <aside className="dify-run-panel">
      <header>
        <div>
          <strong>调试与预览</strong>
          <span>仅模拟前端流程，不调用后端执行接口</span>
        </div>
        <button type="button" onClick={onClose}><X size={17} /></button>
      </header>

      <div className="dify-run-panel__body">
        <section>
          <h3>输入变量</h3>
          <Input.TextArea
            rows={8}
            className="is-code"
            value={input}
            onChange={(event) => setInput(event.target.value)}
          />
          <div className="dify-run-panel__actions">
            {running ? (
              <button type="button" className="is-stop" onClick={stop}><Square size={14} /> 停止</button>
            ) : (
              <button type="button" onClick={() => void run()}><Play size={14} /> 开始运行</button>
            )}
          </div>
        </section>

        <section>
          <div className="dify-run-panel__progress-title">
            <h3>运行过程</h3>
            <span>{progress}%</span>
          </div>
          <Progress percent={progress} showInfo={false} size="small" />
          {logs.length ? (
            <div className="dify-run-log-list">
              {logs.map((log) => (
                <article key={log.id} className={`is-${log.status}`}>
                  <span>{statusIcon(log.status)}</span>
                  <div>
                    <strong>{log.nodeTitle}</strong>
                    <small>{log.message || (log.status === 'waiting' ? '等待执行' : '正在运行')}</small>
                  </div>
                  {log.duration && <i><Clock3 size={11} /> {log.duration}ms</i>}
                </article>
              ))}
            </div>
          ) : (
            <div className="dify-run-panel__empty">
              <Play size={22} />
              <span>点击开始运行查看节点执行过程。</span>
            </div>
          )}
        </section>
      </div>
    </aside>
  );
};

export default RunPanel;

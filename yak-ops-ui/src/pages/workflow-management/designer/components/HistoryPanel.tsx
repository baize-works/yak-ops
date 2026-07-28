import dayjs from 'dayjs';
import { Clock3, History, RotateCcw, X } from 'lucide-react';
import type { WorkflowSnapshot } from '../../types';

interface HistoryPanelProps {
  snapshots: WorkflowSnapshot[];
  onRestore: (snapshot: WorkflowSnapshot) => void;
  onClose: () => void;
}

const HistoryPanel = ({ snapshots, onRestore, onClose }: HistoryPanelProps) => (
  <aside className="dify-workspace-panel">
    <header>
      <div>
        <strong>版本历史</strong>
        <span>保存草稿时自动创建本地快照</span>
      </div>
      <button type="button" onClick={onClose}><X size={17} /></button>
    </header>
    <div className="dify-workspace-panel__content">
      {snapshots.length ? (
        <div className="dify-history-list">
          {snapshots.map((snapshot, index) => (
            <article key={snapshot.id}>
              <span className="dify-history-list__icon"><History size={16} /></span>
              <div>
                <strong>{snapshot.name}</strong>
                <span><Clock3 size={12} /> {dayjs(snapshot.createdAt).format('YYYY-MM-DD HH:mm:ss')}</span>
                <small>{snapshot.nodes.length} 个节点 · {snapshot.edges.length} 条连线</small>
              </div>
              <button type="button" onClick={() => onRestore(snapshot)}>
                <RotateCcw size={14} /> 恢复
              </button>
              {index === 0 && <i>最新</i>}
            </article>
          ))}
        </div>
      ) : (
        <div className="dify-history-empty">
          <History size={26} />
          <strong>还没有历史快照</strong>
          <span>保存工作流后会在这里保留前端快照。</span>
        </div>
      )}
    </div>
  </aside>
);

export default HistoryPanel;

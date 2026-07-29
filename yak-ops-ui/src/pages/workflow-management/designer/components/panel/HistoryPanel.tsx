import dayjs from 'dayjs';
import { Clock3, History, RotateCcw, X } from 'lucide-react';
import type { WorkflowSnapshot } from '../../../types';
import {
  PanelTitle,
  panelContentClass,
  panelHeaderClass,
  panelIconButtonClass,
  panelShellClass,
} from './shared';

interface HistoryPanelProps {
  snapshots: WorkflowSnapshot[];
  onRestore: (snapshot: WorkflowSnapshot) => void;
  onClose: () => void;
}

const HistoryPanel = ({ snapshots, onRestore, onClose }: HistoryPanelProps) => (
  <aside className={panelShellClass}>
    <header className={panelHeaderClass}>
      <PanelTitle title="版本历史" description="保存草稿时自动创建本地快照" />
      <button type="button" className={panelIconButtonClass} onClick={onClose}>
        <X size={17} />
      </button>
    </header>
    <div className={[panelContentClass, 'p-3.5'].join(' ')}>
      {snapshots.length ? (
        <div className="flex flex-col gap-2">
          {snapshots.map((snapshot, index) => (
            <article
              key={snapshot.id}
              className="relative grid grid-cols-[30px_minmax(0,1fr)_auto] items-center gap-2 rounded-lg border border-[#e4e7ec] bg-white p-2.5"
            >
              <span className="flex h-[29px] w-[29px] items-center justify-center rounded-lg bg-[#f1f0ff] text-[#5d5fef]">
                <History size={16} />
              </span>
              <div>
                <strong className="block text-[10px] text-[#344054]">
                  {snapshot.name}
                </strong>
                <span className="mt-1 flex items-center gap-1 text-[8px] text-[#667085]">
                  <Clock3 size={12} />{' '}
                  {dayjs(snapshot.createdAt).format('YYYY-MM-DD HH:mm:ss')}
                </span>
                <small className="mt-1 block text-[8px] text-[#98a2b3]">
                  {snapshot.nodes.length} 个节点 · {snapshot.edges.length} 条连线
                </small>
              </div>
              <button
                type="button"
                className="inline-flex h-[27px] items-center gap-1 rounded-md border border-[#d0d5dd] bg-white px-2 text-[8px] text-[#475467] hover:bg-[#f9fafb]"
                onClick={() => onRestore(snapshot)}
              >
                <RotateCcw size={14} /> 恢复
              </button>
              {index === 0 && (
                <i className="absolute right-2 top-1.5 text-[7px] not-italic text-[#12b76a]">
                  最新
                </i>
              )}
            </article>
          ))}
        </div>
      ) : (
        <div className="flex min-h-[240px] flex-col items-center justify-center text-[#98a2b3]">
          <History size={26} />
          <strong className="mt-2.5 text-[11px] text-[#475467]">
            还没有历史快照
          </strong>
          <span className="mt-1 text-[9px]">
            保存工作流后会在这里保留前端快照。
          </span>
        </div>
      )}
    </div>
  </aside>
);

export default HistoryPanel;

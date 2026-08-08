import type { WorkflowTaskDefinition } from '@/services/workflow';
import { Empty, Spin } from 'antd';
import { Database } from 'lucide-react';
import type { DragEvent } from 'react';

interface WorkflowTaskLibraryProps {
  tasks: WorkflowTaskDefinition[];
  loading: boolean;
  locked: boolean;
  onDragStart: (event: DragEvent<HTMLDivElement>, task: WorkflowTaskDefinition) => void;
}

const WorkflowTaskLibrary = ({ tasks, loading, locked, onDragStart }: WorkflowTaskLibraryProps) => (
  <aside className="w-[250px] shrink-0 border-r border-[#e8e9ec] bg-[#fafafa]">
    <div className="border-b border-[#e8e9ec] px-4 py-3.5">
      <div className="text-[14px] font-semibold text-[#161823]">已配置任务</div>
      <div className="mt-1 text-xs leading-5 text-[rgba(22,24,35,.48)]">拖拽任务到右侧画布进行编排</div>
    </div>
    <div className="p-3">
      <div className="mb-2 flex items-center gap-2 px-1 text-[11px] font-medium text-[rgba(22,24,35,.52)]">
        <Database size={14} /> 数据同步
      </div>
      {loading ? <div className="flex justify-center py-8"><Spin size="small" /></div> : null}
      {!loading && !tasks.length ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无可用于工作流的同步任务" />
      ) : null}
      <div className="space-y-2">
        {tasks.map((task) => (
          <div
            key={task.id}
            draggable={!locked}
            onDragStart={(event) => onDragStart(event, task)}
            className={[
              'rounded-lg border border-[#e3e5e8] bg-white px-3 py-2.5 transition-all',
              locked
                ? 'cursor-not-allowed opacity-60'
                : 'cursor-grab hover:border-[#cfd2d7] hover:shadow-sm',
            ].join(' ')}
          >
            <div className="truncate text-[13px] font-semibold text-[#161823]">{task.name}</div>
            <div className="mt-1 truncate text-[10px] text-[rgba(22,24,35,.38)]">ID {task.id}</div>
          </div>
        ))}
      </div>
    </div>
  </aside>
);

export default WorkflowTaskLibrary;

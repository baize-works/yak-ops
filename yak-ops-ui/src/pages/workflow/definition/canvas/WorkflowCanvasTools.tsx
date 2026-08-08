import { Popover, Tooltip } from 'antd';
import { Hand, History, Maximize2, MousePointer2, Plus, Redo2, Undo2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useReactFlow } from 'reactflow';
import WorkflowTaskPicker from './WorkflowTaskPicker';
import {
  WORKFLOW_START_NODE_ID,
  type WorkflowStartNodeData,
} from './start/types';
import type { WorkflowCanvasHistoryEntry } from './useWorkflowCanvasHistory';

export type WorkflowCanvasMode = 'pointer' | 'hand';

interface WorkflowCanvasToolsProps<T> {
  mode: WorkflowCanvasMode;
  locked: boolean;
  historyEntries: Array<WorkflowCanvasHistoryEntry<T>>;
  currentHistoryIndex: number;
  canUndo: boolean;
  canRedo: boolean;
  onModeChange: (mode: WorkflowCanvasMode) => void;
  onUndo: () => void;
  onRedo: () => void;
  onJumpToHistory: (index: number) => void;
  onClearHistory: () => void;
}

const iconButtonClass = (active = false) => [
  'flex h-8 w-8 items-center justify-center rounded-lg border-0 transition-[background-color,color,transform] duration-150',
  active
    ? 'bg-[rgba(254,44,85,.09)] text-[#fe2c55]'
    : 'bg-transparent text-[#667085] hover:bg-[#f2f4f7] hover:text-[#344054]',
].join(' ');

const disabledButtonClass = 'disabled:cursor-not-allowed disabled:text-[#c6c9cf] disabled:hover:bg-transparent';

const isEditableTarget = (target: EventTarget | null) => {
  const element = target as HTMLElement | null;
  if (!element) return false;
  const tagName = element.tagName?.toLowerCase();
  return tagName === 'input' || tagName === 'textarea' || tagName === 'select' || element.isContentEditable;
};

const WorkflowCanvasTools = <T,>({
  mode,
  locked,
  historyEntries,
  currentHistoryIndex,
  canUndo,
  canRedo,
  onModeChange,
  onUndo,
  onRedo,
  onJumpToHistory,
  onClearHistory,
}: WorkflowCanvasToolsProps<T>) => {
  const [historyOpen, setHistoryOpen] = useState(false);
  const reactFlow = useReactFlow();
  const startNode = reactFlow.getNode(WORKFLOW_START_NODE_ID);
  const startData = startNode?.data as WorkflowStartNodeData | undefined;
  const appendOptions = startData?.appendOptions || [];
  const canAddNode = !locked && appendOptions.length > 0 && Boolean(startData?.onAppend);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (locked || isEditableTarget(event.target)) return;

      const modifier = event.metaKey || event.ctrlKey;
      if (modifier && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        if (event.shiftKey) onRedo();
        else onUndo();
        return;
      }
      if (modifier && event.key.toLowerCase() === 'y') {
        event.preventDefault();
        onRedo();
        return;
      }
      if (!modifier && !event.altKey && !event.shiftKey) {
        if (event.key.toLowerCase() === 'v') onModeChange('pointer');
        if (event.key.toLowerCase() === 'h') onModeChange('hand');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [locked, onModeChange, onRedo, onUndo]);

  const historyContent = (
    <div className="w-[320px] overflow-hidden rounded-xl border border-[#e4e7ec] bg-white shadow-[0_10px_30px_rgba(22,24,35,.10),0_2px_6px_rgba(22,24,35,.04)]">
      <div className="flex h-11 items-center justify-between px-3.5">
        <div className="text-[14px] font-medium text-[#344054]">变更历史</div>
        <button
          type="button"
          aria-label="关闭变更历史"
          className="flex h-7 w-7 items-center justify-center rounded-md border-0 bg-transparent text-[#667085] hover:bg-[#f2f4f7]"
          onClick={() => setHistoryOpen(false)}
        >
          <X size={15} />
        </button>
      </div>

      <div className="max-h-[360px] overflow-y-auto px-2 pb-2">
        {historyEntries.length <= 1 ? (
          <div className="py-10 text-center text-[12px] text-[#98a2b3]">暂无变更记录</div>
        ) : (
          [...historyEntries]
            .map((entry, index) => ({ entry, index }))
            .reverse()
            .map(({ entry, index }) => {
              const diff = index - currentHistoryIndex;
              const stepText = diff === 0
                ? '当前状态'
                : diff < 0
                  ? `${Math.abs(diff)} 步后退`
                  : `${diff} 步前进`;

              return (
                <button
                  key={entry.id}
                  type="button"
                  className={[
                    'mb-0.5 flex w-full items-center rounded-lg border-0 px-2.5 py-2 text-left transition-colors',
                    diff === 0 ? 'bg-[#f2f4f7]' : 'bg-transparent hover:bg-[#f7f8fa]',
                  ].join(' ')}
                  onClick={() => {
                    onJumpToHistory(index);
                    setHistoryOpen(false);
                  }}
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[12px] font-medium text-[#475467]">{entry.label}</div>
                    <div className="mt-0.5 text-[10px] text-[#98a2b3]">{stepText}</div>
                  </div>
                </button>
              );
            })
        )}
      </div>

      {historyEntries.length > 1 ? (
        <div className="border-t border-[#f0f1f3] px-2 py-1.5">
          <button
            type="button"
            className="flex w-full rounded-lg border-0 bg-transparent px-2.5 py-2 text-left text-[12px] font-medium text-[#475467] hover:bg-[#f7f8fa]"
            onClick={() => {
              onClearHistory();
              setHistoryOpen(false);
            }}
          >
            清除历史记录
          </button>
        </div>
      ) : null}

      <div className="border-t border-[#f0f1f3] px-3.5 py-3 text-[10px] leading-[18px] text-[#98a2b3]">
        <div className="mb-1 font-medium text-[#667085]">提示</div>
        编辑历史仅保存在当前浏览器会话中，用于撤销、重做和快速回到之前的编辑状态。
      </div>
    </div>
  );

  return (
    <>
      <style>{`
        .react-flow {
          background: #F5F6F8 !important;
        }
        .react-flow__background circle,
        .react-flow__background-pattern circle {
          fill: #D5DAE3 !important;
        }
        .react-flow__controls {
          display: none !important;
        }
        .react-flow__minimap {
          right: 14px !important;
          bottom: 14px !important;
          width: 154px !important;
          height: 96px !important;
          overflow: hidden !important;
          border: 1px solid rgba(22, 24, 35, .08) !important;
          border-radius: 12px !important;
          background: rgba(255, 255, 255, .88) !important;
          box-shadow: 0 4px 14px rgba(22, 24, 35, .07), 0 1px 2px rgba(22, 24, 35, .04) !important;
          opacity: .74;
          transition: right 180ms ease, opacity 150ms ease, box-shadow 150ms ease;
        }
        .react-flow__minimap:hover {
          opacity: 1;
          box-shadow: 0 8px 22px rgba(22, 24, 35, .10), 0 2px 4px rgba(22, 24, 35, .04) !important;
        }
        div:has(> aside) > .react-flow .react-flow__minimap {
          right: 424px !important;
        }
        div:has(> .react-flow) > aside {
          box-shadow: 0 10px 30px rgba(22, 24, 35, .10), 0 2px 6px rgba(22, 24, 35, .04) !important;
        }
      `}</style>

      <div className="pointer-events-auto absolute left-3.5 top-3.5 z-10 flex flex-col items-center rounded-xl border border-[#e3e6ea] bg-[rgba(255,255,255,.94)] p-1 shadow-[0_4px_14px_rgba(22,24,35,.07),0_1px_2px_rgba(22,24,35,.04)] backdrop-blur-sm">
        <WorkflowTaskPicker
          options={appendOptions}
          disabled={!canAddNode}
          placement="rightTop"
          onSelect={(taskId) => startData?.onAppend?.(WORKFLOW_START_NODE_ID, taskId)}
        >
          <button
            type="button"
            aria-label="添加节点"
            disabled={!canAddNode}
            className={`${iconButtonClass()} ${disabledButtonClass} text-[#fe2c55] hover:bg-[rgba(254,44,85,.08)] hover:text-[#fe2c55]`}
          >
            <Plus size={17} strokeWidth={2} />
          </button>
        </WorkflowTaskPicker>

        <div className="my-1 h-px w-5 bg-[#e8eaee]" />

        <Tooltip title="选择模式（V）" placement="right">
          <button
            type="button"
            aria-label="选择模式"
            disabled={locked}
            className={`${iconButtonClass(mode === 'pointer')} ${disabledButtonClass}`}
            onClick={() => onModeChange('pointer')}
          >
            <MousePointer2 size={16} strokeWidth={1.9} />
          </button>
        </Tooltip>

        <Tooltip title="画布拖拽模式（H）" placement="right">
          <button
            type="button"
            aria-label="画布拖拽模式"
            disabled={locked}
            className={`${iconButtonClass(mode === 'hand')} ${disabledButtonClass}`}
            onClick={() => onModeChange('hand')}
          >
            <Hand size={16} strokeWidth={1.9} />
          </button>
        </Tooltip>

        <div className="my-1 h-px w-5 bg-[#e8eaee]" />

        <Tooltip title="适应画布" placement="right">
          <button
            type="button"
            aria-label="适应画布"
            className={iconButtonClass()}
            onClick={() => void reactFlow.fitView({ padding: 0.18, duration: 250 })}
          >
            <Maximize2 size={15} strokeWidth={1.9} />
          </button>
        </Tooltip>
      </div>

      <div className="pointer-events-auto absolute bottom-3.5 left-1/2 z-10 flex -translate-x-1/2 items-center rounded-xl border border-[#e3e6ea] bg-[rgba(255,255,255,.94)] p-1 shadow-[0_4px_14px_rgba(22,24,35,.07),0_1px_2px_rgba(22,24,35,.04)] backdrop-blur-sm">
        <Tooltip title="撤销（Ctrl/Cmd + Z）">
          <button
            type="button"
            aria-label="撤销"
            disabled={locked || !canUndo}
            className={`${iconButtonClass()} ${disabledButtonClass}`}
            onClick={onUndo}
          >
            <Undo2 size={16} strokeWidth={1.9} />
          </button>
        </Tooltip>

        <Tooltip title="重做（Ctrl/Cmd + Shift + Z）">
          <button
            type="button"
            aria-label="重做"
            disabled={locked || !canRedo}
            className={`${iconButtonClass()} ${disabledButtonClass}`}
            onClick={onRedo}
          >
            <Redo2 size={16} strokeWidth={1.9} />
          </button>
        </Tooltip>

        <div className="mx-1 h-4 w-px bg-[#e4e7ec]" />

        <Popover
          open={historyOpen}
          onOpenChange={(open) => !locked && setHistoryOpen(open)}
          trigger="click"
          placement="top"
          arrow={false}
          content={historyContent}
          overlayInnerStyle={{ padding: 0, background: 'transparent', boxShadow: 'none' }}
        >
          <Tooltip title="变更历史">
            <button
              type="button"
              aria-label="变更历史"
              disabled={locked}
              className={`${iconButtonClass(historyOpen)} ${disabledButtonClass}`}
            >
              <History size={16} strokeWidth={1.9} />
            </button>
          </Tooltip>
        </Popover>
      </div>
    </>
  );
};

export default WorkflowCanvasTools;

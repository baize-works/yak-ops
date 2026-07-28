import {
  Clipboard,
  Copy,
  Focus,
  LayoutGrid,
  MousePointer2,
  Plus,
  Power,
  Trash2,
} from 'lucide-react';
import type { WorkflowContextMenuState } from '../../../types';

interface WorkflowContextMenuProps {
  menu: WorkflowContextMenuState;
  canPaste: boolean;
  onClose: () => void;
  onAddNode: () => void;
  onPaste: () => void;
  onSelectAll: () => void;
  onFitView: () => void;
  onDuplicateNode: () => void;
  onToggleNode: () => void;
  onDeleteNode: () => void;
  onDeleteEdge: () => void;
}

const menuButtonClass = [
  'flex h-[31px] w-full items-center gap-2 rounded-md border-0 bg-transparent px-2',
  'text-left text-[10px] text-[#475467] hover:bg-[#f2f4f7]',
  'disabled:cursor-not-allowed disabled:opacity-[0.35]',
].join(' ');

const WorkflowContextMenu = ({
  menu,
  canPaste,
  onClose,
  onAddNode,
  onPaste,
  onSelectAll,
  onFitView,
  onDuplicateNode,
  onToggleNode,
  onDeleteNode,
  onDeleteEdge,
}: WorkflowContextMenuProps) => {
  const action = (callback: () => void) => () => {
    callback();
    onClose();
  };

  return (
    <div
      className={[
        'fixed z-[1000] flex w-[190px] flex-col rounded-[10px] border border-[#d0d5dd] p-1.5',
        'bg-white/[0.98] shadow-[0_16px_40px_rgba(16,24,40,0.18)] backdrop-blur-[14px]',
      ].join(' ')}
      style={{ left: menu.x, top: menu.y }}
      onMouseDown={(event) => event.stopPropagation()}
    >
      {menu.kind === 'pane' && (
        <>
          <button type="button" className={menuButtonClass} onClick={action(onAddNode)}>
            <Plus size={15} /> 添加节点
          </button>
          <button
            type="button"
            className={menuButtonClass}
            disabled={!canPaste}
            onClick={action(onPaste)}
          >
            <Clipboard size={15} /> 粘贴
            <kbd className="ml-auto font-[inherit] text-[8px] text-[#98a2b3]">⌘V</kbd>
          </button>
          <div className="mx-1 my-1 h-px bg-[#eaecf0]" />
          <button type="button" className={menuButtonClass} onClick={action(onSelectAll)}>
            <MousePointer2 size={15} /> 全选节点
            <kbd className="ml-auto font-[inherit] text-[8px] text-[#98a2b3]">⌘A</kbd>
          </button>
          <button type="button" className={menuButtonClass} onClick={action(onFitView)}>
            <Focus size={15} /> 适应画布
          </button>
          <button type="button" className={menuButtonClass} onClick={action(onFitView)}>
            <LayoutGrid size={15} /> 定位内容
          </button>
        </>
      )}
      {menu.kind === 'node' && (
        <>
          <button type="button" className={menuButtonClass} onClick={action(onDuplicateNode)}>
            <Copy size={15} /> 创建副本
            <kbd className="ml-auto font-[inherit] text-[8px] text-[#98a2b3]">⌘D</kbd>
          </button>
          <button type="button" className={menuButtonClass} onClick={action(onToggleNode)}>
            <Power size={15} /> 启用 / 停用
          </button>
          <div className="mx-1 my-1 h-px bg-[#eaecf0]" />
          <button
            type="button"
            className={[menuButtonClass, 'text-[#d92d20]'].join(' ')}
            onClick={action(onDeleteNode)}
          >
            <Trash2 size={15} /> 删除节点
          </button>
        </>
      )}
      {menu.kind === 'edge' && (
        <button
          type="button"
          className={[menuButtonClass, 'text-[#d92d20]'].join(' ')}
          onClick={action(onDeleteEdge)}
        >
          <Trash2 size={15} /> 删除连线
        </button>
      )}
    </div>
  );
};

export default WorkflowContextMenu;

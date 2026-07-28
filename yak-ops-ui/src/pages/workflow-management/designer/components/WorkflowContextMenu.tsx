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
import type { WorkflowContextMenuState } from '../../types';

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
      className="dify-workflow-context-menu"
      style={{ left: menu.x, top: menu.y }}
      onMouseDown={(event) => event.stopPropagation()}
    >
      {menu.kind === 'pane' && (
        <>
          <button type="button" onClick={action(onAddNode)}><Plus size={15} /> 添加节点</button>
          <button type="button" disabled={!canPaste} onClick={action(onPaste)}>
            <Clipboard size={15} /> 粘贴
            <kbd>⌘V</kbd>
          </button>
          <i />
          <button type="button" onClick={action(onSelectAll)}>
            <MousePointer2 size={15} /> 全选节点
            <kbd>⌘A</kbd>
          </button>
          <button type="button" onClick={action(onFitView)}><Focus size={15} /> 适应画布</button>
          <button type="button" onClick={action(onFitView)}><LayoutGrid size={15} /> 定位内容</button>
        </>
      )}
      {menu.kind === 'node' && (
        <>
          <button type="button" onClick={action(onDuplicateNode)}>
            <Copy size={15} /> 创建副本
            <kbd>⌘D</kbd>
          </button>
          <button type="button" onClick={action(onToggleNode)}><Power size={15} /> 启用 / 停用</button>
          <i />
          <button type="button" className="is-danger" onClick={action(onDeleteNode)}>
            <Trash2 size={15} /> 删除节点
          </button>
        </>
      )}
      {menu.kind === 'edge' && (
        <button type="button" className="is-danger" onClick={action(onDeleteEdge)}>
          <Trash2 size={15} /> 删除连线
        </button>
      )}
    </div>
  );
};

export default WorkflowContextMenu;

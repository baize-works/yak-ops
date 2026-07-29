import { Dropdown, Tooltip, type MenuProps } from 'antd';
import {
  Braces,
  ChevronDown,
  Download,
  Eye,
  EyeOff,
  Hand,
  Maximize2,
  Minus,
  MoreHorizontal,
  MousePointer2,
  Plus,
  Redo2,
  ScanLine,
  Upload,
  Undo2,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { MiniMap, useReactFlow, useViewport } from 'reactflow';

export type CanvasInteractionMode = 'select' | 'pan';

export interface CanvasLibraryItem {
  key: string;
  label: string;
  description?: string;
  keywords?: string[];
  icon: ReactNode;
  iconClassName: string;
}

export interface CanvasLibraryGroup {
  key: string;
  title?: string;
  items: CanvasLibraryItem[];
}

interface CanvasOperatorProps {
  canUndo: boolean;
  canRedo: boolean;
  showMiniMap: boolean;
  nodePanelOpen: boolean;
  interactionMode: CanvasInteractionMode;
  onUndo: () => void;
  onRedo: () => void;
  onToggleMiniMap: () => void;
  onAutoLayout: () => void;
  onExport: () => void;
  onImport: () => void;
  onToggleVariableInspect: () => void;
  onToggleNodePanel: () => void;
  onInteractionModeChange: (mode: CanvasInteractionMode) => void;
  onSelectLibraryItem?: (item: CanvasLibraryItem) => void;
  variableInspectOpen: boolean;
  nodeGroups?: CanvasLibraryGroup[];
  toolGroups?: CanvasLibraryGroup[];
}

const operatorGroupClass = [
  'pointer-events-auto flex items-center gap-px rounded-lg border border-[#e4e7ec]',
  'bg-white p-[3px] shadow-[0_4px_12px_rgba(16,24,40,0.08)]',
].join(' ');

const iconButtonClass = [
  'relative flex h-8 w-8 shrink-0 items-center justify-center rounded-md border-0',
  'bg-transparent p-0 text-[#667085] transition-all duration-150',
  'hover:bg-[#f2f4f7] hover:text-[#344054]',
  'disabled:cursor-not-allowed disabled:opacity-[0.35]',
].join(' ');

const activeIconButtonClass =
  'bg-[#eef2ff] text-[#155eef] hover:bg-[#e7edff] hover:text-[#155eef]';

const openNodeSelector = () => {
  window.dispatchEvent(
    new CustomEvent('yak-workflow-quick-add', {
      detail: { nodeId: undefined },
    }),
  );
};

const CanvasOperator = ({
  canUndo,
  canRedo,
  showMiniMap,
  interactionMode,
  variableInspectOpen,
  onUndo,
  onRedo,
  onToggleMiniMap,
  onAutoLayout,
  onExport,
  onImport,
  onToggleVariableInspect,
  onInteractionModeChange,
}: CanvasOperatorProps) => {
  const reactFlow = useReactFlow();
  const { zoom } = useViewport();

  const zoomItems: MenuProps['items'] = [
    ...[2, 1, 0.75, 0.5, 0.25].map((value) => ({
      key: String(value),
      label: `${Math.round(value * 100)}%`,
      onClick: () => reactFlow.zoomTo(value, { duration: 180 }),
    })),
    { type: 'divider' as const },
    {
      key: 'fit',
      label: '适应画布',
      onClick: () => reactFlow.fitView({ padding: 0.24, duration: 220 }),
    },
  ];

  const moreItems: MenuProps['items'] = [
    {
      key: 'import',
      label: '导入 JSON',
      icon: <Upload size={14} />,
      onClick: onImport,
    },
    {
      key: 'export',
      label: '导出 JSON',
      icon: <Download size={14} />,
      onClick: onExport,
    },
  ];

  return (
    <div className="pointer-events-none absolute inset-0 z-20">
      <div className="absolute left-3 top-1/2 flex -translate-y-1/2 items-start gap-1.5">
        <div className={`${operatorGroupClass} w-[38px] flex-col gap-1 py-1`}>
          <Tooltip title="添加节点" placement="right">
            <button
              type="button"
              className={iconButtonClass}
              onClick={openNodeSelector}
              aria-label="添加节点"
            >
              <span className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-[#475467] text-white">
                <Plus size={12} strokeWidth={2.8} />
              </span>
            </button>
          </Tooltip>

          <Tooltip title="自动布局" placement="right">
            <button
              type="button"
              className={iconButtonClass}
              onClick={onAutoLayout}
            >
              <ScanLine size={16} strokeWidth={1.8} />
            </button>
          </Tooltip>

          <Tooltip title="选择节点" placement="right">
            <button
              type="button"
              className={[
                iconButtonClass,
                interactionMode === 'select' ? activeIconButtonClass : '',
              ].join(' ')}
              onClick={() => onInteractionModeChange('select')}
            >
              <MousePointer2 size={16} strokeWidth={1.9} />
            </button>
          </Tooltip>

          <Tooltip title="移动画布" placement="right">
            <button
              type="button"
              className={[
                iconButtonClass,
                interactionMode === 'pan' ? activeIconButtonClass : '',
              ].join(' ')}
              onClick={() => onInteractionModeChange('pan')}
            >
              <Hand size={16} strokeWidth={1.8} />
            </button>
          </Tooltip>

          <Tooltip title="变量检查" placement="right">
            <button
              type="button"
              className={[
                iconButtonClass,
                variableInspectOpen ? activeIconButtonClass : '',
              ].join(' ')}
              onClick={onToggleVariableInspect}
            >
              <Braces size={16} strokeWidth={1.8} />
            </button>
          </Tooltip>

          <Dropdown
            menu={{ items: moreItems }}
            placement="bottomLeft"
            trigger={['click']}
          >
            <button
              type="button"
              className={iconButtonClass}
              aria-label="更多操作"
            >
              <MoreHorizontal size={17} strokeWidth={2} />
            </button>
          </Dropdown>
        </div>
      </div>

      <div className={`${operatorGroupClass} absolute bottom-3 left-3`}>
        <Tooltip title="撤销 Ctrl/⌘ + Z">
          <button
            type="button"
            className={iconButtonClass}
            disabled={!canUndo}
            onClick={onUndo}
          >
            <Undo2 size={15} />
          </button>
        </Tooltip>
        <Tooltip title="重做 Ctrl/⌘ + Shift + Z">
          <button
            type="button"
            className={iconButtonClass}
            disabled={!canRedo}
            onClick={onRedo}
          >
            <Redo2 size={15} />
          </button>
        </Tooltip>
      </div>

      <div className="pointer-events-auto absolute bottom-3 right-3 flex items-end gap-2">
        {showMiniMap && (
          <MiniMap
            pannable
            zoomable
            className={[
              '!absolute !bottom-[43px] !right-0 !m-0 !h-[88px] !w-32 !overflow-hidden',
              '!rounded-lg !border !border-[#d0d5dd] !bg-white/95',
              '!shadow-[0_8px_22px_rgba(16,24,40,0.12)]',
            ].join(' ')}
            nodeStrokeWidth={2}
            maskColor="rgba(248, 250, 252, 0.72)"
          />
        )}

        <div className={`${operatorGroupClass} min-w-[146px]`}>
          <Tooltip title="缩小">
            <button
              type="button"
              className={iconButtonClass}
              disabled={zoom <= 0.25}
              onClick={() => reactFlow.zoomOut({ duration: 150 })}
            >
              <Minus size={15} />
            </button>
          </Tooltip>

          <Dropdown menu={{ items: zoomItems }} placement="topRight">
            <button
              type="button"
              className={`${iconButtonClass} min-w-[48px] gap-1 text-[#475467]`}
            >
              {Math.round(zoom * 100)}%
              <ChevronDown size={12} />
            </button>
          </Dropdown>

          <Tooltip title="放大">
            <button
              type="button"
              className={iconButtonClass}
              disabled={zoom >= 2}
              onClick={() => reactFlow.zoomIn({ duration: 150 })}
            >
              <Plus size={15} />
            </button>
          </Tooltip>

          <Tooltip title="适应画布">
            <button
              type="button"
              className={iconButtonClass}
              onClick={() =>
                reactFlow.fitView({ padding: 0.24, duration: 220 })
              }
            >
              <Maximize2 size={15} />
            </button>
          </Tooltip>

          <Tooltip title={showMiniMap ? '隐藏小地图' : '显示小地图'}>
            <button
              type="button"
              className={iconButtonClass}
              onClick={onToggleMiniMap}
            >
              {showMiniMap ? <Eye size={15} /> : <EyeOff size={15} />}
            </button>
          </Tooltip>
        </div>
      </div>
    </div>
  );
};

export default CanvasOperator;

import { Dropdown, Tooltip, type MenuProps } from 'antd';
import {
  AlignHorizontalSpaceAround,
  Braces,
  ChevronDown,
  Download,
  Eye,
  EyeOff,
  Maximize2,
  Minus,
  Plus,
  Redo2,
  Undo2,
  Upload,
} from 'lucide-react';
import { MiniMap, useReactFlow, useViewport } from 'reactflow';

interface CanvasOperatorProps {
  canUndo: boolean;
  canRedo: boolean;
  showMiniMap: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onToggleMiniMap: () => void;
  onAutoLayout: () => void;
  onExport: () => void;
  onImport: () => void;
  onToggleVariableInspect: () => void;
  variableInspectOpen: boolean;
}

const operatorGroupClass = [
  'pointer-events-auto flex items-center gap-px rounded-lg border border-[#d0d5dd]/90',
  'bg-white/95 p-[3px] shadow-[0_5px_16px_rgba(16,24,40,0.09)] backdrop-blur-[10px]',
].join(' ');

const iconButtonClass = [
  'flex h-7 min-w-7 items-center justify-center rounded-md border-0 bg-transparent px-2',
  'text-[10px] text-[#667085] hover:bg-[#f2f4f7] hover:text-[#344054]',
  'disabled:cursor-not-allowed disabled:opacity-[0.35]',
].join(' ');

const CanvasOperator = ({
  canUndo,
  canRedo,
  showMiniMap,
  onUndo,
  onRedo,
  onToggleMiniMap,
  onAutoLayout,
  onExport,
  onImport,
  onToggleVariableInspect,
  variableInspectOpen,
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

  return (
    <div className="pointer-events-none absolute inset-0 z-20">
      <div className={[operatorGroupClass, 'absolute left-3 top-1/2 -translate-y-1/2 flex-col'].join(' ')}>
        <Tooltip title="自动布局" placement="right">
          <button type="button" className={iconButtonClass} onClick={onAutoLayout}>
            <AlignHorizontalSpaceAround size={15} />
          </button>
        </Tooltip>
        <Tooltip title="导入 JSON" placement="right">
          <button type="button" className={iconButtonClass} onClick={onImport}>
            <Upload size={15} />
          </button>
        </Tooltip>
        <Tooltip title="导出 JSON" placement="right">
          <button type="button" className={iconButtonClass} onClick={onExport}>
            <Download size={15} />
          </button>
        </Tooltip>
        <Tooltip title="变量检查" placement="right">
          <button
            type="button"
            className={[
              iconButtonClass,
              variableInspectOpen ? 'bg-[#eff4ff] text-[#155eef]' : '',
            ].join(' ')}
            onClick={onToggleVariableInspect}
          >
            <Braces size={15} />
          </button>
        </Tooltip>
      </div>

      <div className={[operatorGroupClass, 'absolute bottom-3 left-3'].join(' ')}>
        <Tooltip title="撤销 Ctrl/⌘ + Z">
          <button type="button" className={iconButtonClass} disabled={!canUndo} onClick={onUndo}>
            <Undo2 size={15} />
          </button>
        </Tooltip>
        <Tooltip title="重做 Ctrl/⌘ + Shift + Z">
          <button type="button" className={iconButtonClass} disabled={!canRedo} onClick={onRedo}>
            <Redo2 size={15} />
          </button>
        </Tooltip>
      </div>

      <div className="pointer-events-auto absolute bottom-3 right-3 flex items-end gap-2">
        {showMiniMap && (
          <MiniMap
            pannable
            zoomable
            className="!absolute !bottom-[43px] !right-0 !m-0 !h-[88px] !w-32 !overflow-hidden !rounded-lg !border !border-[#d0d5dd] !bg-white/95 !shadow-[0_8px_22px_rgba(16,24,40,0.12)]"
            nodeStrokeWidth={2}
            maskColor="rgba(248, 250, 252, 0.72)"
          />
        )}
        <div className={[operatorGroupClass, 'min-w-[146px]'].join(' ')}>
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
              className={[iconButtonClass, 'min-w-[48px] gap-1 text-[#475467]'].join(' ')}
            >
              {Math.round(zoom * 100)}% <ChevronDown size={12} />
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
              onClick={() => reactFlow.fitView({ padding: 0.24, duration: 220 })}
            >
              <Maximize2 size={15} />
            </button>
          </Tooltip>
          <Tooltip title={showMiniMap ? '隐藏小地图' : '显示小地图'}>
            <button type="button" className={iconButtonClass} onClick={onToggleMiniMap}>
              {showMiniMap ? <Eye size={15} /> : <EyeOff size={15} />}
            </button>
          </Tooltip>
        </div>
      </div>
    </div>
  );
};

export default CanvasOperator;

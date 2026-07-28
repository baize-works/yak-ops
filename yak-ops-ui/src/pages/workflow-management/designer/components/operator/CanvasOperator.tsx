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
  'pointer-events-auto flex h-[35px] items-center gap-px rounded-lg p-[3px]',
  'border border-[#d0d5dd]/85 bg-white/90',
  'shadow-[0_7px_20px_rgba(16,24,40,0.09)] backdrop-blur-[10px]',
].join(' ');

const iconButtonClass = [
  'flex h-[27px] min-w-[27px] items-center justify-center rounded-md border-0 bg-transparent px-2',
  'text-[9px] text-[#667085] hover:bg-[#f2f4f7] hover:text-[#344054]',
  'disabled:cursor-not-allowed disabled:opacity-35',
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
    <div className="pointer-events-none absolute bottom-3 left-3 right-3 z-20 grid grid-cols-[1fr_auto_1fr] items-end">
      <div className="flex items-end gap-2">
        <div className={operatorGroupClass}>
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
        <div className={operatorGroupClass}>
          <Tooltip title="自动布局">
            <button type="button" className={iconButtonClass} onClick={onAutoLayout}>
              <AlignHorizontalSpaceAround size={15} />
            </button>
          </Tooltip>
          <Tooltip title="导入 JSON">
            <button type="button" className={iconButtonClass} onClick={onImport}>
              <Upload size={15} />
            </button>
          </Tooltip>
          <Tooltip title="导出 JSON">
            <button type="button" className={iconButtonClass} onClick={onExport}>
              <Download size={15} />
            </button>
          </Tooltip>
        </div>
      </div>

      <button
        type="button"
        className={[
          'pointer-events-auto justify-self-center inline-flex h-[34px] items-center gap-1.5 rounded-lg px-2.5',
          'border border-[#d0d5dd]/85 bg-white/90 text-[9px]',
          'shadow-[0_7px_20px_rgba(16,24,40,0.09)] backdrop-blur-[10px]',
          variableInspectOpen
            ? 'border-[#c7c4fc] bg-[#f4f3ff] text-[#4f46e5]'
            : 'text-[#667085]',
        ].join(' ')}
        onClick={onToggleVariableInspect}
      >
        <Braces size={15} />
        变量检查
      </button>

      <div className="relative justify-self-end flex items-end gap-2">
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
          <Dropdown menu={{ items: zoomItems }} placement="top">
            <button type="button" className={[iconButtonClass, 'min-w-[47px] gap-1 text-[#475467]'].join(' ')}>
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

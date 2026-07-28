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
    <div className="dify-canvas-operator">
      <div className="dify-canvas-operator__left">
        <div className="dify-operator-group">
          <Tooltip title="撤销 Ctrl/⌘ + Z">
            <button type="button" disabled={!canUndo} onClick={onUndo}><Undo2 size={15} /></button>
          </Tooltip>
          <Tooltip title="重做 Ctrl/⌘ + Shift + Z">
            <button type="button" disabled={!canRedo} onClick={onRedo}><Redo2 size={15} /></button>
          </Tooltip>
        </div>
        <div className="dify-operator-group">
          <Tooltip title="自动布局">
            <button type="button" onClick={onAutoLayout}><AlignHorizontalSpaceAround size={15} /></button>
          </Tooltip>
          <Tooltip title="导入 JSON">
            <button type="button" onClick={onImport}><Upload size={15} /></button>
          </Tooltip>
          <Tooltip title="导出 JSON">
            <button type="button" onClick={onExport}><Download size={15} /></button>
          </Tooltip>
        </div>
      </div>

      <button
        type="button"
        className={['dify-variable-inspect-trigger', variableInspectOpen ? 'is-active' : ''].join(' ')}
        onClick={onToggleVariableInspect}
      >
        <Braces size={15} />
        变量检查
      </button>

      <div className="dify-canvas-operator__right">
        {showMiniMap && (
          <MiniMap
            pannable
            zoomable
            className="dify-canvas-minimap"
            nodeStrokeWidth={2}
            maskColor="rgba(248, 250, 252, 0.72)"
          />
        )}
        <div className="dify-operator-group is-zoom">
          <Tooltip title="缩小">
            <button
              type="button"
              disabled={zoom <= 0.25}
              onClick={() => reactFlow.zoomOut({ duration: 150 })}
            >
              <Minus size={15} />
            </button>
          </Tooltip>
          <Dropdown menu={{ items: zoomItems }} placement="top">
            <button type="button" className="dify-zoom-value">
              {Math.round(zoom * 100)}% <ChevronDown size={12} />
            </button>
          </Dropdown>
          <Tooltip title="放大">
            <button
              type="button"
              disabled={zoom >= 2}
              onClick={() => reactFlow.zoomIn({ duration: 150 })}
            >
              <Plus size={15} />
            </button>
          </Tooltip>
          <Tooltip title="适应画布">
            <button type="button" onClick={() => reactFlow.fitView({ padding: 0.24, duration: 220 })}>
              <Maximize2 size={15} />
            </button>
          </Tooltip>
          <Tooltip title={showMiniMap ? '隐藏小地图' : '显示小地图'}>
            <button type="button" onClick={onToggleMiniMap}>
              {showMiniMap ? <Eye size={15} /> : <EyeOff size={15} />}
            </button>
          </Tooltip>
        </div>
      </div>
    </div>
  );
};

export default CanvasOperator;

import { Dropdown, Input, Tooltip, type MenuProps } from "antd";
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
  Search,
  Undo2,
  Upload,
} from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { MiniMap, useReactFlow, useViewport } from "reactflow";

import type { WorkflowNodeType } from "../../../types";

export type CanvasInteractionMode = "select" | "pan";

export interface CanvasLibraryItem {
  key: string;
  nodeType: WorkflowNodeType;
  label: string;
  description?: string;
  keywords?: string[];
  icon: ReactNode;
  iconColor?: string;
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
  variableInspectOpen: boolean;
  nodeGroups: CanvasLibraryGroup[];
  onUndo: () => void;
  onRedo: () => void;
  onToggleMiniMap: () => void;
  onAutoLayout: () => void;
  onExport: () => void;
  onImport: () => void;
  onToggleVariableInspect: () => void;
  onToggleNodePanel: () => void;
  onInteractionModeChange: (mode: CanvasInteractionMode) => void;
  onSelectLibraryItem: (item: CanvasLibraryItem) => void;
}

interface ToolbarButtonProps {
  title: string;
  active?: boolean;
  disabled?: boolean;
  children: ReactNode;
  onClick: () => void;
}

const operatorGroupClass = [
  "pointer-events-auto flex items-center gap-px",
  "rounded-[10px] ",
  "bg-white p-[3px]",
  "shadow-[0_4px_14px_rgba(16,24,40,0.08)]",
].join(" ");

const iconButtonClass = [
  "group relative flex h-8 w-8 shrink-0 items-center justify-center",
  "rounded-[7px] border-0 bg-transparent p-0",
  "text-[#667085] outline-none",
  "transition-[background-color,color,box-shadow,transform] duration-150",
  "hover:bg-[#f2f4f7] hover:text-[#344054]",
  "focus-visible:ring-2 focus-visible:ring-[var(--yak-brand-color-border)]",
  "focus-visible:ring-offset-1",
  "active:scale-[0.96]",
  "disabled:cursor-not-allowed disabled:opacity-[0.35]",
  "disabled:active:scale-100",
].join(" ");

const activeIconButtonClass = [
  "bg-[var(--yak-brand-color-soft)] text-[var(--yak-brand-color)]",
  "shadow-[inset_0_0_0_1px_var(--yak-brand-color-soft)]",
  "hover:bg-[var(--yak-brand-color-soft-hover)] hover:text-[var(--yak-brand-color)]",
].join(" ");

const getIconButtonClass = (active?: boolean) =>
  [iconButtonClass, active ? activeIconButtonClass : ""].join(" ");

const ActiveIndicator = () => (
  <span
    className={[
      "pointer-events-none absolute -left-[5px] top-1/2",
      "h-4 w-0.5 -translate-y-1/2 rounded-r-full",
      "bg-[var(--yak-brand-color)]",
    ].join(" ")}
  />
);

const ToolbarButton = ({
  title,
  active = false,
  disabled = false,
  children,
  onClick,
}: ToolbarButtonProps) => {
  return (
    <Tooltip title={title} placement="right">
      <button
        type="button"
        aria-label={title}
        aria-pressed={active}
        disabled={disabled}
        className={getIconButtonClass(active)}
        onClick={onClick}
      >
        {/* {active && <ActiveIndicator />} */}

        {children}
      </button>
    </Tooltip>
  );
};

const CanvasOperator = ({
  canUndo,
  canRedo,
  showMiniMap,
  nodePanelOpen,
  interactionMode,
  variableInspectOpen,
  nodeGroups,
  onUndo,
  onRedo,
  onToggleMiniMap,
  onAutoLayout,
  onExport,
  onImport,
  onToggleVariableInspect,
  onToggleNodePanel,
  onInteractionModeChange,
  onSelectLibraryItem,
}: CanvasOperatorProps) => {
  const reactFlow = useReactFlow();
  const { zoom } = useViewport();

  const [keyword, setKeyword] = useState("");
  const [moreOpen, setMoreOpen] = useState(false);

  const zoomItems: MenuProps["items"] = [
    ...[2, 1, 0.75, 0.5, 0.25].map((value) => ({
      key: String(value),
      label: `${Math.round(value * 100)}%`,
      onClick: () => {
        reactFlow.zoomTo(value, {
          duration: 180,
        });
      },
    })),
    {
      type: "divider" as const,
    },
    {
      key: "fit",
      label: "适应画布",
      onClick: () => {
        reactFlow.fitView({
          padding: 0.24,
          duration: 220,
        });
      },
    },
  ];

  const moreItems: MenuProps["items"] = [
    {
      key: "import",
      label: "导入 JSON",
      icon: <Upload size={14} />,
      onClick: onImport,
    },
    {
      key: "export",
      label: "导出 JSON",
      icon: <Download size={14} />,
      onClick: onExport,
    },
  ];

  const visibleGroups = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();

    if (!normalizedKeyword) {
      return nodeGroups;
    }

    return nodeGroups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => {
          const searchableContent = [
            item.label,
            item.description,
            item.nodeType,
            ...(item.keywords ?? []),
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

          return searchableContent.includes(normalizedKeyword);
        }),
      }))
      .filter((group) => group.items.length > 0);
  }, [keyword, nodeGroups]);

  return (
    <div className="pointer-events-none absolute inset-0 z-20">
      {/*
       * 左侧工具栏与节点面板共用同一个定位容器。
       * items-start 可以保证面板与工具栏顶部始终平齐。
       */}
      <div className="absolute left-3 top-1/2 -translate-y-1/2">
        <div
          className={[operatorGroupClass, "w-[40px] flex-col gap-1 py-1"].join(
            " "
          )}
          onMouseDown={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
        >
          <ToolbarButton
            title={nodePanelOpen ? "收起节点面板" : "添加节点"}
            active={nodePanelOpen}
            onClick={onToggleNodePanel}
          >
            <span
              className={[
                "flex h-[19px] w-[19px] items-center justify-center",
                "rounded-full text-white",
                "transition-colors duration-150",
                nodePanelOpen
                  ? "bg-[var(--yak-brand-color)]"
                  : "bg-[#475467] group-hover:bg-[#344054]",
              ].join(" ")}
            >
              <Plus size={12} strokeWidth={2.8} />
            </span>
          </ToolbarButton>

          <ToolbarButton title="自动布局" onClick={onAutoLayout}>
            <ScanLine size={16} strokeWidth={1.8} />
          </ToolbarButton>

          <ToolbarButton
            title="选择节点"
            active={interactionMode === "select"}
            onClick={() => onInteractionModeChange("select")}
          >
            <MousePointer2 size={16} strokeWidth={1.9} />
          </ToolbarButton>

          <ToolbarButton
            title="移动画布"
            active={interactionMode === "pan"}
            onClick={() => onInteractionModeChange("pan")}
          >
            <Hand size={16} strokeWidth={1.8} />
          </ToolbarButton>

          <ToolbarButton
            title="变量检查"
            active={variableInspectOpen}
            onClick={onToggleVariableInspect}
          >
            <Braces size={16} strokeWidth={1.8} />
          </ToolbarButton>

          <Dropdown
            open={moreOpen}
            menu={{ items: moreItems }}
            placement="bottomLeft"
            trigger={["click"]}
            onOpenChange={setMoreOpen}
          >
            <button
              type="button"
              aria-label="更多操作"
              aria-pressed={moreOpen}
              className={getIconButtonClass(moreOpen)}
            >
              {/* {moreOpen && <ActiveIndicator />} */}

              <MoreHorizontal size={17} strokeWidth={2} />
            </button>
          </Dropdown>
        </div>

        {nodePanelOpen && (
          <div
            className={[
              "pointer-events-auto absolute",
              "left-[calc(100%+6px)] top-0",
              "flex h-[min(520px,calc(100vh-160px))] w-[400px]",
              "max-w-[calc(100vw-70px)] flex-col overflow-hidden",
              "rounded-[12px] border border-[#e4e7ec]",
              "bg-white",
              "shadow-[0_12px_32px_rgba(16,24,40,0.12)]",
            ].join(" ")}
            onMouseDown={(event) => event.stopPropagation()}
            onClick={(event) => event.stopPropagation()}
          >
            <div
              className={[
                "flex h-[42px] shrink-0 items-end",
                "border-b border-[#e4e7ec]",
                "px-4",
              ].join(" ")}
            >
              <div
                className={[
                  "relative flex h-[42px] items-center",
                  "text-[14px] font-semibold text-[var(--yak-brand-color)]",
                ].join(" ")}
              >
                节点
                <span
                  className={[
                    "absolute inset-x-0 bottom-0",
                    "h-0.5 rounded-full bg-[var(--yak-brand-color)]",
                  ].join(" ")}
                />
              </div>
            </div>

            <div className="shrink-0 px-2 py-2">
              <Input
                allowClear
                value={keyword}
                prefix={
                  <Search
                    size={15}
                    strokeWidth={1.8}
                    className="text-[#98a2b3]"
                  />
                }
                placeholder="搜索开始、结束、HTTP、Shell"
                className={[
                  "h-[34px] rounded-lg border-[#d0d5dd]",
                  "bg-[#fcfcfd]",
                  "shadow-[0_1px_2px_rgba(16,24,40,0.02)]",
                  "hover:border-[#b8c0cc]",
                  "focus-within:border-[var(--yak-brand-color-border)]",
                  "focus-within:shadow-[0_0_0_3px_var(--yak-brand-color-soft-hover)]",
                  "[&_.ant-input]:bg-transparent",
                  "[&_.ant-input]:text-[13px]",
                  "[&_.ant-input::placeholder]:text-[#98a2b3]",
                  "[&_.ant-input-clear-icon]:text-[#98a2b3]",
                ].join(" ")}
                onChange={(event) => setKeyword(event.target.value)}
              />
            </div>

            <div
              className={[
                "min-h-0 flex-1 overflow-y-auto",
                "px-2.5 pb-3",
                "[&::-webkit-scrollbar]:w-1.5",
                "[&::-webkit-scrollbar-thumb]:rounded-full",
                "[&::-webkit-scrollbar-thumb]:bg-[#c5cad3]",
                "[&::-webkit-scrollbar-thumb:hover]:bg-[#98a2b3]",
                "[&::-webkit-scrollbar-track]:bg-transparent",
              ].join(" ")}
            >
              {visibleGroups.length > 0 ? (
                visibleGroups.map((group) => (
                  <section key={group.key} className="mb-3 last:mb-0">
                    {group.title && (
                      <h3
                        className={[
                          "mb-1 px-1.5",
                          "text-[12px] font-normal leading-5",
                          "text-[#667085]",
                        ].join(" ")}
                      >
                        {group.title}
                      </h3>
                    )}

                    <div className="space-y-0.5">
                      {group.items.map((item) => {
                        const iconColor = item.iconColor || "#667085";

                        return (
                          <button
                            key={item.key}
                            type="button"
                            className={[
                              "group flex min-h-9 w-full items-center gap-2",
                              "rounded-[7px] border border-transparent",
                              "px-1.5 py-1 text-left",
                              "text-[14px] text-[#344054]",
                              "outline-none",
                              "transition-[background-color,border-color,color,transform]",
                              "duration-150",
                              "hover:border-[#eaecf0]",
                              "hover:bg-[#f5f7fa]",
                              "focus-visible:border-[var(--yak-brand-color-border)]",
                              "focus-visible:bg-[var(--yak-brand-color-soft)]",
                              "active:scale-[0.995]",
                            ].join(" ")}
                            onClick={() => onSelectLibraryItem(item)}
                          >
                            <span
                              className={[
                                "flex h-[22px] w-[22px] shrink-0",
                                "items-center justify-center",
                                "rounded-[6px] border",
                              ].join(" ")}
                              style={{
                                color: iconColor,
                                backgroundColor: `color-mix(in srgb, ${iconColor} 12%, white)`,
                                borderColor: `color-mix(in srgb, ${iconColor} 16%, white)`,
                              }}
                            >
                              {item.icon}
                            </span>

                            <span className="min-w-0 flex-1 truncate">
                              {item.label}
                            </span>

                            <Plus
                              size={14}
                              strokeWidth={2}
                              className={[
                                "shrink-0 text-[#98a2b3]",
                                "opacity-0 translate-x-1",
                                "transition-[opacity,transform,color]",
                                "duration-150",
                                "group-hover:translate-x-0",
                                "group-hover:text-[var(--yak-brand-color)]",
                                "group-hover:opacity-100",
                              ].join(" ")}
                            />
                          </button>
                        );
                      })}
                    </div>
                  </section>
                ))
              ) : (
                <div
                  className={[
                    "flex h-36 flex-col",
                    "items-center justify-center",
                    "text-[#98a2b3]",
                  ].join(" ")}
                >
                  <span
                    className={[
                      "flex h-9 w-9 items-center justify-center",
                      "rounded-full bg-[#f2f4f7]",
                    ].join(" ")}
                  >
                    <Search size={18} strokeWidth={1.6} />
                  </span>

                  <span className="mt-2 text-[13px]">没有找到相关节点</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div
        className={[operatorGroupClass, "absolute bottom-3 left-3"].join(" ")}
      >
        <Tooltip title="撤销 Ctrl/⌘ + Z">
          <button
            type="button"
            aria-label="撤销"
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
            aria-label="重做"
            className={iconButtonClass}
            disabled={!canRedo}
            onClick={onRedo}
          >
            <Redo2 size={15} />
          </button>
        </Tooltip>
      </div>

      <div
        className={[
          "pointer-events-auto absolute bottom-3 right-3",
          "flex items-end gap-2",
        ].join(" ")}
      >
        {showMiniMap && (
          <MiniMap
            pannable
            zoomable
            className={[
              "!absolute !bottom-[43px] !right-0 !m-0",
              "!h-[88px] !w-32 !overflow-hidden",
              "!rounded-lg !border !border-[#d0d5dd]",
              "!bg-white/95",
              "!shadow-[0_8px_22px_rgba(16,24,40,0.12)]",
            ].join(" ")}
            nodeStrokeWidth={2}
            maskColor="rgba(248, 250, 252, 0.72)"
          />
        )}

        <div className={[operatorGroupClass, "min-w-[146px]"].join(" ")}>
          <Tooltip title="缩小">
            <button
              type="button"
              aria-label="缩小"
              className={iconButtonClass}
              disabled={zoom <= 0.25}
              onClick={() => {
                reactFlow.zoomOut({
                  duration: 150,
                });
              }}
            >
              <Minus size={15} />
            </button>
          </Tooltip>

          <Dropdown menu={{ items: zoomItems }} placement="topRight">
            <button
              type="button"
              aria-label="选择画布缩放比例"
              className={[
                iconButtonClass,
                "min-w-[48px] gap-1 px-1",
                "text-[12px] text-[#475467]",
              ].join(" ")}
            >
              {Math.round(zoom * 100)}%
              <ChevronDown size={12} />
            </button>
          </Dropdown>

          <Tooltip title="放大">
            <button
              type="button"
              aria-label="放大"
              className={iconButtonClass}
              disabled={zoom >= 2}
              onClick={() => {
                reactFlow.zoomIn({
                  duration: 150,
                });
              }}
            >
              <Plus size={15} />
            </button>
          </Tooltip>

          <Tooltip title="适应画布">
            <button
              type="button"
              aria-label="适应画布"
              className={iconButtonClass}
              onClick={() => {
                reactFlow.fitView({
                  padding: 0.24,
                  duration: 220,
                });
              }}
            >
              <Maximize2 size={15} />
            </button>
          </Tooltip>

          <Tooltip title={showMiniMap ? "隐藏小地图" : "显示小地图"}>
            <button
              type="button"
              aria-label={showMiniMap ? "隐藏小地图" : "显示小地图"}
              aria-pressed={showMiniMap}
              className={getIconButtonClass(showMiniMap)}
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

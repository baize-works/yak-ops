import { linkupClientApi } from "@/pages/batch-link-up/type";
import {
  CloseOutlined, EditOutlined,
  FileSearchOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import {Button, Spin, Tooltip} from "antd";
import React, { FC, ReactNode } from "react";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

type RunLogInstanceType = "BATCH" | string;

type DrawerHeight = number | `${number}px` | `${number}vh`;

interface RunLogDrawerProps {
  open: boolean;
  onClose: () => void;

  title?: string;
  subtitle?: string;
  footer?: ReactNode;
  children?: ReactNode;

  /**
   * 任务实例 ID。
   * 离线任务：t_yak_ops_job_instance.id
   */
  instanceId?: string | number;

  /**
   * 实例类型。
   * BATCH: 离线任务实例
   */
  jobMode?: RunLogInstanceType;

  /**
   * 左侧菜单宽度。
   * 不想遮住左侧菜单时传 64。
   */
  leftOffset?: number;

  /**
   * 支持 number / px / vh。
   * 例如：
   * defaultHeight={560}
   * defaultHeight="560px"
   * defaultHeight="70vh"
   */
  defaultHeight?: DrawerHeight;
  minHeight?: DrawerHeight;
  maxHeight?: DrawerHeight;
}

const getResponseData = (response: any) => {
  return response?.data ?? response;
};

const getLogItemContent = (item: any) => {
  if (!item) {
    return "";
  }

  if (typeof item === "string") {
    return item;
  }

  return (
    item?.content ||
    item?.logContent ||
    item?.log ||
    item?.message ||
    item?.data ||
    ""
  );
};

const formatLogContent = (value: any) => {
  const data = getResponseData(value);

  if (!data) {
    return "";
  }

  if (typeof data === "string") {
    return data;
  }

  /**
   * 兼容后端返回：
   * {
   *   logs: [...]
   * }
   */
  if (Array.isArray(data?.logs)) {
    return formatLogContent(data.logs);
  }

  /**
   * 兼容 LinkUp Engine 返回：
   * [
   *   {
   *     node: "localhost:8080",
   *     logName: "job-xxx.log",
   *     logLink: "http://xxx/logs/job-xxx.log",
   *     content: "..."
   *   }
   * ]
   */
  if (Array.isArray(data)) {
    return data
      .map((item) => {
        if (typeof item === "string") {
          return item;
        }

        const header = [
          item?.node ? `# Node: ${item.node}` : "",
          item?.logName ? `# File: ${item.logName}` : "",
          item?.logLink ? `# Link: ${item.logLink}` : "",
        ]
          .filter(Boolean)
          .join("\n");

        const content = getLogItemContent(item);

        if (content) {
          return header ? `${header}\n\n${content}` : content;
        }

        return JSON.stringify(item, null, 2);
      })
      .filter(Boolean)
      .join("\n\n");
  }

  const content = getLogItemContent(data);

  if (content) {
    return String(content);
  }

  return JSON.stringify(data, null, 2);
};

const RunLogDrawer: FC<RunLogDrawerProps> = ({
  open,
  onClose,
  title = "运行日志",
  instanceId,
  jobMode = "BATCH",
  subtitle = "查看任务运行输出",
  footer,
  children,
  leftOffset = 64,
  defaultHeight = "70vh",
  minHeight = "40vh",
  maxHeight = "90vh",
}) => {
  const toPxHeight = useCallback((value: DrawerHeight, fallback: number) => {
    if (typeof value === "number") {
      return value;
    }

    if (typeof window === "undefined") {
      return fallback;
    }

    const text = String(value).trim();

    if (text.endsWith("vh")) {
      const num = Number.parseFloat(text);
      return Number.isFinite(num) ? (window.innerHeight * num) / 100 : fallback;
    }

    if (text.endsWith("px")) {
      const num = Number.parseFloat(text);
      return Number.isFinite(num) ? num : fallback;
    }

    return fallback;
  }, []);

  const getSafePanelHeight = useCallback(
    (height: number) => {
      const minPanelHeight = toPxHeight(minHeight, 260);
      const maxPanelHeight = toPxHeight(maxHeight, 880);

      return Math.max(minPanelHeight, Math.min(maxPanelHeight, height));
    },
    [maxHeight, minHeight, toPxHeight]
  );

  const [panelHeight, setPanelHeight] = useState(() =>
    getSafePanelHeight(toPxHeight(defaultHeight, 560))
  );
  const [isDragging, setIsDragging] = useState(false);

  const [loading, setLoading] = useState(false);
  const [logContent, setLogContent] = useState("");
  const [errorText, setErrorText] = useState("");

  const panelStyle = useMemo(
    () =>
      ({
        height: `${panelHeight}px`,
      } as React.CSSProperties),
    [panelHeight]
  );

  const wrapperStyle = useMemo(
    () =>
      ({
        left: leftOffset,
      } as React.CSSProperties),
    [leftOffset]
  );

  const loadLogs = useCallback(async () => {
    if (!open) {
      return;
    }

    if (!instanceId) {
      setLogContent("");
      setErrorText("当前任务暂无运行实例，无法查看日志");
      return;
    }

    try {
      setLoading(true);
      setErrorText("");
      setLogContent("");

      const response = await linkupClientApi.getLogsByInstanceId(
        instanceId,
        jobMode
      );

      if (response?.code !== 0) {
        const msg = response?.msg || response?.message || "获取日志失败";
        setErrorText(msg);
        return;
      }

      const content = formatLogContent(response?.data);

      setLogContent(content || "");
    } catch (error: any) {
      const msg = error?.message || "获取日志失败";
      setErrorText(msg);
    } finally {
      setLoading(false);
    }
  }, [open, instanceId, jobMode]);

  useEffect(() => {
    if (!open) {
      return;
    }

    setPanelHeight(getSafePanelHeight(toPxHeight(defaultHeight, 560)));
  }, [open, defaultHeight, getSafePanelHeight, toPxHeight]);

  useEffect(() => {
    if (!open) {
      return;
    }

    void loadLogs();
  }, [open, loadLogs]);

  useEffect(() => {
    if (!open || typeof window === "undefined") {
      return;
    }

    const handleResize = () => {
      setPanelHeight((prev) => getSafePanelHeight(prev));
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [open, getSafePanelHeight]);

  const handleMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();

    setIsDragging(true);

    const startY = event.clientY;
    const startHeight = panelHeight;
    const originalUserSelect = document.body.style.userSelect;
    const originalCursor = document.body.style.cursor;

    document.body.style.userSelect = "none";
    document.body.style.cursor = "row-resize";

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaY = startY - moveEvent.clientY;
      const nextHeight = getSafePanelHeight(startHeight + deltaY);

      setPanelHeight(nextHeight);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.body.style.userSelect = originalUserSelect;
      document.body.style.cursor = originalCursor;

      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  if (!open || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div
      className="fixed bottom-0 right-0 top-0 z-[9999] pointer-events-none"
      style={wrapperStyle}
    >
      <div className="absolute bottom-3 left-5 right-5 flex flex-col pointer-events-none">
        <div
          className="flex h-5 cursor-row-resize items-center justify-center pointer-events-auto"
          onMouseDown={handleMouseDown}
        >
          <div
            className={[
              "h-1 w-14 rounded-full transition-all duration-200",
              isDragging
                ? "bg-[#315efb] shadow-[0_8px_18px_rgba(49,94,251,0.2)]"
                : "bg-slate-300 hover:bg-slate-400",
            ].join(" ")}
          />
        </div>

        <section
          style={panelStyle}
          className={[
            "pointer-events-auto flex flex-col overflow-hidden rounded-[18px]",
            "border border-slate-200/90 bg-white",
            "shadow-[0_10px_30px_rgba(15,23,42,0.10)]",
          ].join(" ")}
        >
          <header className="flex h-[54px] items-center justify-between border-b border-slate-100 bg-white px-5">
            <div className="flex min-w-0 items-center gap-3">
              <Tooltip title="需要在log4j2.properties中开启rootLogger.appenderRef.file.ref = routingAppender">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#eef3ff] text-[#315efb]">
                    <FileSearchOutlined className="text-[15px]" />
                </div>
              </Tooltip>

              <div className="min-w-0">
                <div className="truncate text-[15px] font-semibold text-slate-900">
                  {title}
                </div>
                <div className="truncate text-xs text-slate-400">
                  {subtitle}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => void loadLogs()}
                disabled={loading}
                className={[
                  "flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs",
                  "text-slate-500 transition-all duration-200",
                  "hover:bg-slate-100 hover:text-slate-700",
                  loading ? "cursor-not-allowed opacity-60" : "",
                ].join(" ")}
              >
                <ReloadOutlined className={loading ? "animate-spin" : ""} />
                刷新
              </button>

              <button
                type="button"
                onClick={onClose}
                className={[
                  "flex h-8 w-8 items-center justify-center rounded-lg",
                  "text-slate-400 transition-all duration-200",
                  "hover:bg-slate-100 hover:text-slate-700",
                ].join(" ")}
                aria-label="关闭运行日志"
              >
                <CloseOutlined className="text-xs" />
              </button>
            </div>
          </header>

          <main className="min-h-0 flex-1 bg-[#fafbfc] p-4">
            {children ? (
              children
            ) : loading ? (
              <div className="flex h-full min-h-[180px] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white text-center">
                <Spin size="small" />
                <span className="ml-2 text-xs text-slate-400">
                  正在加载日志...
                </span>
              </div>
            ) : errorText ? (
              <div className="flex h-full min-h-[180px] flex-col items-center justify-center rounded-2xl border border-dashed border-red-100 bg-white text-center">
                <div className="text-sm font-medium text-red-500">
                  获取日志失败
                </div>
                <div className="mt-1 max-w-[520px] text-xs leading-5 text-slate-400">
                  {errorText}
                </div>
              </div>
            ) : logContent ? (
              <pre
                className={[
                  "h-full min-h-0 overflow-auto rounded-2xl border border-slate-800/90",
                  "bg-slate-950 p-4 text-xs leading-5 text-slate-100",
                  "font-mono",
                ].join(" ")}
              >
                {logContent}
              </pre>
            ) : (
              <div className="flex h-full min-h-[180px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white text-center">
                <div className="text-sm font-medium text-slate-600">
                  暂无日志
                </div>
                <div className="mt-1 text-xs text-slate-400">
                  当前任务实例暂未返回运行日志
                </div>
              </div>
            )}
          </main>

          {footer ? (
            <footer className="flex items-center justify-end gap-2 border-t border-slate-100 bg-white px-5 py-3">
              {footer}
            </footer>
          ) : null}
        </section>
      </div>
    </div>,
    document.body
  );
};

export default memo(RunLogDrawer);

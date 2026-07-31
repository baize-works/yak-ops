import { history, useLocation, useParams } from "@umijs/max";
import { Button, ConfigProvider, Empty, message, Spin } from "antd";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { fetchDataSourceAll } from "@/pages/data-source/service";
import type { DataSourceRecord } from "@/pages/data-source/types";
import { BRAND_THEME } from "@/styles/brand";

import { linkupJobDefinitionApi } from "../api";
import SyncTaskEditor from "./components/SyncTaskEditor";
import {
  buildSavePayload,
  endpointNode,
  extractSavedId,
  isApiSuccess,
  normalizeEditDetail,
  responseMessage,
  type SyncEditorState,
} from "./model";

/**
 * 查找当前元素真正所在的纵向滚动容器。
 *
 * Umi / ProLayout 页面通常不是 window 滚动，
 * 而是中间的内容区域滚动，因此不能只监听 window。
 */
const findScrollContainer = (
  element: HTMLElement,
): HTMLElement | Window => {
  let parent = element.parentElement;

  while (parent) {
    const style = window.getComputedStyle(parent);
    const overflowY = style.overflowY;

    if (/(auto|scroll|overlay)/.test(overflowY)) {
      return parent;
    }

    parent = parent.parentElement;
  }

  return window;
};

/**
 * 获取滚动容器可视区域的底部位置。
 */
const getScrollViewportBottom = (
  scrollContainer: HTMLElement | Window,
): number => {
  if (scrollContainer === window) {
    return window.innerHeight;
  }

  return (
    scrollContainer as HTMLElement
  ).getBoundingClientRect().bottom;
};

const validateTaskConfig = (
  editor: SyncEditorState,
): string | null => {
  if (!editor.basic.jobName.trim()) {
    return "请输入任务名称";
  }

  if (!editor.basic.sourceDataSourceId) {
    return "请选择来源数据源";
  }

  if (!editor.basic.targetDataSourceId) {
    return "请选择目标数据源";
  }

  const source =
    endpointNode(editor.workflow, "source")?.data?.config || {};

  const sink =
    endpointNode(editor.workflow, "sink")?.data?.config || {};

  if (editor.mode === "GUIDE_MULTI") {
    if (
      !source.tables?.length &&
      !source.tablePattern?.trim()
    ) {
      return "请选择来源表，或填写表名过滤规则";
    }

    if (
      sink.tableNamingRule !== "same_name" &&
      !sink.tableNameAffix?.trim()
    ) {
      return "请填写目标表名前缀或后缀";
    }
  } else if (source.readMode === "sql") {
    if (!source.sql?.trim()) {
      return "请填写来源查询 SQL";
    }
  } else if (!source.table) {
    return "请选择来源表";
  }

  if (editor.mode === "GUIDE_SINGLE") {
    if (sink.autoCreateTable) {
      if (!sink.targetTableName?.trim()) {
        return "请输入目标表名";
      }
    } else if (!sink.table) {
      return "请选择目标表";
    }
  }

  if (
    sink.writeMode === "upsert" &&
    !sink.primaryKey?.trim()
  ) {
    return "Upsert 写入模式需要配置主键字段";
  }

  if (
    !editor.env.parallelism ||
    editor.env.parallelism < 1
  ) {
    return "Channel 并发数必须大于 0";
  }

  return null;
};

export default function BatchLinkUpDetailPage() {
  const location = useLocation();
  const routeParams = useParams<{ id?: string }>();

  const actionBarRef = useRef<HTMLElement>(null);

  const taskId = useMemo(
    () =>
      routeParams.id ||
      new URLSearchParams(location.search).get("id") ||
      "",
    [location.search, routeParams.id],
  );

  const [editor, setEditor] =
    useState<SyncEditorState | null>(null);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [dataSourceLoading, setDataSourceLoading] =
    useState(false);

  const [dataSources, setDataSources] = useState<
    DataSourceRecord[]
  >([]);

  /**
   * 底部栏当前是否已经吸附。
   *
   * 这个状态主要用于控制阴影动画，不负责控制定位。
   * 真正的定位由 CSS sticky 完成。
   */
  const [actionBarStuck, setActionBarStuck] =
    useState(false);

  const loadDataSources = useCallback(async () => {
    try {
      setDataSourceLoading(true);

      const response = await fetchDataSourceAll();

      if (!isApiSuccess(response)) {
        message.error(
          responseMessage(response, "获取数据源失败"),
        );

        setDataSources([]);
        return;
      }

      setDataSources(response?.data?.bizData || []);
    } catch (error: any) {
      message.error(error?.message || "获取数据源失败");
      setDataSources([]);
    } finally {
      setDataSourceLoading(false);
    }
  }, []);

  const loadTask = useCallback(async () => {
    if (!taskId) return;

    try {
      setLoading(true);

      const response =
        await linkupJobDefinitionApi.selectEditDetail(taskId);

      if (!isApiSuccess(response) || !response?.data) {
        message.error(
          responseMessage(response, "获取同步任务失败"),
        );

        setEditor(null);
        return;
      }

      setEditor(
        normalizeEditDetail(response.data, taskId),
      );
    } catch (error: any) {
      message.error(error?.message || "获取同步任务失败");
      setEditor(null);
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    if (!taskId) return;

    void Promise.all([
      loadTask(),
      loadDataSources(),
    ]);
  }, [loadDataSources, loadTask, taskId]);

  /**
   * 检测 sticky 操作栏是否已经贴住滚动区域底部。
   *
   * 吸附时增加轻微顶部阴影；
   * 恢复普通文档流后，阴影平滑消失。
   */
  useEffect(() => {
    if (!editor) return;

    const actionBar = actionBarRef.current;

    if (!actionBar) return;

    const scrollContainer =
      findScrollContainer(actionBar);

    let animationFrameId = 0;

    const updateStickyState = () => {
      window.cancelAnimationFrame(animationFrameId);

      animationFrameId =
        window.requestAnimationFrame(() => {
          const actionBarRect =
            actionBar.getBoundingClientRect();

          const viewportBottom =
            getScrollViewportBottom(scrollContainer);

          const isVisible =
            actionBarRect.top < viewportBottom &&
            actionBarRect.bottom > 0;

          const isAtBottom =
            Math.abs(
              actionBarRect.bottom - viewportBottom,
            ) <= 3;

          const nextStuck = isVisible && isAtBottom;

          setActionBarStuck((previous) =>
            previous === nextStuck
              ? previous
              : nextStuck,
          );
        });
    };

    updateStickyState();

    scrollContainer.addEventListener(
      "scroll",
      updateStickyState,
      {
        passive: true,
      },
    );

    window.addEventListener(
      "resize",
      updateStickyState,
    );

    const resizeObserver =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(updateStickyState)
        : null;

    resizeObserver?.observe(actionBar);

    if (scrollContainer !== window) {
      resizeObserver?.observe(
        scrollContainer as HTMLElement,
      );
    }

    return () => {
      window.cancelAnimationFrame(animationFrameId);

      scrollContainer.removeEventListener(
        "scroll",
        updateStickyState,
      );

      window.removeEventListener(
        "resize",
        updateStickyState,
      );

      resizeObserver?.disconnect();
    };
  }, [editor]);

  const persistEditor = async (
    nextEditor: SyncEditorState,
  ): Promise<SyncEditorState | null> => {
    try {
      setSaving(true);

      const payload = buildSavePayload(nextEditor);

      const response =
        nextEditor.mode === "GUIDE_MULTI"
          ? await linkupJobDefinitionApi.saveOrUpdateGuideMulti(
              payload,
            )
          : await linkupJobDefinitionApi.saveOrUpdateGuideSingle(
              payload,
            );

      if (!isApiSuccess(response)) {
        message.error(
          responseMessage(
            response,
            "保存同步任务失败",
          ),
        );

        return null;
      }

      const savedEditor: SyncEditorState = {
        ...nextEditor,
        basic: payload.basic,
        id: extractSavedId(
          response,
          nextEditor.id,
        ),
      };

      setEditor(savedEditor);
      message.success("任务配置已保存");

      return savedEditor;
    } catch (error: any) {
      message.error(
        error?.message || "保存同步任务失败",
      );

      return null;
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (!editor) return;

    const error = validateTaskConfig(editor);

    if (error) {
      message.warning(error);
      return;
    }

    await persistEditor(editor);
  };

  const handleCancel = () => {
    history.push("/sync/batch-link-up");
  };

  if (!taskId) {
    history.replace("/sync/batch-link-up");
    return null;
  }

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-64px)] items-center justify-center bg-[#f7f8fa]">
        <Spin size="large" />
      </div>
    );
  }

  if (!editor) {
    return (
      <div className="flex min-h-[calc(100vh-64px)] items-center justify-center bg-[#f7f8fa]">
        <Empty
          description="未找到同步任务"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        >
          <Button onClick={handleCancel}>
            返回任务列表
          </Button>
        </Empty>
      </div>
    );
  }

  return (
    <ConfigProvider theme={BRAND_THEME}>
      <div className="min-h-[calc(100vh-64px)] bg-[#f7f8fa] text-[#161823]">
        {/*
          编辑内容和底部操作栏放进同一个宽度容器。

          这样操作栏不需要计算侧边栏宽度，
          也不会出现比上面任务区域更宽的问题。
        */}
        <div className="mx-auto w-full max-w-[1040px] px-6 pt-6">
          <main>
            <SyncTaskEditor
              editor={editor}
              dataSources={dataSources}
              dataSourceLoading={dataSourceLoading}
              onChange={setEditor}
            />
          </main>

          {/*
            初始状态：
            操作栏位于表单内容下方，并保留 16px 间距。

            向下滚动：
            当操作栏接触滚动区域底部时，通过 sticky 吸附。

            向上滚动：
            操作栏回到正常文档流，继续保留顶部 16px 间距。
          */}
          <footer
            ref={actionBarRef}
            className={[
              "sticky bottom-0 z-20 mt-4 overflow-hidden",
              "rounded-t-lg bg-white",
              "transition-[box-shadow] duration-300 ease-in-out",
              actionBarStuck
                ? "shadow-[0_-8px_10px_0_rgba(0,0,0,0.06)]"
                : "shadow-none",
            ].join(" ")}
          >
            <div className="flex min-h-[80px] items-center gap-3 px-8 py-4">
              <Button
                type="primary"
                loading={saving}
                className="!h-9 !min-w-[120px] !rounded-lg !px-6 !font-medium !text-white"
                onClick={handleSave}
              >
                保存配置
              </Button>

              <Button
                disabled={saving}
                className="!h-9 !min-w-[120px] !rounded-lg !border-0 !bg-[#f2f3f5] !px-5 !font-medium !text-[#344054] hover:!bg-[#e9eaec]"
                onClick={handleCancel}
              >
                取消
              </Button>
            </div>
          </footer>
        </div>
      </div>
    </ConfigProvider>
  );
}
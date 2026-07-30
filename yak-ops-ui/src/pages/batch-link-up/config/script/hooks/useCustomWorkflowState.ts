import { API_SUCCESS_CODE } from '@/services/http/response';
import {message} from "antd";

import {linkupJobDefinitionApi} from "@/pages/batch-link-up/api";
import {hoconTemplateApi} from "../hoconTemplateApi";
import {useEffect, useRef, useState, type Dispatch, type SetStateAction} from "react";
import {
  markJobDefinitionDirty,
  markJobDefinitionSynced,
  normalizeJobDefinitionState,
  type JobDefinitionState,
} from "../jobDefinitionState";

interface UseCustomWorkflowStateProps {
  params: any;
  setParams: Dispatch<SetStateAction<any>>;
  basicConfig: any;
  scheduleConfig: any;
  envConfig?: any;
}

type SaveResponseData = {
  id?: number | string;
  state?: JobDefinitionState;
};

const getSaveResponseData = (res: any): SaveResponseData => {
  const data = res?.data;

  /**
   * 兼容新版后端返回：
   * data = {
   *   id: 123,
   *   state: {
   *     editorSyncState: "SYNCED",
   *     releaseState: "OFFLINE",
   *     jobVersion: 1,
   *     contentVersion: 1
   *   }
   * }
   */
  if (data && typeof data === "object") {
    return {
      id:
        data.id ??
        data.jobDefineId ??
        data.jobDefinitionId ??
        data.definitionId,
      state: data.state,
    };
  }

  /**
   * 兼容旧版后端返回：
   * data = 123
   */
  return {
    id: data,
    state: undefined,
  };
};

const syncSessionCache = (id: number | string | undefined, data: any) => {
  if (!id) return;

  try {
    const cacheKey = `batch-link-up-detail-${id}`;
    sessionStorage.setItem(cacheKey, JSON.stringify(data));
  } catch (error) {
    console.warn("Update custom workflow session cache failed", error);
  }
};

export function useCustomWorkflowState({
                                         params,
                                         setParams,
                                         basicConfig,
                                         scheduleConfig,
                                         envConfig,
                                       }: UseCustomWorkflowStateProps) {
  const [activeTab, setActiveTab] = useState<any>(null);
  const [hoconContent, setHoconContent] = useState<string>("");

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewContent, setPreviewContent] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [templateLoading, setTemplateLoading] = useState(false);

  const [publishedJobDefineId, setPublishedJobDefineId] = useState<number | string | undefined>(params?.id);

  const [publishLoading, setPublishLoading] = useState(false);
  const [runLoading, setRunLoading] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  const initializedRef = useRef(false);
  const contentInitializedRef = useRef(false);

  useEffect(() => {
    if (params?.id) {
      setPublishedJobDefineId(params.id);
    }
  }, [params?.id]);

  useEffect(() => {
    if (contentInitializedRef.current) return;
    if (!params) return;

    const initialContent =
      params?.workflow?.hoconContent ||
      params?.content?.hoconContent ||
      params?.jobDefinitionInfo?.hoconContent ||
      params?.hoconContent ||
      "";

    if (initialContent?.trim()) {
      setHoconContent(initialContent);
      contentInitializedRef.current = true;
      return;
    }

    contentInitializedRef.current = true;
    void loadTemplate();
  }, [params]);

  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true;
      return;
    }

    setIsDirty(true);

    setParams((prev: any) => {
      if (!prev) return prev;

      return {
        ...prev,
        state: markJobDefinitionDirty(prev?.state),
      };
    });
  }, [basicConfig, scheduleConfig, envConfig, hoconContent]);

  const loadTemplate = async () => {
    const sourceDbType = basicConfig?.sourceType;
    const sourcePluginName = basicConfig?.sourcePluginName;
    const targetDbType = basicConfig?.targetType;
    const targetPluginName = basicConfig?.targetPluginName;

    if (
      !sourceDbType ||
      !sourcePluginName ||
      !targetDbType ||
      !targetPluginName
    ) {
      return;
    }

    try {
      setTemplateLoading(true);

      const res = await hoconTemplateApi.preview({
        sourceDbType,
        sourcePluginName,
        targetDbType,
        targetPluginName,
      });

      setHoconContent(res?.data?.fullTemplate || "");
    } catch (error) {
      console.error(error);
      message.warning("默认 HOCON 模板加载失败，请手动填写");
    } finally {
      setTemplateLoading(false);
    }
  };

  const buildFinalPayload = () => {
    return {
      id: params?.id ?? publishedJobDefineId,

      basic: {
        ...basicConfig,
        mode: "SCRIPT",
      },

      content: {
        scriptType: "HOCON",
        hoconContent,
      },

      workflow: {
        ...(params?.workflow || {}),
        hoconContent,
      },

      schedule: {
        ...scheduleConfig,
      },

      env: {
        jobMode: "BATCH",
        parallelism: 1,
        ...(envConfig || {}),
      },
    };
  };

  const validateBeforeSubmit = async () => {
    if (!hoconContent?.trim()) {
      message.warning("请先填写 HOCON 配置");
      return false;
    }

    return true;
  };

  const handleReloadTemplate = async () => {
    if (
      !basicConfig?.sourceType ||
      !basicConfig?.sourcePluginName ||
      !basicConfig?.targetType ||
      !basicConfig?.targetPluginName
    ) {
      message.warning("请先完成来源和目标类型配置");
      return;
    }

    await loadTemplate();
  };

  const handleSave = async () => {
    try {
      const pass = await validateBeforeSubmit();
      if (!pass) return;

      setPublishLoading(true);

      const finalPayload = buildFinalPayload();
      const res = await linkupJobDefinitionApi.saveOrUpdateScript(
        finalPayload
      );

      if (res?.code !== API_SUCCESS_CODE) {
        return;
      }

      const saveData = getSaveResponseData(res);
      const jobDefineId = saveData.id ?? finalPayload.id;

      if (!jobDefineId) {
        message.error("发布成功但未返回任务定义ID");
        return;
      }

      const syncedState = saveData.state
        ? normalizeJobDefinitionState(saveData.state)
        : markJobDefinitionSynced(params?.state);

      setPublishedJobDefineId(jobDefineId);
      setIsDirty(false);

      setParams((prev: any) => {
        const nextParams = {
          ...(prev || {}),
          id: jobDefineId,
          state: syncedState,

          workflow: {
            ...(prev?.workflow || {}),
            hoconContent,
          },

          content: {
            ...(prev?.content || {}),
            scriptType: "HOCON",
            hoconContent,
          },

          hoconContent,
        };

        /**
         * create 场景下页面数据来自 sessionStorage。
         * 发布成功后同步缓存，避免刷新后又回到 UNPUBLISHED。
         */
        syncSessionCache(prev?.id, nextParams);
        syncSessionCache(jobDefineId, nextParams);

        return nextParams;
      });

      message.success("发布成功");
    } catch (error) {
      console.error(error);
      message.error("发布失败");
    } finally {
      setPublishLoading(false);
    }
  };

  const handlePreview = async () => {
    try {
      const pass = await validateBeforeSubmit();
      if (!pass) return;

      setPreviewLoading(true);

      const finalPayload = buildFinalPayload();
      const res = await linkupJobDefinitionApi.buildScriptConfig(
        finalPayload
      );

      setPreviewContent(res?.data || hoconContent);
      setPreviewOpen(true);
    } catch (error) {
      console.error(error);
      message.error("预览失败");
    } finally {
      setPreviewLoading(false);
    }
  };

  const canRun =
    !!publishedJobDefineId && !isDirty && !publishLoading && !runLoading;

  const runDisabledReason = !publishedJobDefineId
    ? "请先发布任务，再执行"
    : isDirty
      ? "当前内容已变更，请重新发布后再执行"
      : "";

  const handleRun = async () => {
    const pass = await validateBeforeSubmit();
    if (!pass) return;

    if (!publishedJobDefineId) {
      message.warning("请先发布任务，再执行");
      return;
    }

    if (isDirty) {
      message.warning("当前内容已变更，请重新发布后再执行");
      return;
    }

    /**
     * 这里先保留原逻辑。
     * 后续可以替换成真实执行接口，比如 execute / run API。
     */
    message.success("运行校验通过，可继续接入执行逻辑");
  };

  return {
    activeTab,
    setActiveTab,

    hoconContent,
    setHoconContent,

    previewOpen,
    setPreviewOpen,
    previewContent,
    previewLoading,
    templateLoading,

    publishedJobDefineId,
    publishLoading,
    runLoading,
    isDirty,
    canRun,
    runDisabledReason,

    handleSave,
    handlePreview,
    handleReloadTemplate,
    handleRun,
  };
}

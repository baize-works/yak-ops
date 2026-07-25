import {linkupClientApi} from "@/pages/client/api";
import AddClientModal from "@/pages/client/components/AddClientModal";
import AddOrEditDataSourceModal from "@/pages/data-source/components/AddOrEditDataSourceModal";
import {fetchDataSourceOptions} from "@/pages/data-source/service";
import {DataSourceModalRef, DataSourceOperateType,} from "@/pages/data-source/types";
import {generateDataSourceOptions} from "@/pages/batch-link-up/DataSourceSelect";
import {CheckCircleOutlined, CloseCircleOutlined, LoadingOutlined,} from "@ant-design/icons";
import {Button, Form, message, Popover, Select} from "antd";
import React, {useCallback, useEffect, useMemo, useRef, useState,} from "react";

import "./client-link.less";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const MIN_AUTO_LOADING_DURATION = 450;
const MIN_MANUAL_LOADING_DURATION = 280;

export type ConnectivityStatus = "idle" | "loading" | "success" | "error";
export type LinkScene = "offline";

interface SelectOption {
  label: string;
  value: string;
}

interface VerifyItem {
  code?: string;
  name?: string;
  success?: boolean;
  actualValue?: string;
  expectedValue?: string;
  message?: string;
}

interface CommonClientLinkSectionProps {
  scene?: LinkScene;

  activeStep: "base" | "client";

  sourceType: any;
  targetType: any;

  sourceLabel: string;
  targetLabel: string;

  clientId: any;
  setClientId: (id: string) => void;

  handleSourceChange: (value: string, option: any) => void;
  handleTargetChange: (value: string, option: any) => void;

  sourceDataSourceId?: string;
  targetDataSourceId?: string;
  setSourceDataSourceId: (id?: string) => void;
  setTargetDataSourceId: (id?: string) => void;

  sourceTestStatus: ConnectivityStatus;
  targetTestStatus: ConnectivityStatus;
  setSourceTestStatus: (status: ConnectivityStatus) => void;
  setTargetTestStatus: (status: ConnectivityStatus) => void;

  sectionRef?: React.RefObject<HTMLDivElement>;

  clientLabel?: string;
  clientPlaceholder?: string;
  sourceTitle?: string;
  targetTitle?: string;
  sourceCreateText?: string;
  targetCreateText?: string;

  getVerifyExtraParams?: (params: {
    side: "source" | "target";
    triggerMode: "AUTO" | "MANUAL";
  }) => Record<string, any>;
}

const statusMap: Record<ConnectivityStatus,
  {
    text: string;
    dot: string;
    textClass: string;
    bgClass: string;
    icon?: React.ReactNode;
  }> = {
  idle: {
    text: "未测试",
    dot: "bg-slate-300",
    textClass: "text-slate-500",
    bgClass: "bg-slate-50",
  },
  loading: {
    text: "测试中",
    dot: "bg-blue-500",
    textClass: "text-blue-600",
    bgClass: "bg-blue-50",
    icon: <LoadingOutlined spin/>,
  },
  success: {
    text: "已通过",
    dot: "bg-emerald-500",
    textClass: "text-emerald-600",
    bgClass: "bg-emerald-50",
    icon: <CheckCircleOutlined/>,
  },
  error: {
    text: "失败",
    dot: "bg-rose-500",
    textClass: "text-rose-600",
    bgClass: "bg-rose-50",
    icon: <CloseCircleOutlined/>,
  },
};

const normalizeClientOptions = (data: any[]): SelectOption[] => {
  return data.map((item: any) => ({
    label: item.label ?? item.clientName ?? item.name ?? "",
    value: String(item.value ?? item.id ?? ""),
  }));
};

const VerifyItemsPopoverContent: React.FC<{ items?: VerifyItem[] }> = ({
                                                                         items = [],
                                                                       }) => {
  if (!items.length) {
    return (
      <div className="w-[280px] rounded-2xl bg-white p-1">
        <div
          className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-4 text-xs text-slate-500">
          暂无检查项详情，点击测试后可查看。
        </div>
      </div>
    );
  }

  const passedCount = items.filter((item) => item.success).length;
  const allPassed = passedCount === items.length;

  return (
    <div className="max-h-[560px] w-[380px] max-w-[72vw] overflow-hidden rounded-2xl bg-white">
      <div
        className="mb-3 flex items-start justify-between border-b border-slate-100"
        style={{padding: 8}}
      >
        <div>
          <div className="text-sm font-semibold text-slate-900">
            连通性检查详情
          </div>
          <div className="mt-1 text-xs text-slate-500">
            已通过{" "}
            <span className="font-semibold text-slate-700">
              {passedCount}/{items.length}
            </span>{" "}
            项
          </div>
        </div>

        <div
          className={[
            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
            allPassed
              ? "bg-teal-50 text-teal-700 ring-1 ring-teal-100"
              : "bg-amber-50 text-amber-700 ring-1 ring-amber-100",
          ].join(" ")}
        >
          <span
            className={[
              "h-1.5 w-1.5 rounded-full",
              allPassed ? "bg-teal-500" : "bg-amber-500",
            ].join(" ")}
          />
          {allPassed ? "全部通过" : "存在异常"}
        </div>
      </div>

      <div className="max-h-[330px] space-y-2 overflow-y-auto pr-1">
        {items.map((item, index) => {
          const success = !!item.success;

          return (
            <div
              key={`${item.code || item.name || "verify-item"}-${index}`}
              className={[
                "group relative overflow-hidden rounded-2xl border bg-white px-3 py-3 shadow-sm transition-all duration-200",
                success
                  ? "border-slate-200 hover:border-teal-200"
                  : "border-rose-100 hover:border-rose-200",
              ].join(" ")}
            >
              <div className="flex items-start gap-3 pl-1.5">
                <span
                  className={[
                    "mt-1.5 h-2 w-2 shrink-0 rounded-full shadow-sm",
                    success
                      ? "bg-teal-500 shadow-teal-200"
                      : "bg-rose-500 shadow-rose-200",
                  ].join(" ")}
                />

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="truncate text-xs font-semibold text-slate-800">
                      {item.name || "未命名检查项"}
                    </div>

                    <div
                      className={[
                        "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1",
                        success
                          ? "bg-teal-50 text-teal-700 ring-teal-100"
                          : "bg-rose-50 text-rose-700 ring-rose-100",
                      ].join(" ")}
                    >
                      {success ? "通过" : "失败"}
                    </div>
                  </div>

                  {item.message ? (
                    <div className="mt-1.5 text-xs leading-5 text-slate-500">
                      {item.message}
                    </div>
                  ) : null}

                  {(item.actualValue || item.expectedValue) && (
                    <div
                      className="mt-2.5 grid gap-1.5 rounded-xl border border-slate-100 bg-slate-50/80 px-2.5 py-2 text-[11px]">
                      {item.expectedValue ? (
                        <div className="flex gap-1.5">
                          <span className="shrink-0 text-slate-400">期望</span>
                          <span className="break-all text-slate-600">
                            {item.expectedValue}
                          </span>
                        </div>
                      ) : null}

                      {item.actualValue ? (
                        <div className="flex gap-1.5">
                          <span className="shrink-0 text-slate-400">实际</span>
                          <span className="break-all text-slate-600">
                            {item.actualValue}
                          </span>
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const SimpleStatus: React.FC<{
  status: ConnectivityStatus;
  items?: VerifyItem[];
}> = ({status, items = []}) => {
  const config = statusMap[status];
  const showPopover = status !== "idle" && items.length > 0;

  const content = (
    <div
      className={[
        "inline-flex h-7 w-[92px] cursor-default items-center justify-center gap-1.5 rounded-full px-2 text-xs font-medium",
        "transition-colors duration-300 ease-out",
        config.bgClass,
        config.textClass,
        showPopover ? "hover:shadow-sm" : "",
      ].join(" ")}
    >
      <span className="flex h-3.5 w-3.5 items-center justify-center">
        {status === "loading" ? (
          <LoadingOutlined spin className="text-[12px]"/>
        ) : (
          <span className={["h-2 w-2 rounded-full", config.dot].join(" ")}/>
        )}
      </span>

      <span className="w-[45px] text-center leading-none">{config.text}</span>

      <span className="flex h-4 w-5 items-center justify-center">
        {items.length > 0 ? (
          <span className="rounded-full bg-white/70 px-1 text-[10px] leading-4">
            {items.length}
          </span>
        ) : null}
      </span>
    </div>
  );

  if (!showPopover) return content;

  return (
    <Popover
      trigger="hover"
      placement="right"
      content={<VerifyItemsPopoverContent items={items}/>}
      overlayInnerStyle={{
        borderRadius: 18,
        padding: 12,
      }}
    >
      {content}
    </Popover>
  );
};

const LinkStatusAction: React.FC<{
  status: ConnectivityStatus;
  onTest?: () => void;
  reverse?: boolean;
}> = ({status, onTest, reverse = false}) => {
  const config = statusMap[status];

  return (
    <div
      className={[
        "flex h-9 shrink-0 items-center gap-2 rounded-full border border-slate-200 bg-white px-2 py-1 shadow-sm",
        reverse ? "flex-row-reverse" : "",
      ].join(" ")}
    >
      <Button
        type="text"
        size="small"
        className="!h-7 !w-[48px] !rounded-full !px-0 !text-slate-700 hover:!bg-slate-100"
        onClick={onTest}
      >
        测试
      </Button>

      <div
        className={[
          "inline-flex h-7 w-[75px] items-center justify-center gap-1.5 rounded-full px-2 text-xs font-medium",
          "transition-colors duration-300 ease-out",
          config.bgClass,
          config.textClass,
        ].join(" ")}
      >
        <span className="flex h-3.5 w-3.5 items-center justify-center">
          {status === "loading" ? (
            <LoadingOutlined spin className="text-[12px]"/>
          ) : (
            <span className={["h-2 w-2 rounded-full", config.dot].join(" ")}/>
          )}
        </span>

        <span className="w-[42px] text-center leading-none">{config.text}</span>
      </div>
    </div>
  );
};

const SectionCard: React.FC<{
  title: string;
  status?: ConnectivityStatus;
  verifyItems?: VerifyItem[];
  children: React.ReactNode;
  footer?: React.ReactNode;
}> = ({title, status, verifyItems, children, footer}) => {
  return (
    <section
      className="min-w-0 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="shrink-0 text-sm font-semibold text-slate-800">
            {title}
          </div>
          {status ? <SimpleStatus status={status} items={verifyItems}/> : null}
        </div>
      </div>

      <div className="flex min-h-[280px] flex-col px-4 py-4 md:min-h-[320px]">
        <div className="flex-1">{children}</div>
        {footer ? <div className="pt-4">{footer}</div> : null}
      </div>
    </section>
  );
};

const CreateDataSourceButton: React.FC<{
  text: string;
  onClick: () => void;
}> = ({text, onClick}) => {
  return (
    <Button
      block
      type="default"
      style={{marginTop: 8}}
      className={[
        "h-[32px] rounded-full px-3",
        "border border-[#D9D9D9] bg-white shadow-none",
        "text-[13px] font-normal text-slate-700",
        "hover:!border-[hsl(231_48%_48%)]",
        "hover:!bg-[hsl(231_48%_48%)]",
        "hover:!text-white",
        "focus:!border-[hsl(231_48%_48%)]",
        "focus:!text-[hsl(231_48%_48%)]",
      ].join(" ")}
      onMouseDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      <span className="inline-flex items-center justify-center gap-1.5">
        <span>{text}</span>
      </span>
    </Button>
  );
};

const CommonClientLinkSection: React.FC<CommonClientLinkSectionProps> = ({
                                                                           scene = "offline",

                                                                           activeStep,
                                                                           sourceType,
                                                                           targetType,
                                                                           sourceLabel,
                                                                           targetLabel,
                                                                           clientId,
                                                                           setClientId,
                                                                           handleSourceChange,
                                                                           handleTargetChange,
                                                                           sectionRef,

                                                                           sourceDataSourceId,
                                                                           targetDataSourceId,
                                                                           setSourceDataSourceId,
                                                                           setTargetDataSourceId,

                                                                           sourceTestStatus,
                                                                           targetTestStatus,
                                                                           setSourceTestStatus,
                                                                           setTargetTestStatus,

                                                                           clientLabel = "我的客户端",
                                                                           clientPlaceholder = "请选择 Zeta 客户端节点",
                                                                           sourceTitle = "来源",
                                                                           targetTitle = "去向",
                                                                           sourceCreateText = "新建来源数据源",
                                                                           targetCreateText = "新建去向数据源",

                                                                           getVerifyExtraParams,
                                                                         }) => {
  const [form] = Form.useForm();
  const [clientForm] = Form.useForm();

  const modalRef = useRef<DataSourceModalRef>(null);

  const autoTestKeyRef = useRef<{
    source?: string;
    target?: string;
  }>({});

  const dataSourceTypeOptions = useMemo(() => generateDataSourceOptions(), []);

  const [sourceDataSources, setSourceDataSources] = useState<any[]>([]);
  const [targetDataSources, setTargetDataSources] = useState<any[]>([]);

  const [sourceVerifyItems, setSourceVerifyItems] = useState<VerifyItem[]>([]);
  const [targetVerifyItems, setTargetVerifyItems] = useState<VerifyItem[]>([]);

  const [sourceLoading, setSourceLoading] = useState(false);
  const [targetLoading, setTargetLoading] = useState(false);

  const [clientOptions, setClientOptions] = useState<SelectOption[]>([]);
  const [clientLoading, setClientLoading] = useState(false);

  const [openAddModal, setOpenAddModal] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const resetSourceTestStatus = useCallback(() => {
    setSourceTestStatus("idle");
    setSourceVerifyItems([]);
  }, [setSourceTestStatus]);

  const resetTargetTestStatus = useCallback(() => {
    setTargetTestStatus("idle");
    setTargetVerifyItems([]);
  }, [setTargetTestStatus]);

  const loadClientOptions = useCallback(async () => {
    try {
      setClientLoading(true);

      const res = await linkupClientApi.option();
      const options = Array.isArray(res?.data)
        ? normalizeClientOptions(res.data)
        : [];

      setClientOptions(options);
      return options;
    } catch (error) {
      console.error("加载客户端节点失败:", error);
      setClientOptions([]);
      message.error("加载客户端节点失败");
      return [];
    } finally {
      setClientLoading(false);
    }
  }, []);

  const loadSourceOptions = useCallback(
    async (dbType?: string) => {
      if (!dbType) {
        setSourceDataSources([]);
        setSourceDataSourceId(undefined);
        form.setFieldValue("sourceId", undefined);
        resetSourceTestStatus();
        autoTestKeyRef.current.source = undefined;
        return [];
      }

      try {
        setSourceLoading(true);

        const res = await fetchDataSourceOptions(dbType);
        const nextData = Array.isArray(res?.data) ? res.data : [];

        setSourceDataSources(nextData);
        return nextData;
      } catch (error) {
        console.error("加载来源数据源失败:", error);
        setSourceDataSources([]);
        message.error("加载来源数据源失败");
        return [];
      } finally {
        setSourceLoading(false);
      }
    },
    [form, resetSourceTestStatus, setSourceDataSourceId]
  );

  const loadTargetOptions = useCallback(
    async (dbType?: string) => {
      if (!dbType) {
        setTargetDataSources([]);
        setTargetDataSourceId(undefined);
        form.setFieldValue("targetId", undefined);
        resetTargetTestStatus();
        autoTestKeyRef.current.target = undefined;
        return [];
      }

      try {
        setTargetLoading(true);

        const res = await fetchDataSourceOptions(dbType);
        const nextData = Array.isArray(res?.data) ? res.data : [];

        setTargetDataSources(nextData);
        return nextData;
      } catch (error) {
        console.error("加载目标数据源失败:", error);
        setTargetDataSources([]);
        message.error("加载目标数据源失败");
        return [];
      } finally {
        setTargetLoading(false);
      }
    },
    [form, resetTargetTestStatus, setTargetDataSourceId]
  );

  const sourceOptions = useMemo(
    () =>
      sourceDataSources.map((item) => ({
        label: item.name ?? item.label ?? "",
        value: String(item.id ?? item.value ?? ""),
      })),
    [sourceDataSources]
  );

  const targetOptions = useMemo(
    () =>
      targetDataSources.map((item) => ({
        label: item.name ?? item.label ?? "",
        value: String(item.id ?? item.value ?? ""),
      })),
    [targetDataSources]
  );

  const getConnectivityTestKey = useCallback(
    (type: "source" | "target", datasourceId?: string | number) => {
      const currentType = type === "source" ? sourceType : targetType;

      return [
        scene,
        type,
        clientId || "",
        datasourceId || "",
        currentType?.pluginName || "",
        currentType?.connectorType || "",
      ].join("__");
    },
    [scene, clientId, sourceType, targetType]
  );

  const runConnectivityTest = useCallback(
    async (
      type: "source" | "target",
      datasourceId?: string | number,
      options?: {
        silent?: boolean;
        triggerMode?: "AUTO" | "MANUAL";
        forceRefresh?: boolean;
      }
    ) => {
      if (!clientId) {
        if (!options?.silent) {
          message.warning("请先选择客户端节点");
        }
        return false;
      }

      if (
        datasourceId === undefined ||
        datasourceId === null ||
        datasourceId === ""
      ) {
        if (!options?.silent) {
          message.warning(
            type === "source" ? "请先选择来源数据源" : "请先选择目标数据源"
          );
        }
        return false;
      }

      const startedAt = Date.now();
      const triggerMode = options?.triggerMode || "MANUAL";

      const minLoadingDuration =
        triggerMode === "AUTO"
          ? MIN_AUTO_LOADING_DURATION
          : MIN_MANUAL_LOADING_DURATION;

      const shouldClearItems = triggerMode === "MANUAL";
      const isAuto = triggerMode === "AUTO";

      if (type === "source") {
        setSourceTestStatus("loading");
        if (shouldClearItems) setSourceVerifyItems([]);
      } else {
        setTargetTestStatus("loading");
        if (shouldClearItems) setTargetVerifyItems([]);
      }

      const showLoading = () => {
        if (type === "source") {
          setSourceTestStatus("loading");
          if (!isAuto) setSourceVerifyItems([]);
        } else {
          setTargetTestStatus("loading");
          if (!isAuto) setTargetVerifyItems([]);
        }
      };

      let loadingTimer: ReturnType<typeof setTimeout> | undefined;

      if (isAuto) {
        loadingTimer = setTimeout(showLoading, 120);
      } else {
        showLoading();
      }

      try {
        const currentType = type === "source" ? sourceType : targetType;

        const extraParams =
          getVerifyExtraParams?.({
            side: type,
            triggerMode,
          }) || {};

        const res = await linkupClientApi.verifyDatasource(clientId, {
          datasourceId,
          pluginName: currentType?.pluginName,
          connectorType: currentType?.connectorType,
          role: type === "source" ? "SOURCE" : "SINK",
          triggerMode,
          forceRefresh: options?.forceRefresh ?? false,
          scene,
          ...extraParams,
        });

        if (loadingTimer) {
          clearTimeout(loadingTimer);
        }

        const elapsed = Date.now() - startedAt;
        const remain = minLoadingDuration - elapsed;

        if (remain > 0) {
          await sleep(remain);
        }

        const success = !!res?.data?.success;
        const items = Array.isArray(res?.data?.items) ? res.data.items : [];

        if (type === "source") {
          setSourceTestStatus(success ? "success" : "error");
          setSourceVerifyItems(items);
        } else {
          setTargetTestStatus(success ? "success" : "error");
          setTargetVerifyItems(items);
        }

        if (!success && !options?.silent) {
          message.error(res?.data?.message || "连通性测试未通过");
        }

        return success;
      } catch (error) {
        if (loadingTimer) {
          clearTimeout(loadingTimer);
        }

        const elapsed = Date.now() - startedAt;
        const remain = minLoadingDuration - elapsed;

        if (remain > 0) {
          await sleep(remain);
        }

        const errorItem: VerifyItem = {
          code: "REQUEST_ERROR",
          name: "请求异常",
          success: false,
          actualValue: "接口请求失败",
          expectedValue: "接口正常返回",
          message: "连通性测试失败，请稍后重试",
        };

        console.error("连通性测试失败:", error);

        if (type === "source") {
          setSourceTestStatus("error");
          setSourceVerifyItems([errorItem]);
        } else {
          setTargetTestStatus("error");
          setTargetVerifyItems([errorItem]);
        }

        if (!options?.silent) {
          message.error("连通性测试失败，请稍后重试");
        }

        return false;
      }
    },
    [
      clientId,
      scene,
      sourceType,
      targetType,
      getVerifyExtraParams,
      setSourceTestStatus,
      setTargetTestStatus,
    ]
  );

  const triggerConnectivityTest = useCallback(
    async (type: "source" | "target", datasourceId?: string | number) => {
      if (!clientId || !datasourceId) return;

      const key = getConnectivityTestKey(type, datasourceId);
      autoTestKeyRef.current[type] = key;

      await runConnectivityTest(type, datasourceId, {
        triggerMode: "AUTO",
      });
    },
    [clientId, getConnectivityTestKey, runConnectivityTest]
  );

  useEffect(() => {
    loadClientOptions();
  }, [loadClientOptions]);

  useEffect(() => {
    if (!clientOptions.length) return;

    if (!clientId) {
      setClientId(clientOptions[0].value);
      autoTestKeyRef.current = {};
      resetSourceTestStatus();
      resetTargetTestStatus();
    }
  }, [
    clientOptions,
    clientId,
    setClientId,
    resetSourceTestStatus,
    resetTargetTestStatus,
  ]);

  useEffect(() => {
    loadSourceOptions(sourceType?.dbType);
  }, [sourceType?.dbType, loadSourceOptions]);

  useEffect(() => {
    loadTargetOptions(targetType?.dbType);
  }, [targetType?.dbType, loadTargetOptions]);

  useEffect(() => {
    if (!sourceOptions.length) {
      if (sourceDataSourceId) {
        setSourceDataSourceId(undefined);
        form.setFieldValue("sourceId", undefined);
        resetSourceTestStatus();
        autoTestKeyRef.current.source = undefined;
      }
      return;
    }

    const hasCurrentValue = sourceOptions.some(
      (item) => item.value === sourceDataSourceId
    );

    if (!sourceDataSourceId || !hasCurrentValue) {
      const firstValue = sourceOptions[0]?.value;

      setSourceDataSourceId(firstValue);
      form.setFieldValue("sourceId", firstValue);
      resetSourceTestStatus();
      autoTestKeyRef.current.source = undefined;
    }
  }, [
    sourceOptions,
    sourceDataSourceId,
    form,
    setSourceDataSourceId,
    resetSourceTestStatus,
  ]);

  useEffect(() => {
    if (!targetOptions.length) {
      if (targetDataSourceId) {
        setTargetDataSourceId(undefined);
        form.setFieldValue("targetId", undefined);
        resetTargetTestStatus();
        autoTestKeyRef.current.target = undefined;
      }
      return;
    }

    const hasCurrentValue = targetOptions.some(
      (item) => item.value === targetDataSourceId
    );

    if (!targetDataSourceId || !hasCurrentValue) {
      const firstValue = targetOptions[0]?.value;

      setTargetDataSourceId(firstValue);
      form.setFieldValue("targetId", firstValue);
      resetTargetTestStatus();
      autoTestKeyRef.current.target = undefined;
    }
  }, [
    targetOptions,
    targetDataSourceId,
    form,
    setTargetDataSourceId,
    resetTargetTestStatus,
  ]);

  useEffect(() => {
    form.setFieldsValue({
      sourceType: sourceType?.dbType,
      targetType: targetType?.dbType,
      sourceId: sourceDataSourceId,
      targetId: targetDataSourceId,
      clientId,
    });
  }, [
    form,
    sourceType?.dbType,
    targetType?.dbType,
    sourceDataSourceId,
    targetDataSourceId,
    clientId,
  ]);

  useEffect(() => {
    if (activeStep !== "client") return;
    if (!clientId) return;
    if (!sourceDataSourceId && !targetDataSourceId) return;

    const runAutoTest = async () => {
      if (sourceDataSourceId) {
        const sourceKey = getConnectivityTestKey("source", sourceDataSourceId);

        if (autoTestKeyRef.current.source !== sourceKey) {
          autoTestKeyRef.current.source = sourceKey;

          await runConnectivityTest("source", sourceDataSourceId, {
            silent: true,
            triggerMode: "AUTO",
          });
        }
      }

      if (targetDataSourceId) {
        const targetKey = getConnectivityTestKey("target", targetDataSourceId);

        if (autoTestKeyRef.current.target !== targetKey) {
          autoTestKeyRef.current.target = targetKey;

          await runConnectivityTest("target", targetDataSourceId, {
            silent: true,
            triggerMode: "AUTO",
          });
        }
      }
    };

    runAutoTest();
  }, [
    activeStep,
    clientId,
    sourceDataSourceId,
    targetDataSourceId,
    getConnectivityTestKey,
    runConnectivityTest,
  ]);

  const handleCreateClient = async () => {
    try {
      const values = await clientForm.validateFields();

      setConfirmLoading(true);

      const res = await linkupClientApi.saveOrUpdate(values);

      if (res?.code !== 0) {
        message.error(res?.msg || "创建 Client 失败");
        return;
      }

      message.success("Client 创建成功");

      setOpenAddModal(false);
      clientForm.resetFields();

      const options = await loadClientOptions();

      const newClientId =
        res?.data?.id ??
        res?.data?.value ??
        (typeof res?.data === "string" || typeof res?.data === "number"
          ? res.data
          : undefined);

      if (newClientId) {
        const nextClientId = String(newClientId);
        const exists = options.some((item) => item.value === nextClientId);

        if (exists) {
          setClientId(nextClientId);
          autoTestKeyRef.current = {};
          resetSourceTestStatus();
          resetTargetTestStatus();
          return;
        }
      }

      if (!clientId && options.length) {
        setClientId(options[0].value);
        autoTestKeyRef.current = {};
        resetSourceTestStatus();
        resetTargetTestStatus();
      }
    } catch (error: any) {
      if (error?.errorFields) return;
      message.error(error?.message || "创建 Client 失败");
    } finally {
      setConfirmLoading(false);
    }
  };

  const handleCreateDataSource = (side: "source" | "target") => {
    const dbType = side === "source" ? sourceType?.dbType : targetType?.dbType;

    if (!dbType) {
      message.warning(
        side === "source" ? "请先选择来源类型" : "请先选择去向类型"
      );
      return;
    }

    modalRef.current?.open({
      operateType: "CREATE" as DataSourceOperateType,
      dbType,
      hideBack: true,
      onSuccess: async () => {
        const nextData =
          side === "source"
            ? await loadSourceOptions(dbType)
            : await loadTargetOptions(dbType);

        const createdValue = nextData?.[0]?.id ?? nextData?.[0]?.value;

        if (!createdValue) return;

        const nextValue = String(createdValue);

        if (side === "source") {
          setSourceDataSourceId(nextValue);
          form.setFieldValue("sourceId", nextValue);
          resetSourceTestStatus();
          autoTestKeyRef.current.source = undefined;
        } else {
          setTargetDataSourceId(nextValue);
          form.setFieldValue("targetId", nextValue);
          resetTargetTestStatus();
          autoTestKeyRef.current.target = undefined;
        }
      },
    });
  };

  const renderDataSourceSelect = (side: "source" | "target") => {
    const isSource = side === "source";

    return (
      <Form.Item
        name={isSource ? "sourceId" : "targetId"}
        label="数据源名称"
        required
      >
        <Select
          value={isSource ? sourceDataSourceId : targetDataSourceId}
          onChange={(value) => {
            if (isSource) {
              setSourceDataSourceId(value);
              form.setFieldValue("sourceId", value);
              resetSourceTestStatus();
              autoTestKeyRef.current.source = undefined;
              triggerConnectivityTest("source", value);
            } else {
              setTargetDataSourceId(value);
              form.setFieldValue("targetId", value);
              resetTargetTestStatus();
              autoTestKeyRef.current.target = undefined;
              triggerConnectivityTest("target", value);
            }
          }}
          className="w-full"
          placeholder={isSource ? "请选择来源数据源" : "请选择去向数据源"}
          loading={isSource ? sourceLoading : targetLoading}
          showSearch
          options={isSource ? sourceOptions : targetOptions}
          dropdownRender={(menu) => (
            <>
              {menu}

              <div className="border-t border-slate-100 bg-white px-2 py-1">
                <CreateDataSourceButton
                  text={isSource ? sourceCreateText : targetCreateText}
                  onClick={() => handleCreateDataSource(side)}
                />
              </div>
            </>
          )}
        />
      </Form.Item>
    );
  };

  return (
    <>
      <div ref={sectionRef} className="bg-white px-4 py-6 md:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-[1480px] space-y-6">
          <div
            className="overflow-hidden rounded-[28px] border border-slate-200 bg-gradient-to-b from-slate-50 to-white px-4 py-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] md:px-6 md:py-5">
            <div className="overflow-x-auto">
              <div className="flex min-w-[760px] items-center justify-center gap-4 text-sm text-slate-700">
                <span className="shrink-0 font-medium text-slate-900">
                  {sourceLabel || "数据来源"}
                </span>

                <div className="flex items-center gap-3">
                  <div className="h-px w-8 bg-slate-300 md:w-10"/>
                  <LinkStatusAction
                    status={sourceTestStatus}
                    onTest={() =>
                      runConnectivityTest("source", sourceDataSourceId, {
                        triggerMode: "MANUAL",
                        forceRefresh: true,
                      })
                    }
                  />
                  <div className="h-px w-8 bg-slate-300 md:w-10"/>
                </div>

                <span className="shrink-0 font-medium text-slate-900">
                  {clientLabel}
                </span>

                <div className="flex items-center gap-3">
                  <div className="h-px w-8 bg-slate-300 md:w-10"/>
                  <LinkStatusAction
                    status={targetTestStatus}
                    onTest={() =>
                      runConnectivityTest("target", targetDataSourceId, {
                        triggerMode: "MANUAL",
                        forceRefresh: true,
                      })
                    }
                    reverse
                  />
                  <div className="h-px w-8 bg-slate-300 md:w-10"/>
                </div>

                <span className="shrink-0 font-medium text-slate-900">
                  {targetLabel || "数据去向"}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3 xl:gap-6">
            <SectionCard
              title={sourceTitle}
              status={sourceTestStatus}
              verifyItems={sourceVerifyItems}
              footer={
                <Button
                  className="w-full !rounded-full"
                  onClick={() =>
                    runConnectivityTest("source", sourceDataSourceId, {
                      triggerMode: "MANUAL",
                      forceRefresh: true,
                    })
                  }
                  loading={sourceTestStatus === "loading"}
                  disabled={!sourceDataSourceId || !clientId}
                  type="primary"
                >
                  测试连通性
                </Button>
              }
            >
              <Form form={form} layout="vertical">
                <div className="space-y-4">
                  <Form.Item name="sourceType" label="数据源类型" required>
                    <Select
                      value={sourceType?.dbType}
                      onChange={(value, option) => {
                        handleSourceChange(value, option);
                        setSourceDataSourceId(undefined);
                        form.setFieldValue("sourceId", undefined);
                        resetSourceTestStatus();
                        autoTestKeyRef.current.source = undefined;
                      }}
                      className="w-full"
                      showSearch
                      placeholder="请选择来源类型"
                      options={dataSourceTypeOptions}
                    />
                  </Form.Item>

                  {renderDataSourceSelect("source")}
                </div>
              </Form>
            </SectionCard>

            <SectionCard
              title="客户端"
              footer={
                <Button
                  className="w-full !rounded-full"
                  onClick={() => setOpenAddModal(true)}
                >
                  新建客户端
                </Button>
              }
            >
              <div className="space-y-4">
                <div>
                  <div className="mb-2 text-sm font-medium text-slate-700">
                    客户端节点
                  </div>

                  <Select
                    value={clientId}
                    onChange={(value) => {
                      setClientId(value);
                      autoTestKeyRef.current = {};
                      resetSourceTestStatus();
                      resetTargetTestStatus();
                    }}
                    className="w-full"
                    showSearch
                    placeholder={clientPlaceholder}
                    loading={clientLoading}
                    options={clientOptions}
                  />
                </div>

                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4">
                  <div className="text-sm font-medium text-slate-800">
                    当前已选择 {clientId ? "1" : "0"} 个节点
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    任务会在你选择的客户端节点上进行连通性校验。
                  </div>
                </div>
              </div>
            </SectionCard>

            <SectionCard
              title={targetTitle}
              status={targetTestStatus}
              verifyItems={targetVerifyItems}
              footer={
                <Button
                  className="w-full !rounded-full"
                  onClick={() =>
                    runConnectivityTest("target", targetDataSourceId, {
                      triggerMode: "MANUAL",
                      forceRefresh: true,
                    })
                  }
                  loading={targetTestStatus === "loading"}
                  disabled={!targetDataSourceId || !clientId}
                  type="primary"
                >
                  测试连通性
                </Button>
              }
            >
              <Form form={form} layout="vertical">
                <div className="space-y-4">
                  <Form.Item name="targetType" label="数据源类型" required>
                    <Select
                      value={targetType?.dbType}
                      onChange={(value, option) => {
                        handleTargetChange(value, option);
                        setTargetDataSourceId(undefined);
                        form.setFieldValue("targetId", undefined);
                        resetTargetTestStatus();
                        autoTestKeyRef.current.target = undefined;
                      }}
                      className="w-full"
                      showSearch
                      placeholder="请选择去向类型"
                      options={dataSourceTypeOptions}
                    />
                  </Form.Item>

                  {renderDataSourceSelect("target")}
                </div>
              </Form>
            </SectionCard>
          </div>
        </div>
      </div>

      <AddClientModal
        open={openAddModal}
        form={clientForm}
        confirmLoading={confirmLoading}
        onCancel={() => {
          setOpenAddModal(false);
          clientForm.resetFields();
        }}
        onSubmit={handleCreateClient}
      />

      <AddOrEditDataSourceModal ref={modalRef}/>
    </>
  );
};

export default CommonClientLinkSection;

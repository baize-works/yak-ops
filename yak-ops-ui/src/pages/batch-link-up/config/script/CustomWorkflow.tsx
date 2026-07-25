import {ArrowLeftOutlined, SendOutlined} from "@ant-design/icons";
import {Button, Popconfirm, Popover, Space, Tooltip} from "antd";
import {Eye, FileCode2, PlayCircle, RefreshCw} from "lucide-react";
import React from "react";

import {EnvConfig} from "../../workflow/components/ScheduleConfigContent/types";
import CodeBlockWithCopy from "../../workflow/operator/CodeBlockWithCopy";
import RightConfigPanel from "../../workflow/RightConfigPanel";
import {useResizablePanel} from "../multi/hooks/useResizablePanel";
import HoconEditorPanel from "./HoconEditorPanel";
import {useCustomWorkflowState} from "./hooks/useCustomWorkflowState";
import {
  canRunByDefinitionState,
  getRunDisabledReasonByState,
  markJobDefinitionDirty,
  normalizeJobDefinitionState,
} from "./jobDefinitionState";

interface CustomWorkflowProps {
  params: any;
  setParams: React.Dispatch<React.SetStateAction<any>>;
  goBack: () => void;
  basicConfig: any;
  setBasicConfig: React.Dispatch<React.SetStateAction<any>>;
  scheduleConfig: any;
  setScheduleConfig: React.Dispatch<React.SetStateAction<any>>;
  envConfig: EnvConfig;
  setEnvConfig: React.Dispatch<React.SetStateAction<EnvConfig>>;
}

export default function CustomWorkflow({
                                         params,
                                         setParams,
                                         goBack,
                                         basicConfig,
                                         setBasicConfig,
                                         scheduleConfig,
                                         setScheduleConfig,
                                         envConfig,
                                         setEnvConfig,
                                       }: CustomWorkflowProps) {
  const {rightWidth, handleResizeStart} = useResizablePanel(520);

  const {
    activeTab,
    setActiveTab,

    hoconContent,
    setHoconContent,

    previewOpen,
    setPreviewOpen,
    previewContent,
    previewLoading,
    templateLoading,

    publishLoading,
    canRun,
    runDisabledReason,

    handleSave,
    handlePreview,
    handleReloadTemplate,
    handleRun,
  } = useCustomWorkflowState({
    params,
    setParams,
    basicConfig,
    scheduleConfig,
    envConfig,
  });

  const jobState = normalizeJobDefinitionState(params?.state);

  const canRunByState = canRunByDefinitionState(jobState);
  const finalCanRun = canRun && canRunByState;

  const finalRunDisabledReason = !canRunByState
    ? getRunDisabledReasonByState(jobState)
    : runDisabledReason;

  const publishStatusView = {
    UNPUBLISHED: {
      text: "未发布",
      tooltip: "当前任务还没有发布到数据库，暂时不能运行",
      className: "border-amber-200 bg-amber-50 text-amber-600",
    },
    SYNCED: {
      text: "已发布",
      tooltip: "当前内容已同步到数据库，可以运行",
      className: "border-emerald-200 bg-emerald-50 text-emerald-600",
    },
    DIRTY: {
      text: "已修改，未发布",
      tooltip: "当前页面内容已变更，需要重新发布后才能运行",
      className: "border-blue-200 bg-blue-50 text-blue-600",
    },
  }[jobState.editorSyncState];

  const markCurrentDefinitionDirty = () => {
    setParams((prev: any) => {
      return {
        ...prev,
        state: markJobDefinitionDirty(prev?.state),
      };
    });
  };

  const handleHoconContentChange = (value: string) => {
    setHoconContent(value);

    if (value === hoconContent) {
      return;
    }

    markCurrentDefinitionDirty();
  };

  const handleReloadTemplateWithDirty = async () => {
    await handleReloadTemplate();
    markCurrentDefinitionDirty();
  };

  const handleBasicConfigChange: React.Dispatch<React.SetStateAction<any>> = (
    next
  ) => {
    setBasicConfig(next);
    markCurrentDefinitionDirty();
  };

  const handleScheduleConfigChange: React.Dispatch<React.SetStateAction<any>> = (
    next
  ) => {
    setScheduleConfig(next);
    markCurrentDefinitionDirty();
  };

  const handleEnvConfigChange: React.Dispatch<React.SetStateAction<EnvConfig>> = (
    next
  ) => {
    setEnvConfig(next);
    markCurrentDefinitionDirty();
  };

  const actionButtonClass =
    "!inline-flex !h-[34px] !items-center !justify-center !rounded-full !border !border-slate-200 !bg-slate-50 !px-3.5 !text-[13px] !font-medium !text-slate-500 transition-colors duration-200 hover:!border-slate-300 hover:!bg-white/80 hover:!text-slate-700 hover:!shadow-[0_4px_12px_rgba(15,23,42,0.05)] disabled:!cursor-not-allowed disabled:!border-slate-200 disabled:!bg-slate-100 disabled:!text-slate-400 disabled:!shadow-none";

  const actionChipClass =
    "inline-flex h-[34px] cursor-pointer select-none items-center justify-center rounded-full border border-slate-200 bg-slate-50 px-3.5 text-[13px] font-medium leading-none text-slate-500 transition-colors duration-200 hover:border-slate-300 hover:bg-white/80 hover:text-slate-700 hover:shadow-[0_4px_12px_rgba(15,23,42,0.05)] active:translate-y-0";

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-white">
      <div className="shrink-0 border-b border-slate-100 bg-white px-6 pb-4 pt-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3.5">
            <div
              className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-indigo-50 text-indigo-600">
              <FileCode2 size={18}/>
            </div>

            <div>
              <div className="mb-0 text-[20px] font-bold leading-[1.2] text-slate-900">
                自定义编排任务
              </div>
              <div className="text-[14px] leading-6 text-slate-500">
                直接编写 HOCON 配置，并补充基础信息、调度策略与运行参数。
              </div>
            </div>
          </div>

          <div>
            <Button
              type="text"
              icon={<ArrowLeftOutlined/>}
              onClick={goBack}
              className="!h-10 !rounded-full !border !border-slate-200 !bg-white !px-4 !text-slate-700 !shadow-sm hover:!border-slate-300 hover:!bg-slate-50 hover:!text-slate-800"
            >
              返回上一步
            </Button>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden p-[18px]">
        <div
          className="h-full overflow-hidden rounded-xl border border-slate-200 bg-gradient-to-b from-white via-white to-slate-50 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
          <div className="flex h-full min-w-0 items-stretch">
            <div className="h-full min-w-0 flex-1 overflow-hidden">
              <div
                className="flex h-full flex-col overflow-hidden rounded-lg bg-white shadow-[0_4px_18px_rgba(15,23,42,0.03)]">
                <div
                  className="flex h-14 shrink-0 items-center justify-between border-b border-slate-100 bg-gradient-to-b from-white to-slate-50 px-[18px]">
                  <div>
                    <div className="text-[15px] font-semibold text-slate-800">
                      HOCON 编排
                    </div>

                    <div className="mt-0.5 text-[12px] text-slate-400">
                      自定义脚本模式，适合复杂链路与高级参数配置
                    </div>
                  </div>

                  <Space size={10}>
                    <Tooltip title={finalRunDisabledReason || undefined}>
                      <span className="inline-flex">
                        <Button
                          type="default"
                          icon={<PlayCircle size={15} strokeWidth={1.9}/>}
                          onClick={handleRun}
                          disabled={!finalCanRun}
                          className={actionButtonClass}
                        >
                          运行
                        </Button>
                      </span>
                    </Tooltip>

                    <Popover
                      open={previewOpen}
                      placement="leftTop"
                      trigger="click"
                      overlayClassName="st-hocon-popover"
                      content={
                        <div className="w-[700px]">
                          <CodeBlockWithCopy
                            content={previewContent}
                            height={670}
                            title="HOCON Preview"
                            onClose={() => setPreviewOpen(false)}
                          />
                        </div>
                      }
                    >
                      <div
                        className={actionChipClass}
                        onClick={handlePreview}
                        role="button"
                        tabIndex={0}
                      >
                        <Eye
                          size={15}
                          strokeWidth={1.9}
                          className={previewLoading ? "animate-spin" : ""}
                        />
                        <span className="ml-1">预览</span>
                      </div>
                    </Popover>

                    {hoconContent?.trim() ? (
                      <Popconfirm
                        title="重新生成模板"
                        description="重新生成将覆盖当前编辑器内容，是否继续？"
                        okText="覆盖"
                        cancelText="取消"
                        placement="bottomRight"
                        onConfirm={handleReloadTemplateWithDirty}
                      >
                        <div
                          className={actionChipClass}
                          role="button"
                          tabIndex={0}
                        >
                          <RefreshCw
                            size={15}
                            strokeWidth={1.9}
                            className={templateLoading ? "animate-spin" : ""}
                          />
                          <span className="ml-1">模板</span>
                        </div>
                      </Popconfirm>
                    ) : (
                      <div
                        className={actionChipClass}
                        onClick={handleReloadTemplateWithDirty}
                        role="button"
                        tabIndex={0}
                      >
                        <RefreshCw
                          size={15}
                          strokeWidth={1.9}
                          className={templateLoading ? "animate-spin" : ""}
                        />
                        <span className="ml-1">模板</span>
                      </div>
                    )}

                    <Tooltip title={publishStatusView.tooltip}>
                      <span
                        className={[
                          "inline-flex h-[34px] select-none items-center justify-center rounded-full border px-3 text-[13px] font-medium leading-none",
                          publishStatusView.className,
                        ].join(" ")}
                      >
                        {publishStatusView.text}
                      </span>
                    </Tooltip>

                    <Button
                      type="default"
                      icon={<SendOutlined/>}
                      onClick={handleSave}
                      loading={publishLoading}
                      className={actionButtonClass}
                    >
                      发布
                    </Button>
                  </Space>
                </div>

                <div className="min-h-0 flex-1 p-[18px]">
                  <div
                    className="h-full overflow-hidden rounded-2xl bg-white shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
                    <HoconEditorPanel
                      value={hoconContent}
                      onChange={handleHoconContentChange}
                      sourceDbType={basicConfig?.sourceType}
                      sinkDbType={basicConfig?.targetType}
                    />
                  </div>
                </div>
              </div>
            </div>

            {activeTab && (
              <div
                className="relative flex w-[20px] shrink-0 cursor-col-resize items-center justify-center bg-transparent transition-colors duration-100 hover:bg-[rgba(49,94,251,0.04)]"
                onMouseDown={handleResizeStart}
                role="separator"
                aria-orientation="vertical"
                aria-label="调整左右面板宽度"
              >
                <div className="h-full w-px bg-slate-200 transition-colors duration-100"/>
                <div
                  className="absolute left-1/2 top-1/2 flex h-[46px] w-5 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center gap-1 rounded-full border border-slate-200 bg-white opacity-90 shadow-sm transition-all duration-200 hover:opacity-100 hover:shadow-[0_10px_28px_rgba(15,23,42,0.1)]">
                  <span className="block h-1 w-1 rounded-full bg-slate-400"/>
                  <span className="block h-1 w-1 rounded-full bg-slate-400"/>
                </div>
              </div>
            )}

            <div
              className="h-full shrink-0 overflow-hidden"
              style={{width: activeTab ? rightWidth : 58}}
            >
              <RightConfigPanel
                activeTab={activeTab}
                onTabChange={setActiveTab}
                params={params}
                basicConfig={basicConfig}
                setBasicConfig={handleBasicConfigChange}
                scheduleConfig={scheduleConfig}
                setScheduleConfig={handleScheduleConfigChange}
                envConfig={envConfig}
                setEnvConfig={handleEnvConfigChange}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

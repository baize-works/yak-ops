import {openPrettyNotification} from "@/utils/prettyNotification";
import {Form} from "antd";
import BaseInfoSection from "./components/BaseInfoSection";
import BottomActionBar from "./components/BottomActionBar";
import ClientLinkSection from "./components/ClientLinkSection";
import PageHeader from "./components/PageHeader";
import {STEP_THEME} from "./constants";
import useDetailPage from "./hooks/useDetailPage";

export type ConnectivityStatus = "idle" | "loading" | "success" | "error";

const DetailPage = () => {
  const {
    form,
    params,
    sourceType,
    targetType,
    activeStep,
    sourceClientId,
    targetClientId,
    clientId,
    sourceLabel,
    targetLabel,
    mode,
    scrollRef,
    clientSectionRef,
    setActiveStep,
    setSourceClientId,
    setTargetClientId,
    setClientId,
    handleSourceChange,
    handleTargetChange,
    handleModeChange,
    goBack,
    goStep,
    handleNext,
    sourceTestStatus,
    targetTestStatus,
    setSourceTestStatus,
    setTargetTestStatus,
    sourceDataSourceId,
    targetDataSourceId,
    setSourceDataSourceId,
    setTargetDataSourceId,
  } = useDetailPage();

  if (!params) {
    return <div className="p-6 text-[#667085]">暂无数据</div>;
  }

  const isBaseStep = activeStep === "base";
  const isClientStep = activeStep === "client";
  const isBaseDone = activeStep === "client";

  const basePillClass = isBaseStep
    ? STEP_THEME.base.pill
    : isBaseDone
      ? STEP_THEME.base.pillDone
      : STEP_THEME.base.pillInactive;

  const baseDotClass = isBaseStep
    ? STEP_THEME.base.dot
    : isBaseDone
      ? STEP_THEME.base.dotDone
      : STEP_THEME.base.dotInactive;

  const clientPillClass = isClientStep
    ? STEP_THEME.client.pill
    : STEP_THEME.client.pillInactive;

  const clientDotClass = isClientStep
    ? STEP_THEME.client.dot
    : STEP_THEME.client.dotInactive;

  const nextText = (() => {
    if (isBaseStep) return "下一步：客户端链接配置";
    if (mode === "GUIDE_MULTI") return "进入多表配置";
    if (mode === "SCRIPT") return "进入脚本配置";
    return "进入单表配置";
  })();

  const hintText = (() => {
    if (isBaseStep) return "先完成基础配置，再进入客户端链接配置";
    if (mode === "GUIDE_MULTI") {
      return "确认客户端链接关系后，将进入多表向导配置";
    }
    if (mode === "SCRIPT") {
      return "确认客户端链接关系后，将进入脚本配置";
    }
    return "确认客户端链接关系后，将进入单表向导配置";
  })();

  const canGoNextFromClient =
    sourceTestStatus === "success" && targetTestStatus === "success";

  const handleNextWithGuard = async () => {
    if (activeStep === "client" && !canGoNextFromClient) {
      if (sourceTestStatus !== "success" && targetTestStatus !== "success") {
        openPrettyNotification({
          type: "warning",
          title: "操作警告",
          description: "请先完成来源和去向的连通性测试，并确保都通过",
        });
        return;
      }

      if (sourceTestStatus !== "success") {
        openPrettyNotification({
          type: "warning",
          title: "操作警告",
          description: "请先完成来源的连通性测试，并确保都通过",
        });
        return;
      }

      if (targetTestStatus !== "success") {
        openPrettyNotification({
          type: "warning",
          title: "操作警告",
          description: "请先完成去向的连通性测试，并确保都通过",
        });
        return;
      }
    }

    await handleNext();
  };

  const stepProgress = activeStep === "client" ? "100%" : "0%";

  return (
    <div className="min-h-screen bg-white">
      <PageHeader onBack={goBack}/>

      <div className="mx-auto max-w-[1540px] px-6 pb-28 pt-6">
        <div className="sticky top-0 z-20 mb-6 bg-white/95 pt-1 backdrop-blur">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => goStep("base")}
              className={[
                "flex items-center gap-2 rounded-full px-3 py-1.5 text-sm transition-all duration-200",
                basePillClass,
              ].join(" ")}
            >
              <span
                className={[
                  "flex h-5 w-5 items-center justify-center rounded-full text-[12px] font-semibold transition-all duration-200",
                  baseDotClass,
                ].join(" ")}
              >
                1
              </span>
              基础配置
            </button>

            <div className="relative h-[2px] flex-1 overflow-hidden rounded-full bg-[#EAECF0]">
              <div
                className="absolute left-0 top-0 h-full rounded-full transition-[width] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
                style={{
                  width: stepProgress,
                  background: "rgba(23,92,211,0.25)",
                }}
              />
            </div>

            <button
              type="button"
              onClick={() => goStep("client")}
              className={[
                "flex items-center gap-2 rounded-full px-3 py-1.5 text-sm transition-all duration-200",
                clientPillClass,
              ].join(" ")}
            >
              <span
                className={[
                  "flex h-5 w-5 items-center justify-center rounded-full text-[12px] font-semibold transition-all duration-200",
                  clientDotClass,
                ].join(" ")}
              >
                2
              </span>
              客户端链接配置
            </button>
          </div>
        </div>

        <div
          ref={scrollRef}
          style={{height: "calc(100vh - 260px)", overflow: "auto"}}
        >
          <Form form={form} layout="vertical">
            <div
              className="overflow-hidden rounded-[24px] border border-[#EAECF0] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
              {isBaseStep && (
                <BaseInfoSection
                  sourceType={sourceType}
                  targetType={targetType}
                  handleSourceChange={handleSourceChange}
                  handleTargetChange={handleTargetChange}
                  mode={mode}
                  setMode={handleModeChange}
                />
              )}

              {isClientStep && (
                <ClientLinkSection
                  sectionRef={clientSectionRef}
                  activeStep={activeStep}
                  sourceType={sourceType}
                  targetType={targetType}
                  sourceLabel={sourceLabel}
                  targetLabel={targetLabel}
                  sourceClientId={sourceClientId}
                  targetClientId={targetClientId}
                  clientId={clientId}
                  setSourceClientId={setSourceClientId}
                  setTargetClientId={setTargetClientId}
                  setClientId={setClientId}
                  handleSourceChange={handleSourceChange}
                  handleTargetChange={handleTargetChange}
                  sourceDataSourceId={sourceDataSourceId}
                  targetDataSourceId={targetDataSourceId}
                  setSourceDataSourceId={setSourceDataSourceId}
                  setTargetDataSourceId={setTargetDataSourceId}
                  sourceTestStatus={sourceTestStatus}
                  targetTestStatus={targetTestStatus}
                  setSourceTestStatus={setSourceTestStatus}
                  setTargetTestStatus={setTargetTestStatus}
                />
              )}
            </div>
          </Form>
        </div>
      </div>

      <BottomActionBar
        onCancel={goBack}
        onNext={handleNextWithGuard}
        onPrev={isClientStep ? () => setActiveStep("base") : undefined}
        nextText={nextText}
        hintText={hintText}
        nextDisabled={isClientStep && !canGoNextFromClient}
      />
    </div>
  );
};

export default DetailPage;

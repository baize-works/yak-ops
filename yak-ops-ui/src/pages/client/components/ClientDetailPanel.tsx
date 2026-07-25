import {ApiOutlined, ReloadOutlined} from "@ant-design/icons";
import {Button, Empty} from "antd";
import {AnimatePresence} from "framer-motion";
import React, {useMemo} from "react";
import {BLUE, contentSwapVariants, MotionDiv} from "../constants";
import ClientMetricsSection from "./ClientMetricsSection";

interface Props {
  selectedClient: any;
  selectedClientId?: number;
  metrics: any;
  metricsLoading: boolean;
  onRefresh: (id?: number) => void;
}

const getHealthMeta = (healthStatus?: number) => {
  if (healthStatus === 1) {
    return {
      dot: "bg-emerald-500",
      badge: "border-emerald-200 bg-emerald-50 text-emerald-700",
      label: "Healthy",
      desc: "节点运行正常，可用于任务提交与监控。",
    };
  }

  if (healthStatus === 2) {
    return {
      dot: "bg-amber-500",
      badge: "border-amber-200 bg-amber-50 text-amber-700",
      label: "Warning",
      desc: "节点当前存在轻微异常，建议关注运行状态。",
    };
  }

  return {
    dot: "bg-rose-500",
    badge: "border-rose-200 bg-rose-50 text-rose-700",
    label: "Down",
    desc: "节点当前不可用，请检查地址、进程或网络连接。",
  };
};

const ClientDetailPanel: React.FC<Props> = ({
                                              selectedClient,
                                              selectedClientId,
                                              metrics,
                                              metricsLoading,
                                              onRefresh,
                                            }) => {
  const healthMeta = useMemo(
    () => getHealthMeta(selectedClient?.healthStatus),
    [selectedClient?.healthStatus]
  );

  const displayBaseUrl = useMemo(() => {
    if (!selectedClient?.baseUrl) return "--";
    return selectedClient.baseUrl.replace(/^https?:\/\//, "");
  }, [selectedClient?.baseUrl]);

  const clientName = selectedClient?.clientName || "Client 详情";
  const engineType = selectedClient?.engineType || "ZETA";
  const clientVersion = selectedClient?.clientVersion;

  if (!selectedClient) {
    return (
      <div
        className="flex min-h-full items-center justify-center rounded-2xl border border-dashed border-[#D0D5DD] bg-[#FCFCFD]">
        <Empty description="请选择左侧 Client 查看详情"/>
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      <MotionDiv
        key={selectedClientId || "empty-client"}
        initial="hidden"
        animate="visible"
        exit="exit"
        variants={contentSwapVariants}
        className="min-h-full"
      >
        <section
          className="mb-6 rounded-2xl border border-[#EAECF0] bg-white px-6 py-6 shadow-[0_8px_24px_rgba(16,24,40,0.045)]">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div className="min-w-0 flex-1">
              <div className="flex items-start gap-4">
                <div
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl"
                  style={{
                    background:
                      "linear-gradient(135deg, #EEF4FF 0%, #F8FAFF 100%)",
                    color: BLUE,
                  }}
                >
                  <ApiOutlined className="text-[19px]"/>
                </div>

                <div className="min-w-0 flex-1 pt-0.5">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h1 className="m-0 max-w-[420px] truncate text-[21px] font-semibold leading-8 text-[#101828]">
                      {clientName}
                    </h1>

                    {clientVersion && (
                      <span
                        className="inline-flex h-6 items-center rounded-full border border-[#DFE7F3] bg-[#F7FAFF] px-2.5 text-[12px] font-medium text-[#4F5BD5]">
                        v{clientVersion}
                      </span>
                    )}

                    <span
                      className={`inline-flex h-6 items-center gap-1.5 rounded-full border px-2.5 text-[12px] font-medium ${healthMeta.badge}`}
                    >
                      <span
                        className={`inline-block h-1.5 w-1.5 rounded-full ${healthMeta.dot}`}
                      />
                      {healthMeta.label}
                    </span>
                  </div>

                  <div className="mt-1.5 text-[13px] text-[#98A2B3]">
                    {engineType} Engine Client
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <div
                      className="
                inline-flex max-w-full items-center gap-2 rounded-full
                border border-[#E7EDF4]
                px-3 py-1.5
                text-[13px] font-medium text-[#344054]
              "
                      style={{backgroundColor: "#FAFBFC"}}
                    >
                      <span className={`inline-block h-2 w-2 shrink-0 rounded-full ${healthMeta.dot}`}/>
                      <span className="break-all">{displayBaseUrl}</span>
                    </div>
                  </div>

                  <div className="mt-2.5 flex items-center gap-2 text-[13px] leading-5 text-[#667085]">
                    <span
                      className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${healthMeta.dot}`}
                    />
                    <span className="text-[#667085]">{healthMeta.desc}</span>
                  </div>
                </div>
              </div>
            </div>

            <Button
              icon={<ReloadOutlined/>}
              loading={metricsLoading}
              onClick={() => onRefresh(selectedClientId)}
              className="
        h-10 rounded-full border-[#E4E7EC] px-4
        text-[13px] font-medium text-[#475467]
        shadow-[0_2px_8px_rgba(16,24,40,0.04)]
        transition-all duration-200
        hover:!border-[#CBD5E1] hover:!text-[#344054]
      "
            >
              刷新指标
            </Button>
          </div>
        </section>

        <ClientMetricsSection
          metrics={metrics}
          metricsLoading={metricsLoading}
        />
      </MotionDiv>
    </AnimatePresence>
  );
};

export default ClientDetailPanel;

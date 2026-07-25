import React from "react";
import ClickSpark from "@/components/ClickSpark";
import AddClientModal from "./components/AddClientModal";
import ClientPageHeader from "./components/ClientPageHeader";
import ClientListPanel from "./components/ClientListPanel";
import ClientDetailPanel from "./components/ClientDetailPanel";
import {BORDER_COLOR, CARD_BG, PAGE_BG} from "./constants";
import {useClientPageState} from "./hooks/useClientPageState";

const ClientPageTailwind: React.FC = () => {
  const {
    clients,
    selectedClientId,
    setSelectedClientId,
    selectedClient,
    confirmLoading,
    metricsLoading,
    openAddModal,
    setOpenAddModal,
    editingClient,
    deleteLoadingId,
    metrics,
    form,
    handleOpenCreate,
    handleOpenEdit,
    handleDeleteClient,
    handleSaveClient,
    handleCancelModal,
    loadClientMetrics,
  } = useClientPageState();

  return (
    <ClickSpark
      sparkColor="hsl(231 48% 48%)"
      sparkSize={10}
      sparkRadius={15}
      sparkCount={8}
      duration={400}
      easing="ease-out"
      extraScale={1}
    >
      <div
        className="h-[calc(100vh-48px)]"
        style={{background: PAGE_BG}}
      >
        <div className="box-border px-6 py-6">
          <ClientPageHeader onAdd={handleOpenCreate}/>

          <div
            style={{
              background: CARD_BG,
              border: `1px solid ${BORDER_COLOR}`,
              borderRadius: 24,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "300px 1fr",
                minHeight: "calc(100vh - 80px)",
              }}
            >
              <ClientListPanel
                clients={clients}
                selectedClientId={selectedClientId}
                onSelect={setSelectedClientId}
                onEdit={handleOpenEdit}
                onDelete={handleDeleteClient}
                deleteLoadingId={deleteLoadingId}
              />

              <div className="min-w-0 p-6">
                {!selectedClient ? (
                  <div className="flex h-full min-h-[520px] items-center justify-center">
                    <div className="max-w-[420px] text-center">
                      <div className="text-[28px] font-bold tracking-[-0.03em] text-[#172033]">
                        选择一个 Client
                      </div>
                      <div className="mt-3 text-[14px] leading-8 text-[#667085]">
                        左侧选择节点后，可查看基础信息、健康状态与核心运行指标。
                      </div>
                    </div>
                  </div>
                ) : (
                  <ClientDetailPanel
                    selectedClient={selectedClient}
                    selectedClientId={selectedClientId}
                    metrics={metrics}
                    metricsLoading={metricsLoading}
                    onRefresh={loadClientMetrics}
                  />
                )}
              </div>
            </div>
          </div>
        </div>

        <AddClientModal
          open={openAddModal}
          form={form}
          mode={editingClient ? "edit" : "create"}
          initialValues={editingClient}
          confirmLoading={confirmLoading}
          onCancel={handleCancelModal}
          onSubmit={handleSaveClient}
        />
      </div>
    </ClickSpark>
  );
};

export default ClientPageTailwind;

import {Drawer} from "antd";
import BasicInfoSection from "./components/BasicInfoSection";
import PromptSection from "./components/PromptSection";
import QualityPointDrawerHeader from "./components/QualityPointDrawerHeader";
import RelationSection from "./components/RelationSection";
import type {QualityPointDrawerProps} from "./types";
import {useQualityPointDrawer} from "./useQualityPointDrawer";

const QualityPointDrawer = ({
                              open,
                              qualityPoint,
                              onClose,
                              onUpdate,
                            }: QualityPointDrawerProps) => {
  const drawer = useQualityPointDrawer({
    qualityPoint,
    onClose,
    onUpdate,
  });

  if (!drawer.currentPoint) {
    return null;
  }

  return (
    <Drawer
      open={open}
      onClose={drawer.close}
      width="min(640px, 100vw)"
      closable={false}
      maskClosable={!drawer.editing && !drawer.saving}
      styles={{body: {padding: 0}}}
    >
      <div className="flex min-h-full flex-col bg-white">
        <QualityPointDrawerHeader
          point={drawer.currentPoint}
          draft={drawer.draft}
          editing={drawer.editing}
          saving={drawer.saving}
          canSave={drawer.canSave}
          updateDraft={drawer.updateDraft}
          onStartEdit={drawer.startEdit}
          onCancelEdit={drawer.cancelEdit}
          onSave={drawer.save}
          onClose={drawer.close}
        />

        <div className="flex-1 overflow-y-auto px-6 py-6">
          <BasicInfoSection
            point={drawer.currentPoint}
            draft={drawer.draft}
            editing={drawer.editing}
            updateDraft={drawer.updateDraft}
          />

          <RelationSection
            point={drawer.currentPoint}
            draft={drawer.draft}
            editing={drawer.editing}
            updateDraft={drawer.updateDraft}
          />

          <PromptSection
            point={drawer.currentPoint}
            editing={drawer.editing}
            promptTab={drawer.promptTab}
            onPromptTabChange={drawer.setPromptTab}
            updateDraft={drawer.updateDraft}
          />
        </div>
      </div>
    </Drawer>
  );
};

export default QualityPointDrawer;

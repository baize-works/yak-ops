import {useEffect, useMemo, useState} from "react";
import type {QualityPoint} from "./model";
import type {PromptTab, QualityPointDrawerProps, UpdateQualityPointDraft,} from "./types";
import {cloneQualityPoint, normalizeQualityPoint,} from "./utils";

type UseQualityPointDrawerParams = Pick<QualityPointDrawerProps,
  "qualityPoint" | "onClose" | "onUpdate">;

export const useQualityPointDrawer = ({
                                        qualityPoint,
                                        onClose,
                                        onUpdate,
                                      }: UseQualityPointDrawerParams) => {
  const [promptTab, setPromptTab] =
    useState<PromptTab>("system");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] =
    useState<QualityPoint | null>(null);

  useEffect(() => {
    if (!qualityPoint) {
      setDraft(null);
      setEditing(false);
      return;
    }

    setDraft(cloneQualityPoint(qualityPoint));
    setEditing(false);
    setPromptTab("system");
  }, [qualityPoint]);

  const updateDraft: UpdateQualityPointDraft = (
    key,
    value,
  ) => {
    setDraft((current) =>
      current
        ? {
          ...current,
          [key]: value,
        }
        : current,
    );
  };

  const startEdit = () => {
    if (!qualityPoint) {
      return;
    }

    setDraft(cloneQualityPoint(qualityPoint));
    setEditing(true);
  };

  const cancelEdit = () => {
    if (saving) {
      return;
    }

    setDraft(
      qualityPoint
        ? cloneQualityPoint(qualityPoint)
        : null,
    );
    setEditing(false);
  };

  const save = async () => {
    if (!draft || saving) {
      return;
    }

    const nextQualityPoint =
      normalizeQualityPoint(draft);

    if (
      !nextQualityPoint.title ||
      !nextQualityPoint.documentType
    ) {
      return;
    }

    setSaving(true);

    try {
      await onUpdate(nextQualityPoint);
    } finally {
      setSaving(false);
    }
  };

  const close = () => {
    if (saving) {
      return;
    }

    setEditing(false);
    onClose();
  };

  const currentPoint =
    editing && draft ? draft : qualityPoint;

  const canSave = useMemo(
    () =>
      Boolean(draft?.title.trim()) &&
      Boolean(draft?.documentType.trim()) &&
      !saving,
    [draft, saving],
  );

  return {
    promptTab,
    setPromptTab,
    editing,
    saving,
    draft,
    currentPoint,
    canSave,
    updateDraft,
    startEdit,
    cancelEdit,
    save,
    close,
  };
};

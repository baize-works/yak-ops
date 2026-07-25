import {Input} from "antd";
import {FileText, Loader2, Pencil, Save, X,} from "lucide-react";
import type {QualityPoint} from "../model";
import {typeLabelMap} from "../model";
import type {UpdateQualityPointDraft} from "../types";

interface QualityPointDrawerHeaderProps {
  point: QualityPoint;
  draft: QualityPoint | null;
  editing: boolean;
  saving: boolean;
  canSave: boolean;
  updateDraft: UpdateQualityPointDraft;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSave: () => Promise<void>;
  onClose: () => void;
}

const QualityPointDrawerHeader = ({
                                    point,
                                    draft,
                                    editing,
                                    saving,
                                    canSave,
                                    updateDraft,
                                    onStartEdit,
                                    onCancelEdit,
                                    onSave,
                                    onClose,
                                  }: QualityPointDrawerHeaderProps) => {
  return (
    <header className="border-b border-slate-100 px-6 pb-5 pt-6">
      <div className="flex items-start justify-between gap-5">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium tracking-wide text-slate-400">
            {editing ? "编辑质控点" : "质控点详情"}
          </p>

          {editing ? (
            <Input
              value={draft?.title ?? ""}
              onChange={(event) =>
                updateDraft("title", event.target.value)
              }
              placeholder="请输入质控点名称"
              className="mt-2"
              maxLength={200}
            />
          ) : (
            <h2 className="mt-2 text-xl font-semibold leading-8 tracking-[-0.02em] text-slate-950">
              {point.title}
            </h2>
          )}

          {!editing && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span
                className="inline-flex h-7 items-center rounded-full bg-slate-950 px-3 text-xs font-medium text-white">
                {typeLabelMap[point.type]}
              </span>

              <span
                className="inline-flex h-7 items-center gap-1.5 rounded-full bg-slate-100 px-3 text-xs font-medium text-slate-600">
                <FileText className="h-3.5 w-3.5"/>
                {point.documentType}
              </span>
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {editing ? (
            <>
              <button
                type="button"
                disabled={saving}
                onClick={onCancelEdit}
                className="inline-flex h-9 items-center justify-center rounded-lg px-3 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
              >
                取消
              </button>

              <button
                type="button"
                disabled={!canSave}
                onClick={() => void onSave()}
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-slate-950 px-3 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin"/>
                ) : (
                  <Save className="h-4 w-4"/>
                )}
                {saving ? "保存中" : "保存"}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onStartEdit}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950"
            >
              <Pencil className="h-4 w-4"/>
              更新
            </button>
          )}

          <button
            type="button"
            aria-label="关闭质控点详情"
            disabled={saving}
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-400 transition-colors duration-200 hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <X className="h-4 w-4"/>
          </button>
        </div>
      </div>
    </header>
  );
};

export default QualityPointDrawerHeader;

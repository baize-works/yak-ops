import {Input, Select} from "antd";
import type {QualityPoint} from "../model";
import {typeLabelMap} from "../model";
import type {UpdateQualityPointDraft} from "../types";

const {TextArea} = Input;

const qualityTypeOptions = (
  Object.entries(typeLabelMap) as Array<[QualityPoint["type"], string]>
).map(([value, label]) => ({value, label}));

interface BasicInfoSectionProps {
  point: QualityPoint;
  draft: QualityPoint | null;
  editing: boolean;
  updateDraft: UpdateQualityPointDraft;
}

const BasicInfoSection = ({
                            point,
                            draft,
                            editing,
                            updateDraft,
                          }: BasicInfoSectionProps) => {
  return (
    <section className="border-b border-slate-100 pb-6">
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="min-w-0">
          <p className="text-xs text-slate-400">
            适用文书
          </p>

          {editing ? (
            <Input
              value={draft?.documentType ?? ""}
              onChange={(event) =>
                updateDraft(
                  "documentType",
                  event.target.value,
                )
              }
              placeholder="请输入适用文书"
              className="mt-2"
            />
          ) : (
            <p className="mt-1.5 text-sm font-medium text-slate-700">
              {point.documentType}
            </p>
          )}
        </div>

        <div className="min-w-0">
          <p className="text-xs text-slate-400">
            质控类型
          </p>

          {editing ? (
            <Select
              value={draft?.type}
              options={qualityTypeOptions}
              onChange={(value) =>
                updateDraft("type", value)
              }
              className="mt-2 w-full"
            />
          ) : (
            <p className="mt-1.5 text-sm font-medium text-slate-700">
              {typeLabelMap[point.type]}
            </p>
          )}
        </div>
      </div>

      <div className="mt-6">
        <p className="text-xs text-slate-400">
          质控说明
        </p>

        {editing ? (
          <TextArea
            value={draft?.description ?? ""}
            onChange={(event) =>
              updateDraft(
                "description",
                event.target.value,
              )
            }
            placeholder="请输入质控说明"
            autoSize={{minRows: 3, maxRows: 8}}
            className="mt-2"
          />
        ) : (
          <p className="mt-2 text-sm leading-7 text-slate-600">
            {point.description || "暂无质控说明"}
          </p>
        )}
      </div>
    </section>
  );
};

export default BasicInfoSection;

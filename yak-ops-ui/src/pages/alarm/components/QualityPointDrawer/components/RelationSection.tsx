import {Select} from "antd";
import {ScrollText, Shapes} from "lucide-react";
import type {ReactNode} from "react";
import type {QualityPoint} from "../model";
import type {UpdateQualityPointDraft} from "../types";
import RelationItem from "./RelationItem";

const tokenSeparators = [",", "，", ";", "；"];

interface RelationSectionProps {
  point: QualityPoint;
  draft: QualityPoint | null;
  editing: boolean;
  updateDraft: UpdateQualityPointDraft;
}

const RelationSection = ({
                           point,
                           draft,
                           editing,
                           updateDraft,
                         }: RelationSectionProps) => {
  return (
    <section className="border-b border-slate-100 py-6">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-slate-950">
          关联范围
        </h3>
        <p className="mt-1 text-xs leading-5 text-slate-400">
          模型判断该质控点时需要读取的病历位置。
        </p>
      </div>

      {editing ? (
        <div className="grid gap-5 sm:grid-cols-2">
          <RelationTagInput
            icon={
              <ScrollText className="h-3.5 w-3.5"/>
            }
            label="关联段落"
            value={draft?.relatedSections ?? []}
            onChange={(values) =>
              updateDraft("relatedSections", values)
            }
          />

          <RelationTagInput
            icon={<Shapes className="h-3.5 w-3.5"/>}
            label="关联元素"
            value={draft?.relatedElements ?? []}
            onChange={(values) =>
              updateDraft("relatedElements", values)
            }
          />
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2">
          <RelationItem
            icon={
              <ScrollText className="h-3.5 w-3.5"/>
            }
            label="关联段落"
            values={point.relatedSections}
          />

          <RelationItem
            icon={<Shapes className="h-3.5 w-3.5"/>}
            label="关联元素"
            values={point.relatedElements}
          />
        </div>
      )}
    </section>
  );
};

interface RelationTagInputProps {
  icon: ReactNode;
  label: string;
  value: string[];
  onChange: (values: string[]) => void;
}

const RelationTagInput = ({
                            icon,
                            label,
                            value,
                            onChange,
                          }: RelationTagInputProps) => (
  <div>
    <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-slate-500">
      {icon}
      {label}
    </div>

    <Select
      mode="tags"
      value={value}
      onChange={onChange}
      tokenSeparators={tokenSeparators}
      placeholder="输入后按回车添加"
      className="w-full"
      open={false}
    />
  </div>
);

export default RelationSection;

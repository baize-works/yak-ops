import {Input} from "antd";
import {Braces, MessageSquareText,} from "lucide-react";
import type {ReactNode} from "react";
import type {QualityPoint} from "../model";
import type {PromptTab, UpdateQualityPointDraft,} from "../types";

const {TextArea} = Input;

interface PromptSectionProps {
  point: QualityPoint;
  editing: boolean;
  promptTab: PromptTab;
  onPromptTabChange: (tab: PromptTab) => void;
  updateDraft: UpdateQualityPointDraft;
}

const PromptSection = ({
                         point,
                         editing,
                         promptTab,
                         onPromptTabChange,
                         updateDraft,
                       }: PromptSectionProps) => {
  const promptValue =
    promptTab === "system"
      ? point.systemPrompt
      : point.userPrompt;

  return (
    <section className="pt-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-950">
            提示词配置
          </h3>
          <p className="mt-1 text-xs leading-5 text-slate-400">
            {editing
              ? "编辑模型执行该质控点时使用的提示词。"
              : "查看模型执行该质控点时使用的提示词。"}
          </p>
        </div>

        <PromptTabs
          value={promptTab}
          onChange={onPromptTabChange}
        />
      </div>

      {editing ? (
        <TextArea
          value={promptValue}
          onChange={(event) =>
            updateDraft(
              promptTab === "system"
                ? "systemPrompt"
                : "userPrompt",
              event.target.value,
            )
          }
          placeholder={
            promptTab === "system"
              ? "请输入系统提示词"
              : "请输入用户提示词"
          }
          autoSize={{minRows: 12, maxRows: 24}}
          className="mt-4 font-mono text-sm leading-7"
        />
      ) : (
        <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-slate-50/70">
          <div className="border-b border-slate-200/80 px-4 py-2.5">
            <p className="text-xs font-medium text-slate-500">
              {promptTab === "system"
                ? "System Prompt"
                : "User Prompt"}
            </p>
          </div>

          <pre
            className="max-h-[420px] overflow-y-auto whitespace-pre-wrap break-words px-4 py-4 font-sans text-sm leading-7 text-slate-600">
            {promptValue || "暂无提示词配置"}
          </pre>
        </div>
      )}
    </section>
  );
};

interface PromptTabsProps {
  value: PromptTab;
  onChange: (tab: PromptTab) => void;
}

const PromptTabs = ({
                      value,
                      onChange,
                    }: PromptTabsProps) => (
  <div className="flex rounded-lg bg-slate-100 p-1">
    <PromptTabButton
      active={value === "system"}
      icon={<Braces className="h-3.5 w-3.5"/>}
      onClick={() => onChange("system")}
    >
      系统提示词
    </PromptTabButton>

    <PromptTabButton
      active={value === "user"}
      icon={
        <MessageSquareText className="h-3.5 w-3.5"/>
      }
      onClick={() => onChange("user")}
    >
      用户提示词
    </PromptTabButton>
  </div>
);

interface PromptTabButtonProps {
  active: boolean;
  icon: ReactNode;
  children: ReactNode;
  onClick: () => void;
}

const PromptTabButton = ({
                           active,
                           icon,
                           children,
                           onClick,
                         }: PromptTabButtonProps) => (
  <button
    type="button"
    onClick={onClick}
    className={[
      "inline-flex h-8 items-center gap-1.5",
      "rounded-md px-3 text-xs font-medium",
      "transition-all duration-200",
      active
        ? "bg-white text-slate-950 shadow-sm"
        : "text-slate-500 hover:text-slate-800",
    ].join(" ")}
  >
    {icon}
    {children}
  </button>
);

export default PromptSection;

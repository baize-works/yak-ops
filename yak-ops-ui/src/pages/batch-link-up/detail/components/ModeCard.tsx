import {Radio} from "antd";
import type {SyncMode} from "../types";

interface Props {
  value: SyncMode;
  current?: SyncMode;
  title: string;
  desc: string;
  tag?: string;
  onSelect: (value: SyncMode) => void;
}

const ModeCard: React.FC<Props> = ({
                                     value,
                                     current,
                                     title,
                                     desc,
                                     tag,
                                     onSelect,
                                   }) => {
  const active = current === value;

  return (
    <div
      onClick={() => onSelect(value)}
      className={[
        "relative cursor-pointer rounded-xl border p-4 transition-all duration-200",
        active
          ? "border-[#1677ff] bg-[#f5f9ff] shadow-[0_0_0_3px_rgba(22,119,255,0.08)]"
          : "border-[#EAECF0] bg-white hover:border-[#B2DDFF] hover:bg-[#FAFCFF]",
      ].join(" ")}
    >
      {tag ? (
        <div className="mb-2 inline-flex rounded-full bg-[#EFF8FF] px-2 py-0.5 text-[11px] font-medium text-[#175CD3]">
          {tag}
        </div>
      ) : null}

      <Radio value={value} className="mb-2">
        <span className="text-[14px] font-semibold text-[#101828]">{title}</span>
      </Radio>

      <div className="pl-6 text-[12px] leading-5 text-[#667085]">{desc}</div>
    </div>
  );
};

export default ModeCard;

import React from "react";

interface ChartSettingBlockProps {
  title: string;
  children: React.ReactNode;
}

const ChartSettingBlock: React.FC<ChartSettingBlockProps> = ({
                                                               title,
                                                               children,
                                                             }) => {
  return (
    <div>
      <div className="mb-2 text-sm font-semibold text-slate-900">{title}</div>
      {children}
    </div>
  );
};

export default ChartSettingBlock;

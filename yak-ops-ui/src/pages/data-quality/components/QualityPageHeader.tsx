import type { ReactNode } from 'react';

interface QualityPageHeaderProps {
  title: string;
  actions?: ReactNode;
}

const QualityPageHeader = ({ title, actions }: QualityPageHeaderProps) => (
  <header className="flex flex-col gap-4 border-b border-[#e8e9ec] pb-4 lg:flex-row lg:items-end lg:justify-between">
    <h1 className="m-0 text-[22px] font-semibold leading-8 text-[#161823]">
      {title}
    </h1>
    {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
  </header>
);

export default QualityPageHeader;

import type { ReactNode } from 'react';

export const panelShellClass = [
  'absolute bottom-2.5 right-2.5 top-[65px] z-40 flex w-[410px] flex-col overflow-hidden',
  'rounded-[14px] border border-[#d0d5dd]/90 bg-white/[0.98]',
  'shadow-[0_18px_50px_rgba(16,24,40,0.16)] backdrop-blur-[14px]',
  'max-lg:w-[min(390px,calc(100vw-20px))]',
].join(' ');

export const panelHeaderClass =
  'flex min-h-14 shrink-0 items-center justify-between border-b border-[#eaecf0] pl-[15px] pr-3';

export const panelContentClass = 'min-h-0 flex-1 overflow-y-auto';

export const panelFooterClass =
  'flex min-h-[43px] shrink-0 items-center justify-between border-t border-[#eaecf0] bg-[#fcfcfd] px-3';

export const panelIconButtonClass =
  'flex h-7 w-7 items-center justify-center rounded-md border-0 bg-transparent text-[#667085] hover:bg-[#f2f4f7] hover:text-[#344054]';

interface PanelTitleProps {
  title: string;
  description: string;
  icon?: ReactNode;
}

export const PanelTitle = ({ title, description, icon }: PanelTitleProps) => (
  <div className="flex min-w-0 items-center gap-2.5">
    {icon}
    <div className="min-w-0">
      <strong className="block text-[13px] text-[#344054]">{title}</strong>
      <span className="mt-0.5 block text-[9px] text-[#98a2b3]">
        {description}
      </span>
    </div>
  </div>
);

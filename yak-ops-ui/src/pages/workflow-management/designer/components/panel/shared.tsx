import type { ReactNode } from 'react';

export const panelShellClass = [
  'absolute bottom-0 right-0 top-0 z-40 flex w-[420px] flex-col overflow-hidden',
  'border-l border-[#e4e7ec] bg-white shadow-[-10px_0_30px_rgba(16,24,40,0.06)]',
  'max-lg:w-[min(420px,100vw)]',
].join(' ');

export const panelHeaderClass =
  'flex min-h-[64px] shrink-0 items-center justify-between border-b border-[#eaecf0] pl-4 pr-3';

export const panelContentClass = 'min-h-0 flex-1 overflow-y-auto bg-white';

export const panelFooterClass =
  'flex min-h-[48px] shrink-0 items-center justify-between border-t border-[#eaecf0] bg-[#fcfcfd] px-3.5';

export const panelIconButtonClass =
  'flex h-8 w-8 items-center justify-center rounded-lg border-0 bg-transparent text-[#667085] hover:bg-[#f2f4f7] hover:text-[#344054]';

interface PanelTitleProps {
  title: string;
  description: string;
  icon?: ReactNode;
}

export const PanelTitle = ({ title, description, icon }: PanelTitleProps) => (
  <div className="flex min-w-0 items-center gap-2.5">
    {icon}
    <div className="min-w-0">
      <strong className="block text-[14px] font-semibold text-[#344054]">
        {title}
      </strong>
      <span className="mt-0.5 block text-[10px] text-[#98a2b3]">
        {description}
      </span>
    </div>
  </div>
);

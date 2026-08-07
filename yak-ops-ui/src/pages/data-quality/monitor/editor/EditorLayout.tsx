import type { ReactNode } from 'react';

export const SECTION_ITEMS = [
  { key: 'basic-config', label: '基本配置' },
  { key: 'quality-rules', label: '选择质量规则' },
  { key: 'run-settings', label: '运行设置' },
  { key: 'issue-strategy', label: '质量问题处理策略' },
] as const;
export type SectionKey = (typeof SECTION_ITEMS)[number]['key'];

export const EditorSection = ({
  id,
  title,
  description,
  extra,
  children,
}: {
  id: SectionKey;
  title: string;
  description?: string;
  extra?: ReactNode;
  children: ReactNode;
}) => (
  <section id={id} className="scroll-mt-6 overflow-hidden rounded-xl bg-white">
    <header className="flex items-start justify-between gap-4 px-7 pt-5">
      <div>
        <h2 className="m-0 text-[17px] font-semibold leading-6 text-[#161823]">
          {title}
        </h2>
        {/* {description ? (
          <div className="mt-1 text-xs leading-5 text-[#8a8f99]">{description}</div>
        ) : null} */}
      </div>
      {extra}
    </header>
    <div className="px-7 pb-6 pt-5">{children}</div>
  </section>
);

export const EditorField = ({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: ReactNode;
}) => (
  <div className="grid grid-cols-[132px_minmax(0,1fr)] items-start gap-5 max-md:grid-cols-1 max-md:gap-2">
    <div className="pt-2.5 text-[13px] font-medium text-[#344054]">
      {label}
      {required ? <span className="ml-1 text-[var(--yak-brand-color)]">*</span> : null}
    </div>
    <div className="min-w-0">
      {children}
      {hint ? <div className="mt-1.5 text-[11px] leading-5 text-[#98a2b3]">{hint}</div> : null}
    </div>
  </div>
);

export const SectionNavigator = ({
  activeKey,
  onSelect,
}: {
  activeKey: SectionKey;
  onSelect: (key: SectionKey) => void;
}) => (
  <nav aria-label="配置区块定位" className="rounded-xl bg-white px-3 py-4">
    <div className="mb-3 px-2 text-[12px] font-semibold text-[#344054]">快速定位</div>
    <div className="relative">
      <span aria-hidden className="absolute bottom-4 left-[13px] top-4 w-px bg-[#e4e7ec]" />
      <div className="space-y-1">
        {SECTION_ITEMS.map((item) => {
          const active = item.key === activeKey;
          return (
            <button
              key={item.key}
              type="button"
              className={[
                'group relative flex w-full cursor-pointer items-center gap-3 rounded-lg border-0 px-2 py-2 text-left transition-colors',
                active ? 'bg-[rgba(254,44,85,0.08)]' : 'bg-transparent hover:bg-[#f7f8fa]',
              ].join(' ')}
              onClick={() => onSelect(item.key)}
            >
              <span
                className={[
                  'relative z-10 h-[11px] w-[11px] shrink-0 rounded-full border transition-all',
                  active
                    ? 'border-[var(--yak-brand-color)] bg-[var(--yak-brand-color)] shadow-[0_0_0_3px_rgba(254,44,85,0.12)]'
                    : 'border-[#d0d5dd] bg-[#98a2b3]',
                ].join(' ')}
              />
              <span
                className={[
                  'text-[12px] leading-5',
                  active
                    ? 'font-semibold text-[var(--yak-brand-color)]'
                    : 'font-normal text-[#667085] group-hover:text-[#344054]',
                ].join(' ')}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  </nav>
);

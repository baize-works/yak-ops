import type { ReactNode } from 'react';

interface EditorSectionProps {
  title: string;
  description?: string;
  children: ReactNode;
}

interface EditorFieldProps {
  label: string;
  required?: boolean;
  hint?: string;
  children: ReactNode;
}

export default function EditorSection({
  title,
  children,
}: EditorSectionProps) {
  return (
    <section className="overflow-hidden rounded-xl  bg-white ">
      <header className=" px-7 py-5" style={{paddingBottom: 0}}>
        <h2 className="m-0 text-[17px] font-semibold leading-6 text-[#161823]">
          {title}
        </h2>

      </header>

      <div className="px-7 py-6">{children}</div>
    </section>
  );
}

export function EditorField({
  label,
  required = false,
  hint,
  children,
}: EditorFieldProps) {
  return (
    <div className="grid grid-cols-[116px_minmax(0,1fr)] items-start gap-5 max-md:grid-cols-1 max-md:gap-2">
      <div className="pt-2.5 text-[13px] font-medium text-[#344054]">
        {label}
        {required ? (
          <span className="ml-1 text-[var(--yak-brand-color)]">*</span>
        ) : null}
      </div>

      <div className="min-w-0">
        {children}

        {hint ? (
          <div className="mt-1.5 text-[11px] leading-5 text-[#98a2b3]">
            {hint}
          </div>
        ) : null}
      </div>
    </div>
  );
}

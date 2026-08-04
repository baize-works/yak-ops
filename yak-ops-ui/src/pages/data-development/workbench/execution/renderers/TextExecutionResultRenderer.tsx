import { FileText } from 'lucide-react';
import type { ExecutionResultRendererProps } from '../types';

const TextExecutionResultRenderer = ({
  payload,
}: ExecutionResultRendererProps) => {
  if (payload.kind !== 'text') return null;

  return (
    <div className="flex h-full items-center justify-center bg-[#fafbfc] p-8">
      <div className="max-w-[520px] text-center">
        <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--yak-brand-color-soft)] text-[var(--yak-brand-color)]">
          <FileText size={21} />
        </span>
        <h3 className="mb-1 mt-3 text-[14px] font-semibold text-[#161823]">
          {payload.title}
        </h3>
        <p className="m-0 text-[12px] leading-6 text-[rgba(22,24,35,0.5)]">
          {payload.value}
        </p>
      </div>
    </div>
  );
};

export default TextExecutionResultRenderer;

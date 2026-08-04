import { CheckCircle2, XCircle } from 'lucide-react';
import type { ExecutionResultRendererProps } from '../types';

const NotebookExecutionResultRenderer = ({
  payload,
}: ExecutionResultRendererProps) => {
  if (payload.kind !== 'notebook') return null;

  return (
    <div className="h-full min-h-0 overflow-auto bg-[#fafbfc] p-3">
      <div className="space-y-2">
        {payload.cells.map((cell) => {
          const success = cell.status === 'SUCCESS';
          return (
            <article
              key={cell.id}
              className="overflow-hidden rounded-lg border border-[#e5e7ea] bg-white"
            >
              <header className="flex h-9 items-center justify-between border-b border-[#eceef0] px-3">
                <span className="flex items-center gap-2 text-[12px] font-medium text-[#161823]">
                  {success ? (
                    <CheckCircle2 size={14} className="text-[#14945f]" />
                  ) : (
                    <XCircle size={14} className="text-[#d92d20]" />
                  )}
                  {cell.label}
                </span>
                <span className="text-[10px] text-[rgba(22,24,35,0.4)]">
                  {cell.durationMs} ms
                </span>
              </header>
              <pre className="m-0 whitespace-pre-wrap p-3 font-mono text-[12px] leading-6 text-[rgba(22,24,35,0.72)]">
                {cell.output}
              </pre>
            </article>
          );
        })}
      </div>
    </div>
  );
};

export default NotebookExecutionResultRenderer;

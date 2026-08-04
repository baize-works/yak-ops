import { Tag } from 'antd';
import type { ExecutionResultRendererProps } from '../types';

const TerminalExecutionResultRenderer = ({
  payload,
}: ExecutionResultRendererProps) => {
  if (payload.kind !== 'terminal') return null;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[#111418] text-[#d5dae0]">
      <div className="flex h-9 shrink-0 items-center justify-between border-b border-white/10 px-3">
        <span className="text-[11px] text-white/55">Terminal Output</span>
        <Tag
          bordered={false}
          className="!m-0 !bg-white/10 !text-[10px] !text-white/70"
        >
          exit code {payload.exitCode}
        </Tag>
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-4 font-mono text-[12px] leading-6">
        {payload.stdout.map((line, index) => (
          <div key={`stdout-${index}`} className="whitespace-pre-wrap">
            {line}
          </div>
        ))}
        {payload.stderr.map((line, index) => (
          <div
            key={`stderr-${index}`}
            className="whitespace-pre-wrap text-[#ff8c8c]"
          >
            {line}
          </div>
        ))}
      </div>
    </div>
  );
};

export default TerminalExecutionResultRenderer;

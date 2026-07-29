import { Braces, ChevronDown, Search, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { WorkflowFlowNode, WorkflowVariable } from '../../../types';

interface VariableInspectPanelProps {
  open: boolean;
  nodes: WorkflowFlowNode[];
  variables: WorkflowVariable[];
  environmentVariables: WorkflowVariable[];
  onClose: () => void;
}

const VariableInspectPanel = ({
  open,
  nodes,
  variables,
  environmentVariables,
  onClose,
}: VariableInspectPanelProps) => {
  const [keyword, setKeyword] = useState('');
  const rows = useMemo(() => {
    const nodeRows = nodes
      .filter((node) => node.data.nodeType !== 'NOTE')
      .map((node) => ({
        key: node.id,
        name: node.data.title,
        value: `{{${node.id}.output}}`,
        source: node.data.nodeType,
      }));
    const globalRows = variables.map((item) => ({
      key: item.id,
      name: item.name || '未命名变量',
      value: `{{global.${item.name || item.id}}}`,
      source: 'GLOBAL',
    }));
    const envRows = environmentVariables.map((item) => ({
      key: item.id,
      name: item.name || '未命名环境变量',
      value: `{{env.${item.name || item.id}}}`,
      source: 'ENV',
    }));
    const normalized = keyword.trim().toLowerCase();
    return [...nodeRows, ...globalRows, ...envRows].filter(
      (item) =>
        !normalized ||
        `${item.name} ${item.value} ${item.source}`
          .toLowerCase()
          .includes(normalized),
    );
  }, [environmentVariables, keyword, nodes, variables]);

  if (!open) return null;

  return (
    <section
      className={[
        'absolute bottom-[55px] left-[150px] right-[150px] z-20 overflow-hidden rounded-[11px]',
        'border border-[#d0d5dd] bg-white/[0.97] shadow-[0_12px_36px_rgba(16,24,40,0.14)]',
        'backdrop-blur-[12px] max-lg:left-3 max-lg:right-3',
      ].join(' ')}
    >
      <header className="flex h-[39px] items-center gap-2 border-b border-[#eaecf0] pl-3 pr-2">
        <div className="flex items-center gap-1.5 text-[#475467]">
          <Braces size={15} />
          <strong className="text-[10px]">变量检查</strong>
          <span className="rounded-lg bg-[#f2f4f7] px-1.5 py-0.5 text-[8px] text-[#667085]">
            {rows.length}
          </span>
        </div>
        <div className="ml-2 flex min-w-[180px] flex-1 items-center gap-1.5 rounded-md border border-[#eaecf0] bg-[#f8f9fb] px-2 text-[#98a2b3]">
          <Search size={13} />
          <input
            value={keyword}
            placeholder="搜索变量"
            onChange={(event) => setKeyword(event.target.value)}
            className="h-[25px] w-full border-0 bg-transparent text-[9px] text-[#475467] outline-none"
          />
        </div>
        <button type="button" className="flex h-[25px] w-[25px] items-center justify-center rounded-md border-0 bg-transparent text-[#667085] hover:bg-[#f2f4f7]">
          <ChevronDown size={15} />
        </button>
        <button type="button" onClick={onClose} className="flex h-[25px] w-[25px] items-center justify-center rounded-md border-0 bg-transparent text-[#667085] hover:bg-[#f2f4f7]">
          <X size={15} />
        </button>
      </header>
      <div className="flex gap-1.5 overflow-x-auto p-2">
        {rows.map((row) => (
          <button
            key={row.key}
            type="button"
            onClick={() => void navigator.clipboard?.writeText(row.value)}
            title="点击复制变量引用"
            className="grid min-w-[190px] grid-cols-[45px_minmax(0,1fr)] gap-x-2 gap-y-0.5 rounded-md border border-[#eaecf0] bg-white p-2 text-left hover:bg-[#fcfcfd]"
          >
            <span className="row-span-2 self-center rounded bg-[#f1f0ff] px-1.5 py-1 text-center text-[7px] text-[#5d5fef]">
              {row.source}
            </span>
            <strong className="text-[9px] text-[#475467]">{row.name}</strong>
            <code className="overflow-hidden text-ellipsis whitespace-nowrap text-[8px] text-[#98a2b3]">
              {row.value}
            </code>
          </button>
        ))}
      </div>
    </section>
  );
};

export default VariableInspectPanel;

import { Braces, ChevronDown, Search, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { WorkflowFlowNode, WorkflowVariable } from '../../types';

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
      value: `{{env.${item.name || item.id}}`,
      source: 'ENV',
    }));
    const normalized = keyword.trim().toLowerCase();
    return [...nodeRows, ...globalRows, ...envRows].filter((item) =>
      !normalized || `${item.name} ${item.value} ${item.source}`.toLowerCase().includes(normalized),
    );
  }, [environmentVariables, keyword, nodes, variables]);

  if (!open) return null;

  return (
    <section className="dify-variable-inspect-panel">
      <header>
        <div><Braces size={15} /><strong>变量检查</strong><span>{rows.length}</span></div>
        <div className="dify-variable-inspect-panel__search">
          <Search size={13} />
          <input value={keyword} placeholder="搜索变量" onChange={(event) => setKeyword(event.target.value)} />
        </div>
        <button type="button"><ChevronDown size={15} /></button>
        <button type="button" onClick={onClose}><X size={15} /></button>
      </header>
      <div className="dify-variable-inspect-panel__body">
        {rows.map((row) => (
          <button
            key={row.key}
            type="button"
            onClick={() => void navigator.clipboard?.writeText(row.value)}
            title="点击复制变量引用"
          >
            <span>{row.source}</span>
            <strong>{row.name}</strong>
            <code>{row.value}</code>
          </button>
        ))}
      </div>
    </section>
  );
};

export default VariableInspectPanel;

import { message } from 'antd';
import { AlertCircle, CheckCircle2, ChevronRight, ListChecks, X } from 'lucide-react';
import { useMemo, useState, type ComponentProps } from 'react';
import { useEdges, useNodes, useReactFlow } from 'reactflow';

import type { WorkflowNodeData } from '../../types';
import { validateWorkflow } from '../validation';
import WorkflowHeader from './header';

type WorkflowHeaderWithValidationProps = ComponentProps<typeof WorkflowHeader>;

const WorkflowHeaderWithValidation = (
  props: WorkflowHeaderWithValidationProps,
) => {
  const nodes = useNodes<WorkflowNodeData>();
  const edges = useEdges();
  const reactFlow = useReactFlow<WorkflowNodeData>();
  const [open, setOpen] = useState(false);

  const issues = useMemo(
    () => validateWorkflow(nodes, edges),
    [edges, nodes],
  );
  const errorCount = issues.filter((issue) => issue.severity === 'error').length;

  const handleSave = () => {
    if (errorCount > 0) {
      setOpen(true);
      message.warning(`还有 ${errorCount} 个必填项需要完善`);
      return;
    }
    props.onSave();
  };

  const focusNode = (nodeId?: string) => {
    if (!nodeId) return;
    const node = reactFlow.getNode(nodeId);
    if (!node) return;

    reactFlow.setNodes((current) =>
      current.map((item) => ({
        ...item,
        selected: item.id === nodeId,
      })),
    );
    void reactFlow.setCenter(
      node.position.x + (node.width || 224) / 2,
      node.position.y + (node.height || 120) / 2,
      { zoom: Math.max(reactFlow.getZoom(), 0.85), duration: 220 },
    );
  };

  return (
    <>
      <WorkflowHeader {...props} onSave={handleSave} />

      <div className="absolute right-3 top-[56px] z-50 flex flex-col items-end gap-2">
        <button
          type="button"
          className={[
            'inline-flex h-9 items-center gap-2 rounded-[10px] border px-3',
            'bg-white text-[12px] font-semibold shadow-[0_4px_14px_rgba(16,24,40,0.10)]',
            issues.length
              ? 'border-[#fedf89] text-[#b54708] hover:bg-[#fffaeb]'
              : 'border-[#abefc6] text-[#067647] hover:bg-[#ecfdf3]',
          ].join(' ')}
          onClick={() => setOpen((value) => !value)}
        >
          {issues.length ? <ListChecks size={15} /> : <CheckCircle2 size={15} />}
          检查清单
          <span className="min-w-5 rounded-full bg-[#f2f4f7] px-1.5 py-0.5 text-center text-[10px] text-[#475467]">
            {issues.length}
          </span>
        </button>

        {open && (
          <aside className="flex max-h-[calc(100vh-112px)] w-[390px] flex-col overflow-hidden rounded-xl border border-[#e4e7ec] bg-white shadow-[0_18px_48px_rgba(16,24,40,0.16)]">
            <header className="flex shrink-0 items-start justify-between px-4 pb-3 pt-4">
              <div>
                <h3 className="m-0 text-[16px] font-semibold text-[#101828]">
                  检查清单({issues.length})
                </h3>
                <p className="mb-0 mt-1 text-[12px] text-[#98a2b3]">
                  保存前请先完善节点必填配置
                </p>
              </div>
              <button
                type="button"
                aria-label="关闭检查清单"
                className="flex h-7 w-7 items-center justify-center rounded-md border-0 bg-transparent text-[#667085] hover:bg-[#f2f4f7]"
                onClick={() => setOpen(false)}
              >
                <X size={16} />
              </button>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
              {!issues.length && (
                <div className="flex items-center gap-2 rounded-lg bg-[#ecfdf3] px-3 py-3 text-[12px] text-[#067647]">
                  <CheckCircle2 size={16} />
                  所有必填项均已完成，可以保存工作流。
                </div>
              )}

              {issues.map((issue) => (
                <button
                  key={issue.id}
                  type="button"
                  className="group mb-2 block w-full rounded-lg border-0 bg-[#fcfcfd] px-3 py-2.5 text-left hover:bg-[#f8f9fc]"
                  onClick={() => focusNode(issue.nodeId)}
                >
                  <div className="flex items-center gap-2">
                    <AlertCircle
                      size={15}
                      className={
                        issue.severity === 'error'
                          ? 'text-[#f79009]'
                          : 'text-[#667085]'
                      }
                    />
                    <strong className="min-w-0 flex-1 truncate text-[13px] font-medium text-[#344054]">
                      {issue.nodeTitle}
                    </strong>
                    {issue.nodeId && (
                      <ChevronRight
                        size={14}
                        className="text-[#98a2b3] group-hover:text-[#475467]"
                      />
                    )}
                  </div>
                  <div className="mt-1.5 flex items-center gap-2 pl-[23px] text-[12px] text-[#f04438]">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#f79009]" />
                    {issue.message}
                  </div>
                </button>
              ))}
            </div>
          </aside>
        )}
      </div>
    </>
  );
};

export default WorkflowHeaderWithValidation;

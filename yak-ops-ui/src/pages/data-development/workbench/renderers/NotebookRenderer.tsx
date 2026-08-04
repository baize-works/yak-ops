import { Button, Input } from 'antd';
import { ChevronDown, Play, Plus, Trash2 } from 'lucide-react';
import type { ChangeEvent } from 'react';
import type { NotebookCell, ResourceRendererProps } from '../core/types';

const NotebookRenderer = ({ document, onChange }: ResourceRendererProps) => {
  const content =
    document.content.kind === 'notebook' ? document.content : undefined;

  if (!content) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-[rgba(22,24,35,0.48)]">
        当前资源不是 Notebook 内容。
      </div>
    );
  }

  const updateCells = (cells: NotebookCell[]) =>
    onChange({
      ...document,
      content: { ...content, cells },
      dirty: true,
    });

  const updateCell = (cellId: string, patch: Partial<NotebookCell>) =>
    updateCells(
      content.cells.map((cell) =>
        cell.id === cellId ? { ...cell, ...patch } : cell,
      ),
    );

  const addCell = () =>
    updateCells([
      ...content.cells,
      {
        id: `cell-${Date.now()}`,
        language: 'python',
        source: '',
      },
    ]);

  const removeCell = (cellId: string) =>
    updateCells(content.cells.filter((cell) => cell.id !== cellId));

  return (
    <div className="h-full overflow-y-auto bg-[#f7f8fa] px-6 py-5">
      <div className="mx-auto max-w-[980px] space-y-4">
        {content.cells.map((cell, index) => (
          <section
            key={cell.id}
            className="overflow-hidden border border-[#e1e4e8] bg-white shadow-[0_3px_12px_rgba(22,24,35,0.035)]"
          >
            <div className="flex h-9 items-center justify-between border-b border-[#eceef0] bg-[#fafbfc] px-3">
              <div className="flex items-center gap-2 text-[11px] text-[rgba(22,24,35,0.52)]">
                <span className="font-medium text-[#161823]">In [{index + 1}]</span>
                <span>{cell.language}</span>
                <ChevronDown size={12} />
              </div>
              <div className="flex items-center gap-1">
                <Button
                  type="text"
                  size="small"
                  icon={<Play size={13} />}
                  onClick={() =>
                    updateCell(cell.id, {
                      output: `Cell ${index + 1} 已运行 · 结果将在真实执行接口接入后展示`,
                    })
                  }
                />
                <Button
                  type="text"
                  size="small"
                  danger
                  icon={<Trash2 size={13} />}
                  onClick={() => removeCell(cell.id)}
                />
              </div>
            </div>

            <Input.TextArea
              variant="borderless"
              autoSize={{ minRows: 4 }}
              value={cell.source}
              className="!rounded-none !px-4 !py-3 !font-mono !text-[13px] !leading-6"
              onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                updateCell(cell.id, { source: event.target.value })
              }
            />

            {cell.output && (
              <div className="border-t border-[#eceef0] bg-[#fcfcfd] px-4 py-3 font-mono text-[12px] leading-5 text-[rgba(22,24,35,0.68)]">
                {cell.output}
              </div>
            )}
          </section>
        ))}

        <Button
          type="dashed"
          block
          icon={<Plus size={14} />}
          onClick={addCell}
        >
          新增 Cell
        </Button>
      </div>
    </div>
  );
};

export default NotebookRenderer;

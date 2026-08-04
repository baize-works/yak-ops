import { Button, Tag } from 'antd';
import {
  ArrowRight,
  Database,
  GripVertical,
  Link2,
  Plus,
  Settings2,
} from 'lucide-react';
import type { GraphNode, ResourceRendererProps } from '../core/types';

const NodeCard = ({ node }: { node: GraphNode }) => (
  <div className="w-[260px] border border-[#dfe3e8] bg-white shadow-[0_8px_24px_rgba(22,24,35,0.06)]">
    <div className="flex h-10 items-center justify-between border-b border-[#eceef0] px-3">
      <div className="flex min-w-0 items-center gap-2">
        <GripVertical size={14} className="text-[rgba(22,24,35,0.28)]" />
        <Database size={15} className="text-[#13a8a8]" />
        <strong className="truncate text-[12px] font-semibold text-[#161823]">
          {node.label}
        </strong>
      </div>
      <Button type="text" size="small" icon={<Settings2 size={13} />} />
    </div>
    <div className="space-y-2 px-3 py-3 text-[11px]">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[rgba(22,24,35,0.46)]">节点类型</span>
        <Tag bordered={false} className="!m-0 !text-[10px]">
          {node.type}
        </Tag>
      </div>
      {Object.entries(node.data).slice(0, 3).map(([key, value]) => (
        <div key={key} className="flex items-center justify-between gap-3">
          <span className="text-[rgba(22,24,35,0.46)]">{key}</span>
          <span className="max-w-[145px] truncate text-[#161823]">
            {String(value)}
          </span>
        </div>
      ))}
    </div>
  </div>
);

const IntegrationRenderer = ({
  document,
  onChange,
}: ResourceRendererProps) => {
  const content = document.content.kind === 'graph' ? document.content : undefined;

  if (!content) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-[rgba(22,24,35,0.48)]">
        当前资源不是图形编排内容。
      </div>
    );
  }

  const addTransformNode = () => {
    const nextNode: GraphNode = {
      id: `transform-${Date.now()}`,
      type: 'FIELD_TRANSFORM',
      label: '字段转换',
      position: { x: 360, y: 180 },
      data: { mappingCount: 0, mode: 'STRICT' },
    };

    onChange({
      ...document,
      content: {
        ...content,
        nodes: [...content.nodes, nextNode],
      },
      dirty: true,
    });
  };

  return (
    <div className="relative h-full overflow-auto bg-[#f7f8fa]">
      <div className="absolute inset-0 opacity-40 [background-image:radial-gradient(#cfd4da_1px,transparent_1px)] [background-size:18px_18px]" />

      <div className="relative min-h-full min-w-[980px] px-10 py-10">
        <div className="mb-5 flex items-center justify-between rounded-lg border border-[#e2e5e9] bg-white/95 px-4 py-3 shadow-[0_4px_16px_rgba(22,24,35,0.04)]">
          <div>
            <div className="text-[13px] font-semibold text-[#161823]">
              可视化数据集成画布
            </div>
            <div className="mt-1 text-[11px] text-[rgba(22,24,35,0.46)]">
              内容以统一 graph JSON 保存，页面由自定义 Renderer 渲染。
            </div>
          </div>
          <Button
            type="primary"
            ghost
            size="small"
            icon={<Plus size={14} />}
            onClick={addTransformNode}
          >
            添加转换节点
          </Button>
        </div>

        <div className="flex min-h-[360px] items-center justify-center gap-8">
          {content.nodes.map((node, index) => (
            <div key={node.id} className="flex items-center gap-8">
              <NodeCard node={node} />
              {index < content.nodes.length - 1 && (
                <div className="flex flex-col items-center gap-1 text-[rgba(22,24,35,0.38)]">
                  <Link2 size={15} />
                  <ArrowRight size={34} />
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4">
          <div className="border border-[#e2e5e9] bg-white p-4">
            <div className="mb-3 text-[12px] font-semibold text-[#161823]">
              节点摘要
            </div>
            <pre className="m-0 max-h-[220px] overflow-auto whitespace-pre-wrap text-[11px] leading-5 text-[rgba(22,24,35,0.62)]">
              {JSON.stringify(content.nodes, null, 2)}
            </pre>
          </div>
          <div className="border border-[#e2e5e9] bg-white p-4">
            <div className="mb-3 text-[12px] font-semibold text-[#161823]">
              连线摘要
            </div>
            <pre className="m-0 max-h-[220px] overflow-auto whitespace-pre-wrap text-[11px] leading-5 text-[rgba(22,24,35,0.62)]">
              {JSON.stringify(content.edges, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IntegrationRenderer;

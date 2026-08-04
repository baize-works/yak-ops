import { Button, Descriptions, Tag, message } from 'antd';
import { Copy } from 'lucide-react';
import type { ExecutionResultRendererProps } from '../types';

const JsonExecutionResultRenderer = ({
  payload,
}: ExecutionResultRendererProps) => {
  if (payload.kind !== 'json') return null;

  const jsonText = JSON.stringify(payload.body, null, 2);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="shrink-0 border-b border-[#eceef0] bg-[#fafbfc] px-3 py-2">
        <Descriptions size="small" column={4} colon={false}>
          <Descriptions.Item label="状态">
            <Tag bordered={false} color="success">
              {payload.statusCode} {payload.statusText}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="耗时">
            {payload.elapsedMs} ms
          </Descriptions.Item>
          <Descriptions.Item label="响应类型">
            {payload.headers['content-type'] ?? '-'}
          </Descriptions.Item>
          <Descriptions.Item label="请求 ID">
            <span className="font-mono text-[11px]">
              {payload.headers['x-request-id'] ?? '-'}
            </span>
          </Descriptions.Item>
        </Descriptions>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="flex h-9 shrink-0 items-center justify-between border-b border-[#eceef0] px-3">
          <strong className="text-[12px] font-medium text-[#161823]">
            Response Body
          </strong>
          <Button
            type="text"
            size="small"
            icon={<Copy size={13} />}
            onClick={() => {
              void navigator.clipboard?.writeText(jsonText);
              message.success('响应 JSON 已复制');
            }}
          >
            复制
          </Button>
        </div>
        <pre className="m-0 min-h-0 flex-1 overflow-auto bg-[#fbfbfc] p-4 font-mono text-[12px] leading-6 text-[#2f3337]">
          {jsonText}
        </pre>
      </div>
    </div>
  );
};

export default JsonExecutionResultRenderer;

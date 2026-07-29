import { Input, InputNumber, Select, Tabs } from 'antd';
import type { WorkflowNodeData } from '../../../../../types';
import {
  KeyValueEditor,
  OutputVariables,
  PanelField,
  PanelSection,
} from '../shared';

interface HttpPanelProps {
  data: WorkflowNodeData;
  onConfigChange: (key: string, value: unknown) => void;
}

const HttpPanel = ({ data, onConfigChange }: HttpPanelProps) => (
  <>
    <PanelSection
      title="API"
      description="配置请求方法和地址，变量可直接写入 URL、Header 或 Body。"
    >
      <div className="grid grid-cols-[96px_minmax(0,1fr)] gap-2">
        <PanelField label="方法">
          <Select
            value={String(data.config.method || 'GET')}
            options={['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map((value) => ({
              label: value,
              value,
            }))}
            onChange={(value) => onConfigChange('method', value)}
          />
        </PanelField>
        <PanelField label="请求地址" required>
          <Input
            value={String(data.config.url || '')}
            placeholder="https://api.example.com/orders/{{start.input}}"
            onChange={(event) => onConfigChange('url', event.target.value)}
          />
        </PanelField>
      </div>
    </PanelSection>

    <PanelSection title="请求数据">
      <Tabs
        size="small"
        items={[
          {
            key: 'headers',
            label: 'Headers',
            children: (
              <KeyValueEditor
                value={data.config.headers}
                onChange={(value) => onConfigChange('headers', value)}
                keyPlaceholder="Header"
              />
            ),
          },
          {
            key: 'body',
            label: 'Body',
            children: (
              <Input.TextArea
                rows={10}
                className="font-mono text-[10px] leading-[17px]"
                value={String(data.config.body || '')}
                placeholder='{"id":"{{start.input}}"}'
                onChange={(event) =>
                  onConfigChange('body', event.target.value)
                }
              />
            ),
          },
        ]}
      />
    </PanelSection>

    <PanelSection title="超时设置">
      <PanelField label="请求超时（秒）">
        <InputNumber
          min={1}
          max={3600}
          value={Number(data.config.requestTimeoutSeconds || 60)}
          onChange={(value) =>
            onConfigChange('requestTimeoutSeconds', value || 60)
          }
        />
      </PanelField>
    </PanelSection>

    <PanelSection
      title="输出变量"
      description="HTTP 节点完成后可供下游节点引用。"
    >
      <OutputVariables
        items={[
          { name: 'body', type: 'String', description: '响应正文' },
          { name: 'statusCode', type: 'Number', description: 'HTTP 状态码' },
          { name: 'headers', type: 'Object', description: '响应头' },
        ]}
      />
    </PanelSection>
  </>
);

export default HttpPanel;

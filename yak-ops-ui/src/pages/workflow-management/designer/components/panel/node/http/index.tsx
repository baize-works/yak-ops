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

const normalizeSuccessCodes = (value: unknown): string[] =>
  Array.isArray(value) ? value.map(String) : [];

const HttpPanel = ({ data, onConfigChange }: HttpPanelProps) => (
  <>
    <PanelSection
      title="API"
      description="配置请求方法和地址，运行参数统一使用 ${parameter} 语法。"
    >
      <div className="grid grid-cols-[96px_minmax(0,1fr)] gap-2">
        <PanelField label="方法">
          <Select
            value={String(data.config.method || 'GET')}
            options={[
              'GET',
              'POST',
              'PUT',
              'PATCH',
              'DELETE',
              'HEAD',
              'OPTIONS',
            ].map((value) => ({ label: value, value }))}
            onChange={(value) => onConfigChange('method', value)}
          />
        </PanelField>
        <PanelField label="请求地址" required>
          <Input
            value={String(data.config.url || '')}
            placeholder="https://api.example.com/orders/${orderId}"
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
                placeholder={'{"id":"${orderId}"}'}
                onChange={(event) =>
                  onConfigChange('body', event.target.value)
                }
              />
            ),
          },
        ]}
      />
    </PanelSection>

    <PanelSection
      title="响应与超时"
      description="不填写成功状态码时，默认将 200-299 判定为成功。"
    >
      <PanelField label="成功状态码">
        <Select
          mode="tags"
          value={normalizeSuccessCodes(data.config.successCodes)}
          placeholder="例如 200、201、204"
          tokenSeparators={[',', '，', ' ']}
          options={['200', '201', '202', '204'].map((value) => ({
            label: value,
            value,
          }))}
          onChange={(values) =>
            onConfigChange(
              'successCodes',
              values
                .map((value) => Number(value))
                .filter((value) => Number.isInteger(value)),
            )
          }
        />
      </PanelField>

      <div className="grid grid-cols-2 gap-2.5">
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
        <PanelField label="响应体最大字符数">
          <InputNumber
            min={1}
            max={10_000_000}
            value={Number(data.config.maxResponseBodyCharacters || 1_000_000)}
            onChange={(value) =>
              onConfigChange('maxResponseBodyCharacters', value || 1_000_000)
            }
          />
        </PanelField>
      </div>
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
          {
            name: 'bodyTruncated',
            type: 'Boolean',
            description: '响应正文是否被截断',
          },
        ]}
      />
    </PanelSection>
  </>
);

export default HttpPanel;

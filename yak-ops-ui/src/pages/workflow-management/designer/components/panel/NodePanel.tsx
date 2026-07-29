import { Input, InputNumber, Switch } from 'antd';
import {
  ChevronDown,
  Copy,
  MoreHorizontal,
  Trash2,
  X,
} from 'lucide-react';
import { useMemo, useState, type ChangeEvent } from 'react';
import type { WorkflowFlowNode, WorkflowNodeData } from '../../../types';
import { getNodeMeta } from '../../constants';
import NodeIcon from '../node/NodeIcon';
import EndPanel from './node/end';
import HttpPanel from './node/http';
import ShellPanel from './node/shell';
import StartPanel from './node/start';
import { PanelField, PanelSection } from './node/shared';
import {
  panelContentClass,
  panelFooterClass,
  panelHeaderClass,
  panelIconButtonClass,
  panelShellClass,
} from './shared';

interface NodePanelProps {
  node: WorkflowFlowNode;
  onChange: (data: WorkflowNodeData) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onClose: () => void;
}

const SwitchRow = ({
  title,
  description,
  checked,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) => (
  <div className="flex items-center justify-between gap-2.5 border-t border-[#f2f4f7] py-2.5">
    <div>
      <strong className="block text-[10px] text-[#475467]">{title}</strong>
      <span className="mt-0.5 block text-[8px] text-[#98a2b3]">
        {description}
      </span>
    </div>
    <Switch checked={checked} onChange={onChange} />
  </div>
);

const NodePanel = ({
  node,
  onChange,
  onDelete,
  onDuplicate,
  onClose,
}: NodePanelProps) => {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const data = node.data;
  const meta = getNodeMeta(data.nodeType);
  const isControlNode = data.nodeType === 'START' || data.nodeType === 'END';
  const isSupported =
    data.nodeType === 'START' ||
    data.nodeType === 'END' ||
    data.nodeType === 'HTTP' ||
    data.nodeType === 'SHELL';

  const patch = (values: Partial<WorkflowNodeData>) => {
    onChange({ ...data, ...values });
  };

  const patchConfig = (key: string, value: unknown) => {
    patch({
      config: { ...data.config, [key]: value, __uiType: data.nodeType },
    });
  };

  const jsonConfig = useMemo(
    () =>
      JSON.stringify(
        Object.fromEntries(
          Object.entries(data.config).filter(([key]) => !key.startsWith('__')),
        ),
        null,
        2,
      ),
    [data.config],
  );

  const renderNodePanel = () => {
    switch (data.nodeType) {
      case 'START':
        return <StartPanel data={data} onConfigChange={patchConfig} />;
      case 'END':
        return <EndPanel data={data} onConfigChange={patchConfig} />;
      case 'HTTP':
        return <HttpPanel data={data} onConfigChange={patchConfig} />;
      case 'SHELL':
        return <ShellPanel data={data} onConfigChange={patchConfig} />;
      default:
        return (
          <PanelSection
            title="不支持的节点"
            description="该节点来自旧版工作流。当前设计器仅允许新建 Start、End、HTTP 和 Shell 节点。"
          >
            <div className="rounded-lg border border-dashed border-[#d0d5dd] bg-[#f9fafb] p-3 text-[10px] leading-[16px] text-[#667085]">
              节点类型：{data.nodeType}
              <br />
              后端任务类型：{data.taskType}
            </div>
          </PanelSection>
        );
    }
  };

  return (
    <aside className={panelShellClass}>
      <header className={panelHeaderClass}>
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <span className="flex h-[32px] w-[32px] shrink-0 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--node-color)_10%,white)]">
            <NodeIcon type={data.nodeType} size={19} />
          </span>
          <div className="min-w-0 flex-1">
            <input
              value={data.title}
              maxLength={255}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                patch({ title: event.target.value })
              }
              className="w-full border-0 bg-transparent p-0 text-[13px] font-semibold text-[#344054] outline-none"
            />
            <span className="block text-[9px] text-[#98a2b3]">
              {meta.title}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-px">
          {!isControlNode && isSupported && (
            <button
              type="button"
              className={panelIconButtonClass}
              aria-label="复制节点"
              onClick={onDuplicate}
            >
              <Copy size={16} />
            </button>
          )}
          <button
            type="button"
            className={panelIconButtonClass}
            aria-label="更多操作"
          >
            <MoreHorizontal size={16} />
          </button>
          <button
            type="button"
            className={panelIconButtonClass}
            aria-label="关闭"
            onClick={onClose}
          >
            <X size={17} />
          </button>
        </div>
      </header>

      <div className={panelContentClass}>
        <section className="border-b border-[#f0f1f4] px-4 py-3">
          <Input.TextArea
            value={data.description}
            rows={2}
            maxLength={500}
            placeholder="添加节点说明..."
            className="resize-none !border-0 !bg-[#f8f9fb] !shadow-none"
            onChange={(event) => patch({ description: event.target.value })}
          />
        </section>

        {renderNodePanel()}

        {!isControlNode && isSupported && (
          <section className="border-t border-[#f0f1f4] px-4 py-4">
            <button
              type="button"
              className="flex w-full items-center justify-between border-0 bg-transparent p-0 text-[11px] font-semibold text-[#475467]"
              onClick={() => setAdvancedOpen((value) => !value)}
            >
              <span>错误处理与高级设置</span>
              <ChevronDown
                size={15}
                className={[
                  'transition-transform duration-200',
                  advancedOpen ? 'rotate-180' : '',
                ].join(' ')}
              />
            </button>

            {advancedOpen && (
              <div className="mt-3.5">
                <div className="grid grid-cols-2 gap-2.5">
                  <PanelField label="重试次数">
                    <InputNumber
                      min={0}
                      max={20}
                      value={data.retryTimes}
                      onChange={(value) => patch({ retryTimes: value || 0 })}
                    />
                  </PanelField>
                  <PanelField label="重试间隔（秒）">
                    <InputNumber
                      min={0}
                      max={86400}
                      value={data.retryIntervalSeconds}
                      onChange={(value) =>
                        patch({ retryIntervalSeconds: value || 0 })
                      }
                    />
                  </PanelField>
                </div>
                <PanelField label="节点超时（秒）">
                  <InputNumber
                    min={0}
                    max={86400}
                    value={data.timeoutSeconds}
                    onChange={(value) =>
                      patch({ timeoutSeconds: value || 0 })
                    }
                  />
                </PanelField>
                <SwitchRow
                  title="启用节点"
                  description="停用后保留配置但不参与流程"
                  checked={data.enabled}
                  onChange={(value) => patch({ enabled: value })}
                />
                <SwitchRow
                  title="幂等任务"
                  description="允许执行器安全重复提交"
                  checked={data.idempotent}
                  onChange={(value) => patch({ idempotent: value })}
                />
                <SwitchRow
                  title="重启后重试"
                  description="服务恢复后继续未完成任务"
                  checked={data.retryOnRestart}
                  onChange={(value) => patch({ retryOnRestart: value })}
                />
                <PanelField label="原始配置 JSON">
                  <Input.TextArea
                    rows={10}
                    className="font-mono text-[10px] leading-[17px] !bg-[#101828] !text-[#e4e7ec]"
                    value={jsonConfig}
                    onChange={(event) => {
                      try {
                        const next = JSON.parse(event.target.value);
                        patch({
                          config: { ...next, __uiType: data.nodeType },
                        });
                      } catch {
                        // Keep the last valid state while editing.
                      }
                    }}
                  />
                </PanelField>
              </div>
            )}
          </section>
        )}
      </div>

      <footer className={panelFooterClass}>
        {!isControlNode && isSupported ? (
          <button
            type="button"
            className="inline-flex h-[29px] items-center gap-1.5 rounded-md border border-[#fecdca] bg-[#fff5f4] px-2.5 text-[9px] text-[#b42318]"
            onClick={onDelete}
          >
            <Trash2 size={15} />
            删除节点
          </button>
        ) : (
          <span className="text-[9px] text-[#667085]">
            {isControlNode ? '流程控制节点不可复制或删除' : '旧节点仅支持查看'}
          </span>
        )}
        <span className="text-[8px] text-[#98a2b3]">节点 ID：{node.id}</span>
      </footer>
    </aside>
  );
};

export default NodePanel;

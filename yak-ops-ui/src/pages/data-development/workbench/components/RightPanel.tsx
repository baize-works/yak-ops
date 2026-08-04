import { Button, Input, message, Modal, Select, Switch } from 'antd';
import { Trash2, X } from 'lucide-react';
import { useEffect, useState, type ChangeEvent, type ReactNode } from 'react';
import { platformRepository, type PlatformSnapshot } from '../../platform/platform.repository';
import { nodePluginRegistry } from '../core/registry';
import type { RightPanelKey } from '../core/types';
import { SchemaDrivenForm } from '../renderers/SchemaFormRenderer';
import {
  selectActiveDocument,
  selectActiveResource,
  useWorkbenchStore,
} from '../store/workbench.store';

const PanelField = ({ label, children }: { label: string; children: ReactNode }) => (
  <label className="block">
    <span className="mb-1.5 block text-[12px] font-medium text-[rgba(22,24,35,0.68)]">{label}</span>
    {children}
  </label>
);

const PANEL_TITLES: Record<RightPanelKey, string> = {
  properties: '属性',
  run: '运行配置',
  schedule: '调度配置',
  version: '版本记录',
};

const RightPanel = () => {
  const rightPanel = useWorkbenchStore((state) => state.rightPanel);
  const resource = useWorkbenchStore(selectActiveResource);
  const document = useWorkbenchStore(selectActiveDocument);
  const scheduleEnabledByResourceId = useWorkbenchStore((state) => state.scheduleEnabledByResourceId);
  const setRightPanel = useWorkbenchStore((state) => state.setRightPanel);
  const updateResource = useWorkbenchStore((state) => state.updateResource);
  const updateDocument = useWorkbenchStore((state) => state.updateDocument);
  const deleteResource = useWorkbenchStore((state) => state.deleteResource);
  const setScheduleEnabled = useWorkbenchStore((state) => state.setScheduleEnabled);
  const [platform, setPlatform] = useState<PlatformSnapshot>();

  useEffect(() => {
    if (rightPanel !== 'run') return;
    void platformRepository.snapshot().then(setPlatform).catch(() => undefined);
  }, [rightPanel]);

  if (!rightPanel || !resource || !document) return null;
  const plugin = nodePluginRegistry.get(resource.resourceType);
  if (!plugin) return null;

  const scheduleEnabled = scheduleEnabledByResourceId[resource.id] ?? false;
  const common = document.runtime.common as typeof document.runtime.common & {
    parameterTemplateId?: string;
    secretKeys?: string[];
  };

  const updateCommon = (patch: Record<string, unknown>) =>
    updateDocument(resource.id, (current) => ({
      ...current,
      runtime: {
        ...current.runtime,
        common: { ...current.runtime.common, ...patch },
      },
      dirty: true,
    }));

  const confirmDelete = () => {
    Modal.confirm({
      centered: true,
      title: '删除开发节点',
      content: `确认删除“${resource.name}”吗？`,
      okText: '删除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: () => {
        deleteResource(resource.id);
        message.success('节点已删除');
      },
    });
  };

  const selectedEnvironmentId = Number(common.environmentId || 0);
  const availableSecrets = platform?.secrets.filter(
    (item) => item.environmentId === 0 || item.environmentId === selectedEnvironmentId,
  ) ?? [];

  return (
    <aside className="flex w-[310px] shrink-0 flex-col border-l border-[#e7e9ec] bg-white">
      <div className="flex h-11 items-center justify-between border-b border-[#eceef0] px-4">
        <strong className="text-[13px] font-semibold text-[#161823]">{PANEL_TITLES[rightPanel]}</strong>
        <Button type="text" size="small" aria-label="关闭右侧面板" icon={<X size={15} />} onClick={() => setRightPanel(null)} />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {rightPanel === 'properties' && (
          <div className="space-y-4">
            <PanelField label="节点名称">
              <Input variant="filled" value={resource.name} onChange={(event: ChangeEvent<HTMLInputElement>) => updateResource(resource.id, { name: event.target.value })} />
            </PanelField>
            <PanelField label="节点类型"><Input variant="filled" disabled value={plugin.metadata.label} /></PanelField>
            <PanelField label="计算引擎">
              <Select
                variant="filled"
                className="w-full"
                value={resource.engine}
                options={plugin.metadata.engineOptions ?? [{ label: plugin.metadata.defaultEngine, value: plugin.metadata.defaultEngine }]}
                onChange={(engine: string) => updateResource(resource.id, { engine })}
              />
            </PanelField>
            <PanelField label="描述">
              <Input.TextArea variant="filled" rows={5} value={resource.description} placeholder="填写节点说明" onChange={(event: ChangeEvent<HTMLTextAreaElement>) => updateResource(resource.id, { description: event.target.value })} />
            </PanelField>
            <div className="rounded-lg bg-[#f7f8f9] p-3 text-[11px] leading-5 text-[rgba(22,24,35,0.5)]">
              resourceType: {resource.resourceType}<br />schemaVersion: {resource.schemaVersion}<br />revision: {document.revision}
            </div>
            <div className="border-t border-[#eceef0] pt-4">
              <Button danger block icon={<Trash2 size={15} />} onClick={confirmDelete}>删除节点</Button>
            </div>
          </div>
        )}

        {rightPanel === 'run' && (
          <div className="space-y-4">
            <div className="text-[12px] font-semibold text-[#161823]">平台运行上下文</div>
            <PanelField label="运行环境">
              <Select
                allowClear
                variant="filled"
                className="w-full"
                placeholder="不使用平台环境"
                value={selectedEnvironmentId || undefined}
                options={platform?.environments.filter((item) => item.enabled).map((item) => ({ label: `${item.name} · ${item.code}`, value: item.id }))}
                onChange={(environmentId?: number) => updateCommon({ environmentId: environmentId ? String(environmentId) : '' })}
              />
            </PanelField>
            <PanelField label="参数模板">
              <Select
                allowClear
                variant="filled"
                className="w-full"
                placeholder="不使用参数模板"
                value={Number(common.parameterTemplateId || 0) || undefined}
                options={platform?.parameterTemplates.filter((item) => item.enabled).map((item) => ({ label: `${item.name} · ${item.code}`, value: item.id }))}
                onChange={(parameterTemplateId?: number) => updateCommon({ parameterTemplateId: parameterTemplateId ? String(parameterTemplateId) : '' })}
              />
            </PanelField>
            <PanelField label="注入密钥">
              <Select
                mode="multiple"
                variant="filled"
                className="w-full"
                placeholder={selectedEnvironmentId ? '选择运行时密钥' : '请先选择运行环境'}
                disabled={!selectedEnvironmentId}
                value={common.secretKeys ?? []}
                options={availableSecrets.map((item) => ({ label: item.secretKey, value: item.secretKey }))}
                onChange={(secretKeys: string[]) => updateCommon({ secretKeys })}
              />
            </PanelField>
            <div className="rounded-lg bg-[#f7f8f9] p-3 text-[11px] leading-5 text-[rgba(22,24,35,0.5)]">
              环境变量与参数模板会在执行前合并；密钥只在 Worker 内存中解密，可使用 <code>${'{secret.API_TOKEN}'}</code> 引用。
            </div>

            {plugin.runtime ? (
              <>
                <div className="border-t border-[#eceef0] pt-4 text-[12px] font-semibold text-[#161823]">{plugin.metadata.label} 专属参数</div>
                <SchemaDrivenForm
                  compact
                  schema={plugin.runtime.schema}
                  value={document.runtime.specific}
                  onChange={(specific) => updateDocument(resource.id, (current) => ({ ...current, runtime: { ...current.runtime, specific }, dirty: true }))}
                />
              </>
            ) : (
              <div className="rounded-lg bg-[#f7f8f9] p-3 text-[12px] leading-5 text-[rgba(22,24,35,0.56)]">当前节点无需专属运行参数。</div>
            )}
          </div>
        )}

        {rightPanel === 'schedule' && (
          <div className="space-y-4">
            {!plugin.capabilities.schedulable ? (
              <div className="rounded-lg bg-[#f7f8f9] p-3 text-[12px] leading-5 text-[rgba(22,24,35,0.56)]">当前节点插件未声明调度能力。</div>
            ) : (
              <>
                <div className="flex items-center justify-between rounded-lg border border-[#e7e9ec] p-3">
                  <div><div className="text-[13px] font-medium text-[#161823]">开启调度</div><div className="mt-1 text-[11px] text-[rgba(22,24,35,0.44)]">调度仅绑定已发布的不可变版本</div></div>
                  <Switch checked={scheduleEnabled} onChange={(enabled: boolean) => setScheduleEnabled(resource.id, enabled)} />
                </div>
                <PanelField label="调度周期"><Select variant="filled" className="w-full" disabled={!scheduleEnabled} defaultValue="daily" options={[{ label: '每天', value: 'daily' }, { label: '每小时', value: 'hourly' }, { label: '每周', value: 'weekly' }]} /></PanelField>
                <PanelField label="Cron 表达式"><Input variant="filled" disabled={!scheduleEnabled} defaultValue="0 0 2 * * ?" /></PanelField>
                <PanelField label="失败重试次数"><Input variant="filled" disabled={!scheduleEnabled} defaultValue="2" /></PanelField>
              </>
            )}
          </div>
        )}

        {rightPanel === 'version' && (
          <div className="space-y-1">
            {[
              { version: `r${document.revision}`, description: document.dirty ? '当前未保存草稿' : '当前草稿', time: '刚刚', current: true },
              { version: `v${resource.publishedVersion ?? 0}`, description: '最近发布版本', time: resource.updatedAt, current: false },
              { version: `r${Math.max(0, document.revision - 1)}`, description: '上一个保存修订', time: '08-04 08:36', current: false },
            ].map((item) => (
              <div key={`${item.version}-${item.description}`} className="relative flex gap-3 border-l border-[#e4e7ec] pb-5 pl-4 last:pb-0">
                <span className={['absolute -left-[4px] top-1 h-[7px] w-[7px] rounded-full', item.current ? 'bg-[var(--yak-brand-color)]' : 'bg-[#c7cad0]'].join(' ')} />
                <div className="min-w-0">
                  <div className="flex items-center gap-2"><strong className="text-[12px] text-[#161823]">{item.version}</strong>{item.current && <span className="rounded bg-[var(--yak-brand-color-soft)] px-1.5 py-0.5 text-[10px] text-[var(--yak-brand-color)]">当前</span>}</div>
                  <div className="mt-1 text-[12px] leading-5 text-[rgba(22,24,35,0.62)]">{item.description}</div>
                  <div className="mt-1 text-[11px] text-[rgba(22,24,35,0.36)]">admin · {item.time}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
};

export default RightPanel;

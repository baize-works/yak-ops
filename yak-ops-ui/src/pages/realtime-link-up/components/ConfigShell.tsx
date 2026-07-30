import { ArrowLeft, CheckCircle2, Code2, Save } from 'lucide-react';
import { history } from '@umijs/max';
import { Button, Drawer, Tag } from 'antd';
import { useState, type ReactNode } from 'react';
import { modeMeta } from '../data';
import type { RealtimeTaskMode } from '../types';

export interface ConfigStep {
  key: string;
  title: string;
  description: string;
  complete?: boolean;
}

interface ConfigShellProps {
  taskId: string;
  mode: RealtimeTaskMode;
  title: string;
  description?: string;
  steps: ConfigStep[];
  activeStep: string;
  onStepChange: (key: string) => void;
  yaml: string;
  saving?: boolean;
  onSave: () => void;
  children: ReactNode;
  footer?: ReactNode;
}

const ConfigShell = ({
  taskId,
  mode,
  title,
  description,
  steps,
  activeStep,
  onStepChange,
  yaml,
  saving,
  onSave,
  children,
  footer,
}: ConfigShellProps) => {
  const [previewOpen, setPreviewOpen] = useState(false);
  const meta = modeMeta[mode];
  const completeCount = steps.filter((step) => step.complete).length;

  return (
    <div className="min-h-[calc(100vh-48px)] bg-[#f7f8fa]">
      <header className="sticky top-0 z-20 border-b border-black/[0.07] bg-white/95 backdrop-blur">
        <div className="flex h-[66px] items-center justify-between gap-4 px-5">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              aria-label="返回实时同步任务列表"
              onClick={() => history.push('/sync/realtime-link-up')}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] border border-black/[0.07] bg-white text-[rgba(22,24,35,0.62)] transition hover:border-black/[0.14] hover:text-[#161823]"
            >
              <ArrowLeft size={17} strokeWidth={1.9} />
            </button>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="truncate text-[17px] font-semibold text-[#161823]">
                  {title}
                </h1>
                <Tag
                  className={`!m-0 !rounded-full !px-2.5 !py-0.5 !text-[11px] ${meta.className}`}
                >
                  {meta.label}
                </Tag>
                <span className="text-[11px] text-[rgba(22,24,35,0.38)]">
                  ID: {taskId}
                </span>
              </div>
              <div className="mt-0.5 truncate text-[11px] text-[rgba(22,24,35,0.45)]">
                {description || meta.description}
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <Button
              icon={<Code2 size={15} strokeWidth={1.8} />}
              onClick={() => setPreviewOpen(true)}
              className="!h-9 !rounded-[8px] !border-black/[0.08] !text-[12px]"
            >
              YAML 预览
            </Button>
            <Button
              type="primary"
              icon={<Save size={15} strokeWidth={1.9} />}
              loading={saving}
              onClick={onSave}
              className="!h-9 !rounded-[8px] !border-[#161823] !bg-[#161823] !px-4 !text-[12px] hover:!border-[#2b2d38] hover:!bg-[#2b2d38]"
            >
              保存草稿
            </Button>
          </div>
        </div>
      </header>

      <div className="flex min-h-[calc(100vh-114px)]">
        <aside className="sticky top-[66px] h-[calc(100vh-66px)] w-[246px] shrink-0 border-r border-black/[0.065] bg-white px-4 py-5">
          <div className="mb-4 flex items-center justify-between px-2">
            <span className="text-[12px] font-semibold text-[#161823]">配置步骤</span>
            <span className="text-[10px] text-[rgba(22,24,35,0.42)]">
              {completeCount}/{steps.length}
            </span>
          </div>

          <div className="space-y-1.5">
            {steps.map((step, index) => {
              const active = step.key === activeStep;
              return (
                <button
                  key={step.key}
                  type="button"
                  onClick={() => onStepChange(step.key)}
                  className={[
                    'group flex w-full items-start gap-3 rounded-[8px] border-0 px-3 py-3 text-left transition',
                    active
                      ? 'bg-[#f1f3f6] text-[#161823]'
                      : 'bg-transparent text-[rgba(22,24,35,0.58)] hover:bg-[#f8f8f9] hover:text-[#161823]',
                  ].join(' ')}
                >
                  <span
                    className={[
                      'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[10px] font-semibold',
                      step.complete
                        ? 'border-[#b7e4cf] bg-[#edf9f3] text-[#16845b]'
                        : active
                          ? 'border-[#161823] bg-[#161823] text-white'
                          : 'border-black/[0.10] bg-white text-[rgba(22,24,35,0.42)]',
                    ].join(' ')}
                  >
                    {step.complete ? <CheckCircle2 size={14} strokeWidth={2} /> : index + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[12px] font-semibold">{step.title}</span>
                    <span className="mt-0.5 block text-[10px] leading-4 text-[rgba(22,24,35,0.42)]">
                      {step.description}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </aside>

        <main className="min-w-0 flex-1 px-6 py-6">
          <div className="mx-auto max-w-[1380px]">{children}</div>
        </main>
      </div>

      {footer}

      <Drawer
        title="Flink CDC Pipeline YAML"
        width={620}
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        styles={{ body: { padding: 0 } }}
      >
        <div className="border-b border-black/[0.06] bg-[#fafafa] px-5 py-3 text-[11px] text-[rgba(22,24,35,0.50)]">
          当前内容由页面配置实时生成，保存草稿时会与结构化配置一并保存。
        </div>
        <pre className="m-0 min-h-[calc(100vh-112px)] overflow-auto bg-[#101318] p-5 font-mono text-[12px] leading-6 text-[#d7dce2]">
          {yaml}
        </pre>
      </Drawer>
    </div>
  );
};

export default ConfigShell;

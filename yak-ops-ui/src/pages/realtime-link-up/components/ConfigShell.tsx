import { ArrowLeft, Check, Code2 } from 'lucide-react';
import { history } from '@umijs/max';
import { Button, ConfigProvider, Drawer, Tag } from 'antd';
import { useState, type ReactNode } from 'react';

import { BRAND_THEME } from '@/styles/brand';

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

  const handleCancel = () => {
    history.push('/sync/realtime-link-up');
  };

  return (
    <ConfigProvider theme={BRAND_THEME}>
      <div className="h-[calc(100vh-64px)] overflow-hidden bg-[#f7f8fa] text-[#161823]">
        <div className="h-full overflow-y-auto">
          <div className="mx-auto flex min-h-full w-full max-w-[1040px] flex-col px-6 pt-5">
            <header className="mb-5 bg-white">
              <div className="flex min-h-[72px] items-center justify-between gap-5 border-b border-[#f0f0f0] py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <Button
                    type="text"
                    icon={<ArrowLeft size={17} strokeWidth={1.9} />}
                    aria-label="返回实时同步任务列表"
                    className="!flex !h-9 !w-9 !min-w-0 !items-center !justify-center !rounded-lg !p-0 !text-[#667085] hover:!bg-[#f2f4f7] hover:!text-[#344054]"
                    onClick={handleCancel}
                  />

                  <div className="min-w-0">
                    <div className="flex min-w-0 items-center gap-2">
                      <h1 className="truncate text-[17px] font-semibold text-[#101828]">
                        {title}
                      </h1>
                      <Tag
                        className={`!m-0 !rounded-full !px-2.5 !text-[11px] ${meta.className}`}
                      >
                        {meta.label}
                      </Tag>
                    </div>
                    <div className="mt-1 flex min-w-0 items-center gap-2 text-[11px] text-[#98a2b3]">
                      <span className="truncate">
                        {description || meta.description}
                      </span>
                      <span className="shrink-0">ID：{taskId}</span>
                    </div>
                  </div>
                </div>

                <Button
                  icon={<Code2 size={15} strokeWidth={1.8} />}
                  className="!h-9 !rounded-lg !border-[#eaecf0] !px-4 !text-[12px] !text-[#475467]"
                  onClick={() => setPreviewOpen(true)}
                >
                  YAML 预览
                </Button>
              </div>

              <div className="flex min-h-[64px] items-center justify-between gap-4 overflow-x-auto py-3">
                <div className="flex min-w-max items-center gap-1 rounded-lg bg-[#f5f5f6] p-1">
                  {steps.map((step, index) => {
                    const active = activeStep === step.key;

                    return (
                      <button
                        key={step.key}
                        type="button"
                        onClick={() => onStepChange(step.key)}
                        className={[
                          'flex h-10 items-center gap-2 rounded-md px-3 text-left transition-all',
                          active
                            ? 'bg-white text-[#ff4d4f] shadow-[0_1px_4px_rgba(16,24,40,0.08)]'
                            : 'text-[#667085] hover:bg-white/70 hover:text-[#344054]',
                        ].join(' ')}
                      >
                        <span
                          className={[
                            'flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold',
                            step.complete
                              ? 'bg-[#fff1f0] text-[#ff4d4f]'
                              : active
                                ? 'bg-[#ff4d4f] text-white'
                                : 'bg-[#eaecf0] text-[#667085]',
                          ].join(' ')}
                        >
                          {step.complete ? (
                            <Check size={12} strokeWidth={2.4} />
                          ) : (
                            index + 1
                          )}
                        </span>
                        <span>
                          <span className="block whitespace-nowrap text-[12px] font-medium">
                            {step.title}
                          </span>
                          <span className="mt-0.5 block whitespace-nowrap text-[10px] text-[#98a2b3]">
                            {step.description}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>

                <span className="shrink-0 text-[11px] text-[#98a2b3]">
                  已完成 {completeCount}/{steps.length}
                </span>
              </div>
            </header>

            <main className="flex-1 pb-5">{children}</main>

            {footer}

            <footer className="sticky bottom-0 z-50 mt-auto overflow-hidden rounded-t-lg border border-b-0 border-[#eaecf0] bg-white shadow-[0_-8px_16px_rgba(16,24,40,0.06)]">
              <div className="flex min-h-[80px] items-center gap-3 px-8 py-4">
                <Button
                  danger
                  type="primary"
                  loading={saving}
                  className="!h-9 !min-w-[120px] !rounded-lg !px-6 !font-medium"
                  onClick={onSave}
                >
                  保存配置
                </Button>

                <Button
                  disabled={saving}
                  className="!h-9 !min-w-[120px] !rounded-lg !border-0 !bg-[#f2f3f5] !px-5 !font-medium !text-[#344054] hover:!bg-[#e9eaec]"
                  onClick={handleCancel}
                >
                  取消
                </Button>

                <span className="ml-auto text-[11px] text-[#98a2b3]">
                  实时任务不配置调度，保存后由运行中心统一启动和停止
                </span>
              </div>
            </footer>
          </div>
        </div>

        <Drawer
          title="Flink CDC Pipeline YAML"
          width={620}
          open={previewOpen}
          onClose={() => setPreviewOpen(false)}
          styles={{ body: { padding: 0 } }}
        >
          <div className="border-b border-[#f0f0f0] bg-[#fafafa] px-5 py-3 text-[12px] text-[#667085]">
            当前内容由页面配置实时生成，保存时会与结构化配置一并写入草稿。
          </div>
          <pre className="m-0 min-h-[calc(100vh-112px)] overflow-auto bg-[#101318] p-5 font-mono text-[12px] leading-6 text-[#d7dce2]">
            {yaml}
          </pre>
        </Drawer>
      </div>
    </ConfigProvider>
  );
};

export default ConfigShell;

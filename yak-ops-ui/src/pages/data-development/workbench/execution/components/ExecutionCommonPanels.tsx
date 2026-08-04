import { Tag } from 'antd';
import {
  AlertCircle,
  CheckCircle2,
  CircleDot,
  LoaderCircle,
} from 'lucide-react';
import type { ExecutionSession } from '../types';
import { ExecutionEmptyPanel } from './ExecutionPanelShared';

export const ExecutionOutputPanel = ({
  session,
}: {
  session?: ExecutionSession;
}) => {
  if (!session) {
    return <ExecutionEmptyPanel description="运行节点后可查看实时输出" />;
  }

  return (
    <div className="h-full min-h-0 overflow-auto bg-[#111418] p-3 font-mono text-[12px] leading-6 text-[#d7dce2]">
      {session.logs.map((log) => (
        <div key={log.id} className="grid grid-cols-[72px_52px_1fr] gap-2">
          <span className="text-white/35">{log.timestamp}</span>
          <span
            className={
              log.level === 'ERROR'
                ? 'text-[#ff8c8c]'
                : log.level === 'WARN'
                  ? 'text-[#f0b45a]'
                  : 'text-[#7db4ff]'
            }
          >
            {log.level}
          </span>
          <span className="whitespace-pre-wrap">{log.message}</span>
        </div>
      ))}
      {session.status === 'RUNNING' && (
        <div className="mt-1 flex items-center gap-2 text-white/55">
          <LoaderCircle size={12} className="animate-spin" />
          waiting for execution events...
        </div>
      )}
    </div>
  );
};

export const ExecutionProblemsPanel = ({
  session,
}: {
  session?: ExecutionSession;
}) => {
  if (!session || session.status !== 'FAILED') {
    return <ExecutionEmptyPanel description="当前节点没有发现问题" />;
  }

  return (
    <div className="p-3">
      <div className="flex items-start gap-3 border border-[#f5c2c0] bg-[#fff7f6] p-3">
        <AlertCircle size={16} className="mt-0.5 text-[#d92d20]" />
        <div>
          <div className="text-[12px] font-medium text-[#b42318]">运行失败</div>
          <div className="mt-1 text-[11px] leading-5 text-[#7a271a]">
            {session.errorMessage ?? '请查看输出日志定位失败原因。'}
          </div>
        </div>
      </div>
    </div>
  );
};

export const ExecutionLineagePanel = ({
  resourceName,
}: {
  resourceName: string;
}) => (
  <div className="flex h-full items-center justify-center bg-[#fafbfc] p-6">
    <div className="flex items-center gap-6">
      {['上游数据源', resourceName, '下游数据表'].map((label, index) => (
        <div key={label} className="flex items-center gap-6">
          <div className="min-w-[150px] border border-[#dfe2e6] bg-white px-4 py-3 text-center shadow-sm">
            <CircleDot
              size={15}
              className="mx-auto text-[var(--yak-brand-color)]"
            />
            <div className="mt-2 truncate text-[12px] font-medium text-[#161823]">
              {label}
            </div>
          </div>
          {index < 2 && (
            <span className="h-px w-16 bg-[#cfd3d8] after:float-right after:-mt-[3px] after:block after:h-2 after:w-2 after:rotate-45 after:border-r after:border-t after:border-[#cfd3d8]" />
          )}
        </div>
      ))}
    </div>
  </div>
);

export const ExecutionPublishPanel = ({
  published,
}: {
  published: boolean;
}) => (
  <div className="h-full overflow-auto p-4">
    <div className="mx-auto max-w-[920px]">
      <div className="flex items-center justify-between border-b border-[#eceef0] pb-3">
        <div>
          <h3 className="m-0 text-[14px] font-semibold text-[#161823]">
            上线发布内容
          </h3>
          <p className="mb-0 mt-1 text-[11px] text-[rgba(22,24,35,0.44)]">
            运行结果确认后，可创建不可变发布版本并进入生产检查流程。
          </p>
        </div>
        <Tag bordered={false} color={published ? 'success' : 'default'}>
          {published ? '已有发布版本' : '未发布'}
        </Tag>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-4">
        {['发布包构建', '生产检查器', '发布到生产环境'].map((label, index) => (
          <div key={label} className="border border-[#e5e7ea] bg-[#fafbfc] p-3">
            <span className="flex h-5 w-5 items-center justify-center rounded-full border border-[#d6d9dd] text-[10px] text-[rgba(22,24,35,0.52)]">
              {index + 1}
            </span>
            <div className="mt-2 text-[12px] font-medium text-[#161823]">
              {label}
            </div>
            <div className="mt-1 text-[11px] text-[rgba(22,24,35,0.4)]">
              {published ? '等待下一次发布' : '未开始'}
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

export const ExecutionValidationPanel = ({
  session,
}: {
  session?: ExecutionSession;
}) => (
  <div className="h-full overflow-auto p-4">
    <div className="space-y-2">
      {[
        ['语法检查', '通过'],
        ['依赖资源检查', '通过'],
        ['运行参数检查', '通过'],
        ['数据源连通性', session ? '通过' : '等待运行'],
      ].map(([label, value]) => (
        <div
          key={label}
          className="flex items-center justify-between border-b border-[#eceef0] px-2 py-2.5"
        >
          <span className="text-[12px] text-[rgba(22,24,35,0.7)]">
            {label}
          </span>
          <span className="flex items-center gap-1.5 text-[11px] text-[#14945f]">
            <CheckCircle2 size={13} /> {value}
          </span>
        </div>
      ))}
    </div>
  </div>
);

export const ExecutionQualityPanel = () => (
  <ExecutionEmptyPanel description="质量测试框架已预留，后续可接入规则模板和测试报告" />
);

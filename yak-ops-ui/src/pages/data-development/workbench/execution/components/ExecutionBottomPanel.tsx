import { Button, Empty, Tag, Tooltip } from 'antd';
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CircleDot,
  GitBranch,
  History,
  ListChecks,
  LoaderCircle,
  Maximize2,
  Minimize2,
  PackageCheck,
  PanelBottomClose,
  ScrollText,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';
import { useMemo } from 'react';
import { nodePluginRegistry } from '../../core/registry';
import {
  selectActiveResource,
  useWorkbenchStore,
} from '../../store/workbench.store';
import {
  executionResultDefinitionRegistry,
  executionResultRendererRegistry,
} from '../registry';
import {
  EXECUTION_PANEL_DEFAULT_HEIGHT,
  EXECUTION_PANEL_MAX_HEIGHT,
  EXECUTION_PANEL_MIN_HEIGHT,
  useExecutionPanelStore,
} from '../store/execution-panel.store';
import type {
  ExecutionPanelTabKey,
  ExecutionSession,
} from '../types';
import ExecutionPanelResizeHandle from './ExecutionPanelResizeHandle';

const PANEL_TABS: Array<{
  key: ExecutionPanelTabKey;
  label: string;
  icon: typeof AlertCircle;
}> = [
  { key: 'problems', label: '问题', icon: AlertCircle },
  { key: 'output', label: '输出', icon: ScrollText },
  { key: 'lineage', label: '血缘', icon: GitBranch },
  { key: 'result', label: '结果', icon: ListChecks },
  { key: 'publish', label: '发布', icon: PackageCheck },
  { key: 'validation', label: '深度检查', icon: ShieldCheck },
  { key: 'quality', label: '质量测试', icon: Sparkles },
];

const formatDateTime = (value?: string) => {
  if (!value) return '-';
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(new Date(value));
};

const formatDuration = (durationMs?: number) => {
  if (durationMs === undefined) return '-';
  if (durationMs < 1000) return `${durationMs} ms`;
  return `${(durationMs / 1000).toFixed(2)} s`;
};

const ExecutionStatusTag = ({ session }: { session: ExecutionSession }) => {
  const running = session.status === 'RUNNING';
  const success = session.status === 'SUCCESS';
  const stopped = session.status === 'STOPPED';

  return (
    <Tag
      bordered={false}
      icon={
        running ? (
          <LoaderCircle size={12} className="animate-spin" />
        ) : success ? (
          <CheckCircle2 size={12} />
        ) : stopped ? (
          <PanelBottomClose size={12} />
        ) : (
          <AlertCircle size={12} />
        )
      }
      color={
        running ? 'processing' : success ? 'success' : stopped ? 'default' : 'error'
      }
      className="!m-0"
    >
      {running
        ? '运行中'
        : success
          ? '运行成功'
          : stopped
            ? '已停止'
            : '运行失败'}
    </Tag>
  );
};

const SessionSummary = ({ session }: { session: ExecutionSession }) => (
  <div className="grid shrink-0 grid-cols-[auto_repeat(4,minmax(120px,1fr))] items-center gap-4 border-b border-[#eceef0] bg-[#fafbfc] px-3 py-2 text-[11px]">
    <ExecutionStatusTag session={session} />
    <div>
      <div className="text-[rgba(22,24,35,0.38)]">执行 ID</div>
      <div className="mt-0.5 truncate font-mono text-[rgba(22,24,35,0.7)]">
        {session.id}
      </div>
    </div>
    <div>
      <div className="text-[rgba(22,24,35,0.38)]">开始时间</div>
      <div className="mt-0.5 text-[rgba(22,24,35,0.7)]">
        {formatDateTime(session.startedAt)}
      </div>
    </div>
    <div>
      <div className="text-[rgba(22,24,35,0.38)]">结束时间</div>
      <div className="mt-0.5 text-[rgba(22,24,35,0.7)]">
        {formatDateTime(session.finishedAt)}
      </div>
    </div>
    <div>
      <div className="text-[rgba(22,24,35,0.38)]">运行耗时</div>
      <div className="mt-0.5 text-[rgba(22,24,35,0.7)]">
        {formatDuration(session.durationMs)}
      </div>
    </div>
  </div>
);

const EmptyPanel = ({ description }: { description: string }) => (
  <div className="flex h-full items-center justify-center bg-white">
    <Empty
      image={Empty.PRESENTED_IMAGE_SIMPLE}
      description={
        <span className="text-[12px] text-[rgba(22,24,35,0.42)]">
          {description}
        </span>
      }
    />
  </div>
);

const OutputPanel = ({ session }: { session?: ExecutionSession }) => {
  if (!session) return <EmptyPanel description="运行节点后可查看实时输出" />;

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

const ProblemsPanel = ({ session }: { session?: ExecutionSession }) => {
  if (!session || session.status !== 'FAILED') {
    return <EmptyPanel description="当前节点没有发现问题" />;
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

const LineagePanel = ({ resourceName }: { resourceName: string }) => (
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

const PublishPanel = ({ published }: { published: boolean }) => (
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

const ValidationPanel = ({ session }: { session?: ExecutionSession }) => (
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

const QualityPanel = () => (
  <EmptyPanel description="质量测试框架已预留，后续可接入规则模板和测试报告" />
);

const ExecutionBottomPanel = () => {
  const resource = useWorkbenchStore(selectActiveResource);
  const resourcesById = useWorkbenchStore((state) => state.resourcesById);
  const visible = useExecutionPanelStore((state) => state.visible);
  const height = useExecutionPanelStore((state) => state.height);
  const maximized = useExecutionPanelStore((state) => state.maximized);
  const activeTab = useExecutionPanelStore((state) => state.activeTab);
  const sessionsById = useExecutionPanelStore((state) => state.sessionsById);
  const sessionIdsByResourceId = useExecutionPanelStore(
    (state) => state.sessionIdsByResourceId,
  );
  const activeSessionIdByResourceId = useExecutionPanelStore(
    (state) => state.activeSessionIdByResourceId,
  );
  const setVisible = useExecutionPanelStore((state) => state.setVisible);
  const setHeight = useExecutionPanelStore((state) => state.setHeight);
  const setMaximized = useExecutionPanelStore((state) => state.setMaximized);
  const setActiveTab = useExecutionPanelStore((state) => state.setActiveTab);
  const selectSession = useExecutionPanelStore((state) => state.selectSession);

  const sessionIds = resource
    ? sessionIdsByResourceId[resource.id] ?? []
    : [];
  const activeSessionId = resource
    ? activeSessionIdByResourceId[resource.id]
    : undefined;
  const activeSession = activeSessionId
    ? sessionsById[activeSessionId]
    : undefined;
  const plugin = resource
    ? nodePluginRegistry.get(resource.resourceType)
    : undefined;

  const ResultRenderer = useMemo(() => {
    if (!resource) return undefined;
    const definition =
      executionResultDefinitionRegistry.get(resource.resourceType) ??
      executionResultDefinitionRegistry.get('RESOURCE');
    return definition
      ? executionResultRendererRegistry.get(definition.rendererKey)
      : undefined;
  }, [resource]);

  if (!visible) return null;

  const renderPanelContent = () => {
    if (!resource) return <EmptyPanel description="请先打开一个开发节点" />;

    if (activeTab === 'problems') {
      return <ProblemsPanel session={activeSession} />;
    }
    if (activeTab === 'output') {
      return <OutputPanel session={activeSession} />;
    }
    if (activeTab === 'lineage') {
      return <LineagePanel resourceName={resource.name} />;
    }
    if (activeTab === 'publish') {
      return <PublishPanel published={resource.status === 'PUBLISHED'} />;
    }
    if (activeTab === 'validation') {
      return <ValidationPanel session={activeSession} />;
    }
    if (activeTab === 'quality') {
      return <QualityPanel />;
    }

    if (!activeSession) {
      return <EmptyPanel description="点击运行后将在这里展示节点运行结果" />;
    }
    if (activeSession.status === 'RUNNING') {
      return <OutputPanel session={activeSession} />;
    }
    if (!activeSession.result || !ResultRenderer || !plugin) {
      return <EmptyPanel description="当前执行暂无可展示结果" />;
    }

    return (
      <ResultRenderer
        resource={resource}
        plugin={plugin}
        session={activeSession}
        payload={activeSession.result}
      />
    );
  };

  return (
    <section
      style={{ height }}
      className="relative flex min-h-0 shrink-0 flex-col border-t border-[#dfe2e6] bg-white shadow-[0_-8px_24px_rgba(16,24,40,0.03)]"
    >
      <ExecutionPanelResizeHandle
        value={height}
        min={EXECUTION_PANEL_MIN_HEIGHT}
        max={EXECUTION_PANEL_MAX_HEIGHT}
        defaultValue={EXECUTION_PANEL_DEFAULT_HEIGHT}
        onChange={setHeight}
      />

      <header className="flex h-10 shrink-0 items-center justify-between border-b border-[#eceef0] px-2">
        <div className="flex min-w-0 items-center gap-0.5 overflow-x-auto">
          {PANEL_TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.key;
            const badge =
              tab.key === 'problems' && activeSession?.status === 'FAILED'
                ? 1
                : undefined;

            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={[
                  'relative flex h-10 shrink-0 items-center gap-1.5 border-0 bg-transparent px-3 text-[11px] transition-colors',
                  active
                    ? 'font-medium text-[#161823]'
                    : 'text-[rgba(22,24,35,0.5)] hover:text-[#161823]',
                ].join(' ')}
              >
                <Icon size={13} />
                {tab.label}
                {badge && (
                  <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--yak-brand-color)] px-1 text-[9px] text-white">
                    {badge}
                  </span>
                )}
                {active && (
                  <span className="absolute inset-x-2 bottom-0 h-0.5 bg-[var(--yak-brand-color)]" />
                )}
              </button>
            );
          })}
        </div>

        <div className="flex shrink-0 items-center gap-0.5 border-l border-[#eceef0] pl-2">
          <Tooltip title={maximized ? '还原面板' : '展开面板'}>
            <Button
              type="text"
              size="small"
              className="!h-7 !w-7 !px-0"
              icon={
                maximized ? <Minimize2 size={14} /> : <Maximize2 size={14} />
              }
              onClick={() => setMaximized(!maximized)}
            />
          </Tooltip>
          <Tooltip title="缩小面板">
            <Button
              type="text"
              size="small"
              className="!h-7 !w-7 !px-0"
              icon={<ChevronDown size={14} />}
              onClick={() => setHeight(EXECUTION_PANEL_MIN_HEIGHT)}
            />
          </Tooltip>
          <Tooltip title="恢复默认高度">
            <Button
              type="text"
              size="small"
              className="!h-7 !w-7 !px-0"
              icon={<ChevronUp size={14} />}
              onClick={() => setHeight(EXECUTION_PANEL_DEFAULT_HEIGHT)}
            />
          </Tooltip>
          <Tooltip title="关闭运行面板">
            <Button
              type="text"
              size="small"
              className="!h-7 !w-7 !px-0"
              icon={<X size={14} />}
              onClick={() => setVisible(false)}
            />
          </Tooltip>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <aside className="w-[220px] shrink-0 overflow-y-auto border-r border-[#eceef0] bg-[#fafbfc]">
          <div className="flex h-9 items-center gap-2 border-b border-[#eceef0] px-3 text-[11px] font-medium text-[rgba(22,24,35,0.62)]">
            <History size={13} />
            运行记录
          </div>

          {sessionIds.length === 0 ? (
            <div className="px-3 py-5 text-center text-[11px] leading-5 text-[rgba(22,24,35,0.36)]">
              当前节点暂无运行记录
            </div>
          ) : (
            <div className="py-1">
              {sessionIds.map((sessionId, index) => {
                const session = sessionsById[sessionId];
                if (!session) return null;
                const active = sessionId === activeSessionId;

                return (
                  <button
                    key={sessionId}
                    type="button"
                    onClick={() =>
                      resource && selectSession(resource.id, sessionId)
                    }
                    className={[
                      'flex w-full items-start gap-2 border-0 px-3 py-2 text-left transition-colors',
                      active
                        ? 'bg-[var(--yak-brand-color-soft)]'
                        : 'bg-transparent hover:bg-[#f1f2f4]',
                    ].join(' ')}
                  >
                    <span className="mt-0.5">
                      {session.status === 'RUNNING' ? (
                        <LoaderCircle
                          size={13}
                          className="animate-spin text-[#1677ff]"
                        />
                      ) : session.status === 'SUCCESS' ? (
                        <CheckCircle2 size={13} className="text-[#14945f]" />
                      ) : (
                        <AlertCircle size={13} className="text-[#d92d20]" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[11px] font-medium text-[rgba(22,24,35,0.72)]">
                        {resource?.name ?? resourcesById[session.resourceId]?.name}
                        {index === 0 ? ' · 最新' : ''}
                      </span>
                      <span className="mt-0.5 block text-[10px] text-[rgba(22,24,35,0.36)]">
                        {formatDateTime(session.startedAt)} · {session.engine}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </aside>

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          {activeSession && <SessionSummary session={activeSession} />}
          <div className="min-h-0 flex-1 overflow-hidden">
            {renderPanelContent()}
          </div>
        </div>
      </div>
    </section>
  );
};

export default ExecutionBottomPanel;

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
import {
  ExecutionLineagePanel,
  ExecutionOutputPanel,
  ExecutionProblemsPanel,
  ExecutionPublishPanel,
  ExecutionQualityPanel,
  ExecutionValidationPanel,
} from './ExecutionCommonPanels';
import ExecutionPanelHeader from './ExecutionPanelHeader';
import ExecutionPanelResizeHandle from './ExecutionPanelResizeHandle';
import {
  ExecutionEmptyPanel,
  ExecutionSessionSummary,
} from './ExecutionPanelShared';
import ExecutionSessionList from './ExecutionSessionList';

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
    if (!resource) {
      return <ExecutionEmptyPanel description="请先打开一个开发节点" />;
    }

    if (activeTab === 'problems') {
      return <ExecutionProblemsPanel session={activeSession} />;
    }
    if (activeTab === 'output') {
      return <ExecutionOutputPanel session={activeSession} />;
    }
    if (activeTab === 'lineage') {
      return <ExecutionLineagePanel resourceName={resource.name} />;
    }
    if (activeTab === 'publish') {
      return (
        <ExecutionPublishPanel published={resource.status === 'PUBLISHED'} />
      );
    }
    if (activeTab === 'validation') {
      return <ExecutionValidationPanel session={activeSession} />;
    }
    if (activeTab === 'quality') {
      return <ExecutionQualityPanel />;
    }

    if (!activeSession) {
      return (
        <ExecutionEmptyPanel description="点击运行后将在这里展示节点运行结果" />
      );
    }
    if (activeSession.status === 'RUNNING') {
      return <ExecutionOutputPanel session={activeSession} />;
    }
    if (!activeSession.result || !ResultRenderer || !plugin) {
      return <ExecutionEmptyPanel description="当前执行暂无可展示结果" />;
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
      style={{ height, maxHeight: 'calc(100% - 120px)' }}
      className="relative flex min-h-0 shrink-0 flex-col border-t border-[#dfe2e6] bg-white shadow-[0_-8px_24px_rgba(16,24,40,0.03)]"
    >
      <ExecutionPanelResizeHandle
        value={height}
        min={EXECUTION_PANEL_MIN_HEIGHT}
        max={EXECUTION_PANEL_MAX_HEIGHT}
        defaultValue={EXECUTION_PANEL_DEFAULT_HEIGHT}
        onChange={setHeight}
      />

      <ExecutionPanelHeader
        activeTab={activeTab}
        activeSession={activeSession}
        maximized={maximized}
        onTabChange={setActiveTab}
        onToggleMaximized={() => setMaximized(!maximized)}
        onMinimize={() => setHeight(EXECUTION_PANEL_MIN_HEIGHT)}
        onRestore={() => setHeight(EXECUTION_PANEL_DEFAULT_HEIGHT)}
        onClose={() => setVisible(false)}
      />

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <ExecutionSessionList
          resource={resource}
          resourcesById={resourcesById}
          sessionIds={sessionIds}
          sessionsById={sessionsById}
          activeSessionId={activeSessionId}
          onSelect={(sessionId) =>
            resource && selectSession(resource.id, sessionId)
          }
        />

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          {activeSession && (
            <ExecutionSessionSummary session={activeSession} />
          )}
          <div className="min-h-0 flex-1 overflow-hidden">
            {renderPanelContent()}
          </div>
        </div>
      </div>
    </section>
  );
};

export default ExecutionBottomPanel;

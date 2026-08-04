import { nodePluginRegistry } from '../core/registry';
import type { WorkbenchActionContext } from '../core/types';
import { useWorkbenchControlStore } from '../store/workbench-control.store';
import { useWorkbenchStore } from '../store/workbench.store';
import {
  executionRepository,
  toExecutionSession,
  toWorkbenchExecutionStatus,
  type ApiExecutionEvent,
  type ApiExecutionStatus,
} from './execution.repository';
import { useExecutionPanelStore } from './store/execution-panel.store';
import type { ExecutionSession } from './types';

const observers = new Map<string, () => void>();
const pollers = new Map<string, number>();
const lastSequence = new Map<string, number>();

const terminal = (status: ApiExecutionStatus) =>
  status === 'SUCCEEDED' ||
  status === 'FAILED' ||
  status === 'CANCELED' ||
  status === 'TIMED_OUT' ||
  status === 'LOST';

const upsertSession = (session: ExecutionSession) => {
  useExecutionPanelStore.setState((state) => ({
    sessionsById: {
      ...state.sessionsById,
      [session.id]: session,
    },
    sessionIdsByResourceId: {
      ...state.sessionIdsByResourceId,
      [session.resourceId]: [
        session.id,
        ...(state.sessionIdsByResourceId[session.resourceId] ?? []).filter(
          (id) => id !== session.id,
        ),
      ],
    },
    activeSessionIdByResourceId: {
      ...state.activeSessionIdByResourceId,
      [session.resourceId]: session.id,
    },
    visible: true,
    activeTab: session.status === 'SUCCESS' ? 'result' : 'output',
  }));
};

const stopObservation = (executionId: string) => {
  observers.get(executionId)?.();
  observers.delete(executionId);
  const poller = pollers.get(executionId);
  if (poller !== undefined) window.clearInterval(poller);
  pollers.delete(executionId);
};

const refreshExecution = async (executionId: string) => {
  const detail = await executionRepository.getDetail(executionId);
  const session = toExecutionSession(detail);
  upsertSession(session);
  const status = toWorkbenchExecutionStatus(detail.execution.status);
  useWorkbenchStore.getState().setExecutionStatus(session.resourceId, status);
  useWorkbenchControlStore.setState((state) => ({
    executionIdByResourceId: {
      ...state.executionIdByResourceId,
      [session.resourceId]: executionId,
    },
  }));
  if (terminal(detail.execution.status)) stopObservation(executionId);
};

const appendLog = (executionId: string, event: ApiExecutionEvent) => {
  useExecutionPanelStore.setState((state) => {
    const session = state.sessionsById[executionId];
    if (!session) return state;
    const level =
      event.payload.level === 'ERROR'
        ? 'ERROR'
        : event.payload.level === 'WARN'
          ? 'WARN'
          : 'INFO';
    return {
      sessionsById: {
        ...state.sessionsById,
        [executionId]: {
          ...session,
          logs: [
            ...session.logs,
            {
              id: String(event.id),
              level,
              timestamp: new Intl.DateTimeFormat('zh-CN', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false,
              }).format(new Date(event.occurredAt)),
              message: String(event.payload.line ?? ''),
            },
          ],
        },
      },
      visible: true,
      activeTab: 'output',
    };
  });
};

const startPollingFallback = (executionId: string) => {
  if (pollers.has(executionId)) return;
  const poller = window.setInterval(() => {
    void refreshExecution(executionId).catch(() => undefined);
  }, 1500);
  pollers.set(executionId, poller);
};

export const observeExecution = (
  context: WorkbenchActionContext,
  executionId: string,
) => {
  stopObservation(executionId);
  const submittedAt = new Date().toISOString();
  upsertSession({
    id: executionId,
    resourceId: context.resource.id,
    resourceType: context.resource.resourceType,
    resourceName: context.resource.name,
    engine: context.resource.engine,
    status: 'QUEUED',
    submittedAt,
    startedAt: submittedAt,
    logs: [
      {
        id: `${executionId}-queued`,
        level: 'INFO',
        timestamp: new Intl.DateTimeFormat('zh-CN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        }).format(new Date()),
        message: '执行已进入本地 Execution Gateway 队列',
      },
    ],
  });

  const close = executionRepository.watch(
    executionId,
    lastSequence.get(executionId) ?? 0,
    (event) => {
      lastSequence.set(executionId, event.sequenceNo);
      if (event.eventType === 'LOG') appendLog(executionId, event);
      if (event.eventType !== 'LOG') {
        void refreshExecution(executionId).catch(() =>
          startPollingFallback(executionId),
        );
      }
    },
    () => startPollingFallback(executionId),
  );
  observers.set(executionId, close);
  void refreshExecution(executionId).catch(() => startPollingFallback(executionId));
};

export const observeExecutionForResource = (
  resourceId: string,
  executionId: string,
) => {
  const workbench = useWorkbenchStore.getState();
  const resource = workbench.resourcesById[resourceId];
  const document = workbench.documentsByResourceId[resourceId];
  if (!resource || !document) return;
  const plugin = nodePluginRegistry.get(resource.resourceType);
  if (!plugin) return;
  observeExecution(
    { resource, document, plugin, executionStatus: 'QUEUED' },
    executionId,
  );
};

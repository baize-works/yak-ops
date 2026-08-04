import { create } from 'zustand';
import type {
  DevelopmentResource,
  NodePluginDefinition,
} from '../../core/types';
import {
  completeMockExecutionSession,
  createRunningExecutionSession,
} from '../mock-results';
import type {
  ExecutionPanelTabKey,
  ExecutionSession,
} from '../types';

const PANEL_MIN_HEIGHT = 190;
const PANEL_MAX_HEIGHT = 640;
const PANEL_DEFAULT_HEIGHT = 330;

interface ExecutionPanelStoreState {
  sessionsById: Record<string, ExecutionSession>;
  sessionIdsByResourceId: Record<string, string[]>;
  activeSessionIdByResourceId: Record<string, string | undefined>;
  visible: boolean;
  height: number;
  maximized: boolean;
  activeTab: ExecutionPanelTabKey;

  setVisible: (visible: boolean) => void;
  setHeight: (height: number) => void;
  setMaximized: (maximized: boolean) => void;
  setActiveTab: (tab: ExecutionPanelTabKey) => void;
  openForResource: (
    resourceId: string,
    tab?: ExecutionPanelTabKey,
  ) => void;
  startExecution: (
    resource: DevelopmentResource,
    plugin: NodePluginDefinition,
  ) => string;
  completeExecution: (
    executionId: string,
    resource: DevelopmentResource,
  ) => void;
  stopExecution: (resourceId: string) => void;
  selectSession: (resourceId: string, sessionId: string) => void;
  clearResourceSessions: (resourceId: string) => void;
}

const clampHeight = (height: number) =>
  Math.min(PANEL_MAX_HEIGHT, Math.max(PANEL_MIN_HEIGHT, Math.round(height)));

export const useExecutionPanelStore = create<ExecutionPanelStoreState>(
  (set, get) => ({
    sessionsById: {},
    sessionIdsByResourceId: {},
    activeSessionIdByResourceId: {},
    visible: false,
    height: PANEL_DEFAULT_HEIGHT,
    maximized: false,
    activeTab: 'result',

    setVisible: (visible) => set({ visible }),
    setHeight: (height) =>
      set({ height: clampHeight(height), maximized: false }),
    setMaximized: (maximized) =>
      set({
        maximized,
        height: maximized ? PANEL_MAX_HEIGHT : PANEL_DEFAULT_HEIGHT,
      }),
    setActiveTab: (activeTab) => set({ activeTab }),

    openForResource: (resourceId, tab = 'result') =>
      set((state) => ({
        visible: true,
        activeTab: tab,
        activeSessionIdByResourceId: {
          ...state.activeSessionIdByResourceId,
          [resourceId]:
            state.activeSessionIdByResourceId[resourceId] ??
            state.sessionIdsByResourceId[resourceId]?.[0],
        },
      })),

    startExecution: (resource, plugin) => {
      const session = createRunningExecutionSession(resource, plugin);

      set((state) => ({
        sessionsById: {
          ...state.sessionsById,
          [session.id]: session,
        },
        sessionIdsByResourceId: {
          ...state.sessionIdsByResourceId,
          [resource.id]: [
            session.id,
            ...(state.sessionIdsByResourceId[resource.id] ?? []),
          ],
        },
        activeSessionIdByResourceId: {
          ...state.activeSessionIdByResourceId,
          [resource.id]: session.id,
        },
        visible: true,
        activeTab: 'output',
      }));

      return session.id;
    },

    completeExecution: (executionId, resource) =>
      set((state) => {
        const session = state.sessionsById[executionId];
        if (!session || session.status !== 'RUNNING') return state;

        return {
          sessionsById: {
            ...state.sessionsById,
            [executionId]: completeMockExecutionSession(session, resource),
          },
          activeTab:
            state.activeSessionIdByResourceId[resource.id] === executionId
              ? 'result'
              : state.activeTab,
          visible: true,
        };
      }),

    stopExecution: (resourceId) =>
      set((state) => {
        const activeSessionId =
          state.activeSessionIdByResourceId[resourceId];
        const session = activeSessionId
          ? state.sessionsById[activeSessionId]
          : undefined;
        if (!activeSessionId || !session) return state;

        const finishedAt = new Date().toISOString();
        return {
          sessionsById: {
            ...state.sessionsById,
            [activeSessionId]: {
              ...session,
              status: 'STOPPED',
              finishedAt,
              durationMs:
                new Date(finishedAt).getTime() -
                new Date(session.startedAt).getTime(),
              logs: [
                ...session.logs,
                {
                  id: `${activeSessionId}-stopped`,
                  level: 'WARN',
                  timestamp: new Intl.DateTimeFormat('zh-CN', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: false,
                  }).format(new Date()),
                  message: '用户提交停止请求，执行已中止',
                },
              ],
            },
          },
          visible: true,
          activeTab: 'output',
        };
      }),

    selectSession: (resourceId, sessionId) =>
      set((state) => ({
        activeSessionIdByResourceId: {
          ...state.activeSessionIdByResourceId,
          [resourceId]: sessionId,
        },
      })),

    clearResourceSessions: (resourceId) => {
      const state = get();
      const sessionIds = state.sessionIdsByResourceId[resourceId] ?? [];
      const nextSessions = { ...state.sessionsById };
      sessionIds.forEach((sessionId) => delete nextSessions[sessionId]);

      set({
        sessionsById: nextSessions,
        sessionIdsByResourceId: {
          ...state.sessionIdsByResourceId,
          [resourceId]: [],
        },
        activeSessionIdByResourceId: {
          ...state.activeSessionIdByResourceId,
          [resourceId]: undefined,
        },
      });
    },
  }),
);

export const EXECUTION_PANEL_DEFAULT_HEIGHT = PANEL_DEFAULT_HEIGHT;
export const EXECUTION_PANEL_MIN_HEIGHT = PANEL_MIN_HEIGHT;
export const EXECUTION_PANEL_MAX_HEIGHT = PANEL_MAX_HEIGHT;

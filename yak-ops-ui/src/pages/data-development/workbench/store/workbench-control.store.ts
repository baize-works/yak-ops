import { create } from 'zustand';
import type { ExecutionStatus, WorkspaceSnapshot } from '../core/types';
import {
  workbenchErrorMessage,
  workbenchRepository,
} from '../repository/workbench.repository';
import { useWorkbenchStore } from './workbench.store';

interface WorkbenchControlState {
  projectId?: string;
  projectName: string;
  supportedTaskTypes: string[];
  workspaceLoading: boolean;
  workspaceError?: string;
  executionIdByResourceId: Record<string, string>;

  initialize: () => Promise<void>;
  setExecutionRecord: (
    resourceId: string,
    executionId: string,
    status: ExecutionStatus,
  ) => void;
  clearExecutionRecord: (resourceId: string) => void;
}

const indexSnapshot = (snapshot: WorkspaceSnapshot) => {
  const resourcesById = Object.fromEntries(
    snapshot.resources.map((resource) => [resource.id, resource]),
  );
  const documentsByResourceId = Object.fromEntries(
    snapshot.documents.map((document) => [document.resourceId, document]),
  );
  const resourceIdsByFolder = snapshot.resources.reduce<
    Record<string, string[]>
  >((groups, resource) => {
    groups[resource.folderId] = [
      ...(groups[resource.folderId] ?? []),
      resource.id,
    ];
    return groups;
  }, {});
  const expandedFolderIds = Object.keys(resourceIdsByFolder).reduce<
    Record<string, boolean>
  >((result, folderId) => {
    result[folderId] = true;
    return result;
  }, {});

  return {
    resourcesById,
    documentsByResourceId,
    resourceIdsByFolder,
    expandedFolderIds,
  };
};

const clearWorkspace = () => {
  useWorkbenchStore.setState({
    resourcesById: {},
    documentsByResourceId: {},
    resourceIdsByFolder: {},
    openResourceIds: [],
    activeResourceId: undefined,
    previewResourceId: undefined,
    pinnedResourceIds: [],
    splitResourceId: undefined,
    expandedFolderIds: {},
    executionStatusByResourceId: {},
    scheduleEnabledByResourceId: {},
  });
};

clearWorkspace();

export const useWorkbenchControlStore = create<WorkbenchControlState>(
  (set, get) => ({
    projectId: undefined,
    projectName: '用户数据平台',
    supportedTaskTypes: [],
    workspaceLoading: false,
    workspaceError: undefined,
    executionIdByResourceId: {},

    initialize: async () => {
      if (get().workspaceLoading) return;
      set({ workspaceLoading: true, workspaceError: undefined });
      clearWorkspace();

      try {
        const result = await workbenchRepository.bootstrap();
        const snapshot = result.snapshot;
        useWorkbenchStore.setState({
          ...indexSnapshot(snapshot),
          openResourceIds: snapshot.openResourceIds,
          activeResourceId: snapshot.activeResourceId,
          previewResourceId: undefined,
          pinnedResourceIds: snapshot.openResourceIds,
          splitResourceId: undefined,
          executionStatusByResourceId: {},
          scheduleEnabledByResourceId: {},
        });
        set({
          projectId: String(result.project.id),
          projectName: result.project.name,
          supportedTaskTypes: result.supportedTaskTypes,
          workspaceLoading: false,
          workspaceError: undefined,
          executionIdByResourceId: {},
        });
      } catch (error) {
        set({
          workspaceLoading: false,
          workspaceError: workbenchErrorMessage(error),
        });
      }
    },

    setExecutionRecord: (resourceId, executionId, status) => {
      useWorkbenchStore.getState().setExecutionStatus(resourceId, status);
      set((state) => ({
        executionIdByResourceId: {
          ...state.executionIdByResourceId,
          [resourceId]: executionId,
        },
      }));

      if (status === 'QUEUED') {
        void import('../execution/execution.sync').then(
          ({ observeExecutionForResource }) =>
            observeExecutionForResource(resourceId, executionId),
        );
      }
    },

    clearExecutionRecord: (resourceId) =>
      set((state) => {
        const next = { ...state.executionIdByResourceId };
        delete next[resourceId];
        return { executionIdByResourceId: next };
      }),
  }),
);

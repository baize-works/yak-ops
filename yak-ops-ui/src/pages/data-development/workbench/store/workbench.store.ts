import dayjs from 'dayjs';
import { create } from 'zustand';
import type {
  DevelopmentDocument,
  DevelopmentResource,
  ExecutionStatus,
  ExplorerFilter,
  RightPanelKey,
} from '../core/types';
import { createMockWorkspaceSnapshot } from '../mock/workspace';

interface WorkbenchStoreState {
  resourcesById: Record<string, DevelopmentResource>;
  documentsByResourceId: Record<string, DevelopmentDocument>;
  resourceIdsByFolder: Record<string, string[]>;
  openResourceIds: string[];
  activeResourceId?: string;
  expandedFolderIds: Record<string, boolean>;
  executionStatusByResourceId: Record<string, ExecutionStatus>;
  scheduleEnabledByResourceId: Record<string, boolean>;

  explorerFilter: ExplorerFilter;
  explorerKeyword: string;
  explorerVisible: boolean;
  fullscreen: boolean;
  rightPanel: RightPanelKey | null;

  setExplorerFilter: (filter: ExplorerFilter) => void;
  setExplorerKeyword: (keyword: string) => void;
  setExplorerVisible: (visible: boolean) => void;
  setFullscreen: (fullscreen: boolean) => void;
  setRightPanel: (panel: RightPanelKey | null) => void;
  toggleFolder: (folderId: string) => void;

  openResource: (resourceId: string) => void;
  closeResource: (resourceId: string) => void;
  setActiveResource: (resourceId: string) => void;
  createResource: (
    resource: DevelopmentResource,
    document: DevelopmentDocument,
  ) => void;
  deleteResource: (resourceId: string) => void;
  updateResource: (
    resourceId: string,
    patch: Partial<DevelopmentResource>,
  ) => void;
  updateDocument: (
    resourceId: string,
    updater: (document: DevelopmentDocument) => DevelopmentDocument,
  ) => void;
  markDocumentSaved: (resourceId: string) => void;
  setExecutionStatus: (
    resourceId: string,
    status: ExecutionStatus,
  ) => void;
  setScheduleEnabled: (resourceId: string, enabled: boolean) => void;
}

const snapshot = createMockWorkspaceSnapshot();

const resourcesById = Object.fromEntries(
  snapshot.resources.map((resource) => [resource.id, resource]),
);
const documentsByResourceId = Object.fromEntries(
  snapshot.documents.map((document) => [document.resourceId, document]),
);
const resourceIdsByFolder = snapshot.resources.reduce<Record<string, string[]>>(
  (groups, resource) => {
    groups[resource.folderId] = [...(groups[resource.folderId] ?? []), resource.id];
    return groups;
  },
  {},
);
const expandedFolderIds = Object.keys(resourceIdsByFolder).reduce<
  Record<string, boolean>
>((result, folderId) => {
  result[folderId] = true;
  return result;
}, {});

export const useWorkbenchStore = create<WorkbenchStoreState>((set, get) => ({
  resourcesById,
  documentsByResourceId,
  resourceIdsByFolder,
  openResourceIds: snapshot.openResourceIds,
  activeResourceId: snapshot.activeResourceId,
  expandedFolderIds,
  executionStatusByResourceId: {},
  scheduleEnabledByResourceId: {},

  explorerFilter: 'all',
  explorerKeyword: '',
  explorerVisible: true,
  fullscreen: false,
  rightPanel: null,

  setExplorerFilter: (explorerFilter) => set({ explorerFilter }),
  setExplorerKeyword: (explorerKeyword) => set({ explorerKeyword }),
  setExplorerVisible: (explorerVisible) => set({ explorerVisible }),
  setFullscreen: (fullscreen) => set({ fullscreen }),
  setRightPanel: (rightPanel) => set({ rightPanel }),
  toggleFolder: (folderId) =>
    set((state: WorkbenchStoreState) => ({
      expandedFolderIds: {
        ...state.expandedFolderIds,
        [folderId]: !state.expandedFolderIds[folderId],
      },
    })),

  openResource: (resourceId) =>
    set((state: WorkbenchStoreState) => ({
      openResourceIds: state.openResourceIds.includes(resourceId)
        ? state.openResourceIds
        : [...state.openResourceIds, resourceId],
      activeResourceId: resourceId,
    })),

  closeResource: (resourceId) => {
    const { openResourceIds, activeResourceId } = get();
    const index = openResourceIds.indexOf(resourceId);
    const nextOpenIds = openResourceIds.filter((id: string) => id !== resourceId);
    const nextActiveId =
      activeResourceId === resourceId
        ? nextOpenIds[Math.max(0, index - 1)] ?? nextOpenIds[0]
        : activeResourceId;

    set({
      openResourceIds: nextOpenIds,
      activeResourceId: nextActiveId,
    });
  },

  setActiveResource: (activeResourceId) => set({ activeResourceId }),

  createResource: (resource, document) =>
    set((state: WorkbenchStoreState) => ({
      resourcesById: {
        ...state.resourcesById,
        [resource.id]: resource,
      },
      documentsByResourceId: {
        ...state.documentsByResourceId,
        [resource.id]: document,
      },
      resourceIdsByFolder: {
        ...state.resourceIdsByFolder,
        [resource.folderId]: [
          ...(state.resourceIdsByFolder[resource.folderId] ?? []),
          resource.id,
        ],
      },
      expandedFolderIds: {
        ...state.expandedFolderIds,
        [resource.folderId]: true,
      },
      openResourceIds: [...state.openResourceIds, resource.id],
      activeResourceId: resource.id,
    })),

  deleteResource: (resourceId) => {
    const state = get();
    const resource = state.resourcesById[resourceId];
    if (!resource) return;

    const nextResources = { ...state.resourcesById };
    const nextDocuments = { ...state.documentsByResourceId };
    const nextExecution = { ...state.executionStatusByResourceId };
    const nextSchedule = { ...state.scheduleEnabledByResourceId };
    delete nextResources[resourceId];
    delete nextDocuments[resourceId];
    delete nextExecution[resourceId];
    delete nextSchedule[resourceId];

    const nextOpenIds = state.openResourceIds.filter((id: string) => id !== resourceId);

    set({
      resourcesById: nextResources,
      documentsByResourceId: nextDocuments,
      executionStatusByResourceId: nextExecution,
      scheduleEnabledByResourceId: nextSchedule,
      resourceIdsByFolder: {
        ...state.resourceIdsByFolder,
        [resource.folderId]: (
          state.resourceIdsByFolder[resource.folderId] ?? []
        ).filter((id: string) => id !== resourceId),
      },
      openResourceIds: nextOpenIds,
      activeResourceId:
        state.activeResourceId === resourceId
          ? nextOpenIds[nextOpenIds.length - 1]
          : state.activeResourceId,
    });
  },

  updateResource: (resourceId, patch) =>
    set((state: WorkbenchStoreState) => {
      const resource = state.resourcesById[resourceId];
      if (!resource) return state;

      return {
        resourcesById: {
          ...state.resourcesById,
          [resourceId]: {
            ...resource,
            ...patch,
            updatedAt: dayjs().format('YYYY-MM-DD HH:mm'),
          },
        },
      };
    }),

  updateDocument: (resourceId, updater) =>
    set((state: WorkbenchStoreState) => {
      const document = state.documentsByResourceId[resourceId];
      if (!document) return state;

      return {
        documentsByResourceId: {
          ...state.documentsByResourceId,
          [resourceId]: updater(document),
        },
      };
    }),

  markDocumentSaved: (resourceId) =>
    set((state: WorkbenchStoreState) => {
      const document = state.documentsByResourceId[resourceId];
      const resource = state.resourcesById[resourceId];
      if (!document || !resource) return state;

      const updatedAt = dayjs().format('YYYY-MM-DD HH:mm');
      const nextRevision = document.revision + 1;

      return {
        documentsByResourceId: {
          ...state.documentsByResourceId,
          [resourceId]: {
            ...document,
            revision: nextRevision,
            dirty: false,
            saveStatus: 'IDLE',
            updatedAt,
          },
        },
        resourcesById: {
          ...state.resourcesById,
          [resourceId]: {
            ...resource,
            latestRevision: nextRevision,
            updatedAt,
          },
        },
      };
    }),

  setExecutionStatus: (resourceId, status) =>
    set((state: WorkbenchStoreState) => ({
      executionStatusByResourceId: {
        ...state.executionStatusByResourceId,
        [resourceId]: status,
      },
    })),

  setScheduleEnabled: (resourceId, enabled) =>
    set((state: WorkbenchStoreState) => ({
      scheduleEnabledByResourceId: {
        ...state.scheduleEnabledByResourceId,
        [resourceId]: enabled,
      },
    })),
}));

export const selectActiveResource = (state: WorkbenchStoreState) =>
  state.activeResourceId
    ? state.resourcesById[state.activeResourceId]
    : undefined;

export const selectActiveDocument = (state: WorkbenchStoreState) =>
  state.activeResourceId
    ? state.documentsByResourceId[state.activeResourceId]
    : undefined;

export type WorkbenchStore = WorkbenchStoreState;

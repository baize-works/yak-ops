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
  previewResourceId?: string;
  pinnedResourceIds: string[];
  splitResourceId?: string;
  expandedFolderIds: Record<string, boolean>;
  executionStatusByResourceId: Record<string, ExecutionStatus>;
  scheduleEnabledByResourceId: Record<string, boolean>;

  explorerFilter: ExplorerFilter;
  explorerKeyword: string;
  explorerVisible: boolean;
  fullscreen: boolean;
  previewEnabled: boolean;
  tabGroupLocked: boolean;
  rightPanel: RightPanelKey | null;

  setExplorerFilter: (filter: ExplorerFilter) => void;
  setExplorerKeyword: (keyword: string) => void;
  setExplorerVisible: (visible: boolean) => void;
  setFullscreen: (fullscreen: boolean) => void;
  setPreviewEnabled: (enabled: boolean) => void;
  setTabGroupLocked: (locked: boolean) => void;
  setRightPanel: (panel: RightPanelKey | null) => void;
  setSplitResource: (resourceId?: string) => void;
  toggleFolder: (folderId: string) => void;

  openResource: (resourceId: string, options?: { pinned?: boolean }) => void;
  closeResource: (resourceId: string) => void;
  closeResources: (resourceIds: string[]) => void;
  setActiveResource: (resourceId: string) => void;
  pinResource: (resourceId: string, pinned?: boolean) => void;
  moveResourceTab: (sourceId: string, targetId: string) => void;
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

const uniqueIds = (ids: string[]) => Array.from(new Set(ids));

export const useWorkbenchStore = create<WorkbenchStoreState>((set, get) => ({
  resourcesById,
  documentsByResourceId,
  resourceIdsByFolder,
  openResourceIds: snapshot.openResourceIds,
  activeResourceId: snapshot.activeResourceId,
  previewResourceId: undefined,
  pinnedResourceIds: [],
  splitResourceId: undefined,
  expandedFolderIds,
  executionStatusByResourceId: {},
  scheduleEnabledByResourceId: {},

  explorerFilter: 'all',
  explorerKeyword: '',
  explorerVisible: true,
  fullscreen: false,
  previewEnabled: true,
  tabGroupLocked: false,
  rightPanel: null,

  setExplorerFilter: (explorerFilter) => set({ explorerFilter }),
  setExplorerKeyword: (explorerKeyword) => set({ explorerKeyword }),
  setExplorerVisible: (explorerVisible) => set({ explorerVisible }),
  setFullscreen: (fullscreen) => set({ fullscreen }),
  setPreviewEnabled: (previewEnabled) =>
    set((state) => ({
      previewEnabled,
      previewResourceId: previewEnabled ? state.previewResourceId : undefined,
    })),
  setTabGroupLocked: (tabGroupLocked) => set({ tabGroupLocked }),
  setRightPanel: (rightPanel) => set({ rightPanel }),
  setSplitResource: (splitResourceId) => set({ splitResourceId }),
  toggleFolder: (folderId) =>
    set((state: WorkbenchStoreState) => ({
      expandedFolderIds: {
        ...state.expandedFolderIds,
        [folderId]: !state.expandedFolderIds[folderId],
      },
    })),

  openResource: (resourceId, options) =>
    set((state: WorkbenchStoreState) => {
      if (!state.resourcesById[resourceId]) return state;

      const alreadyOpen = state.openResourceIds.includes(resourceId);
      const shouldPin = options?.pinned === true;
      const pinnedResourceIds = shouldPin
        ? uniqueIds([...state.pinnedResourceIds, resourceId])
        : state.pinnedResourceIds;

      if (alreadyOpen) {
        return {
          activeResourceId: resourceId,
          pinnedResourceIds,
          previewResourceId:
            shouldPin && state.previewResourceId === resourceId
              ? undefined
              : state.previewResourceId,
        };
      }

      if (!shouldPin && state.previewEnabled && state.previewResourceId) {
        const previousPreviewId = state.previewResourceId;
        const previousPreviewDocument =
          state.documentsByResourceId[previousPreviewId];
        const canReplacePreview =
          !state.pinnedResourceIds.includes(previousPreviewId) &&
          !previousPreviewDocument?.dirty;

        if (canReplacePreview) {
          const previewIndex = state.openResourceIds.indexOf(previousPreviewId);
          const nextOpenIds = [...state.openResourceIds];
          if (previewIndex >= 0) {
            nextOpenIds.splice(previewIndex, 1, resourceId);
          } else {
            nextOpenIds.push(resourceId);
          }

          return {
            openResourceIds: uniqueIds(nextOpenIds),
            activeResourceId: resourceId,
            previewResourceId: resourceId,
            pinnedResourceIds,
          };
        }
      }

      return {
        openResourceIds: [...state.openResourceIds, resourceId],
        activeResourceId: resourceId,
        previewResourceId:
          !shouldPin && state.previewEnabled ? resourceId : undefined,
        pinnedResourceIds,
      };
    }),

  closeResource: (resourceId) => get().closeResources([resourceId]),

  closeResources: (resourceIds) =>
    set((state: WorkbenchStoreState) => {
      const closeSet = new Set(resourceIds);
      if (closeSet.size === 0) return state;

      const nextOpenIds = state.openResourceIds.filter(
        (resourceId) => !closeSet.has(resourceId),
      );
      const activeIndex = state.activeResourceId
        ? state.openResourceIds.indexOf(state.activeResourceId)
        : -1;
      const nextActiveId =
        state.activeResourceId && closeSet.has(state.activeResourceId)
          ? nextOpenIds[Math.max(0, activeIndex - 1)] ?? nextOpenIds[0]
          : state.activeResourceId;

      return {
        openResourceIds: nextOpenIds,
        activeResourceId: nextActiveId,
        previewResourceId:
          state.previewResourceId && closeSet.has(state.previewResourceId)
            ? undefined
            : state.previewResourceId,
        pinnedResourceIds: state.pinnedResourceIds.filter(
          (resourceId) => !closeSet.has(resourceId),
        ),
        splitResourceId:
          state.splitResourceId && closeSet.has(state.splitResourceId)
            ? undefined
            : state.splitResourceId,
      };
    }),

  setActiveResource: (activeResourceId) => set({ activeResourceId }),

  pinResource: (resourceId, pinned) =>
    set((state: WorkbenchStoreState) => {
      const currentlyPinned = state.pinnedResourceIds.includes(resourceId);
      const nextPinned = pinned ?? !currentlyPinned;

      return {
        pinnedResourceIds: nextPinned
          ? uniqueIds([...state.pinnedResourceIds, resourceId])
          : state.pinnedResourceIds.filter((id) => id !== resourceId),
        previewResourceId:
          nextPinned && state.previewResourceId === resourceId
            ? undefined
            : state.previewResourceId,
      };
    }),

  moveResourceTab: (sourceId, targetId) =>
    set((state: WorkbenchStoreState) => {
      if (sourceId === targetId) return state;
      const sourceIndex = state.openResourceIds.indexOf(sourceId);
      const targetIndex = state.openResourceIds.indexOf(targetId);
      if (sourceIndex < 0 || targetIndex < 0) return state;

      const nextOpenIds = [...state.openResourceIds];
      nextOpenIds.splice(sourceIndex, 1);
      nextOpenIds.splice(targetIndex, 0, sourceId);
      return { openResourceIds: nextOpenIds };
    }),

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
      openResourceIds: uniqueIds([...state.openResourceIds, resource.id]),
      activeResourceId: resource.id,
      previewResourceId: undefined,
      pinnedResourceIds: uniqueIds([...state.pinnedResourceIds, resource.id]),
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

    const nextOpenIds = state.openResourceIds.filter((id) => id !== resourceId);

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
      previewResourceId:
        state.previewResourceId === resourceId
          ? undefined
          : state.previewResourceId,
      pinnedResourceIds: state.pinnedResourceIds.filter(
        (id) => id !== resourceId,
      ),
      splitResourceId:
        state.splitResourceId === resourceId
          ? undefined
          : state.splitResourceId,
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
      const nextDocument = updater(document);

      return {
        documentsByResourceId: {
          ...state.documentsByResourceId,
          [resourceId]: nextDocument,
        },
        previewResourceId:
          nextDocument.dirty && state.previewResourceId === resourceId
            ? undefined
            : state.previewResourceId,
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

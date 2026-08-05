import { useEffect, useState } from 'react';

import {
  workflowTaskLibraryRepository,
  type WorkflowPublishedTaskVersion,
} from '../repository/workflow-task-library.repository';
import type { WorkflowV2TaskReference } from '../workflow-v2.types';
import type { WorkflowV2CanvasTaskMeta } from './model';

const versionRequests = new Map<string, Promise<WorkflowPublishedTaskVersion>>();

const cacheKey = (taskRef: WorkflowV2TaskReference) =>
  `${taskRef.taskId}:${taskRef.taskVersionId}`;

export const loadPublishedTaskVersion = (
  taskRef: WorkflowV2TaskReference,
): Promise<WorkflowPublishedTaskVersion> => {
  const key = cacheKey(taskRef);
  const current = versionRequests.get(key);
  if (current) return current;
  const request = workflowTaskLibraryRepository
    .getPublishedVersion(taskRef.taskId, taskRef.taskVersionId)
    .catch((error) => {
      versionRequests.delete(key);
      throw error;
    });
  versionRequests.set(key, request);
  return request;
};

export const publishedVersionToTaskMeta = (
  version: WorkflowPublishedTaskVersion,
  previous?: WorkflowV2CanvasTaskMeta,
): WorkflowV2CanvasTaskMeta => ({
  ...previous,
  projectName: version.projectName,
  pluginVersion: version.pluginVersion,
  publishedAt: version.publishedAt,
  inputSchema: version.inputSchema,
  outputSchema: version.outputSchema,
  schemaStatus: 'ready',
  schemaError: undefined,
});

export const taskSchemaErrorMeta = (
  error: unknown,
  previous?: WorkflowV2CanvasTaskMeta,
): WorkflowV2CanvasTaskMeta => ({
  ...previous,
  schemaStatus: 'error',
  schemaError: error instanceof Error ? error.message : '任务 Schema 加载失败',
});

export const usePublishedTaskSchema = (
  taskRef?: WorkflowV2TaskReference,
  initialMeta?: WorkflowV2CanvasTaskMeta,
) => {
  const [meta, setMeta] = useState<WorkflowV2CanvasTaskMeta | undefined>(
    initialMeta,
  );

  useEffect(() => {
    if (!taskRef || initialMeta?.schemaStatus === 'ready') {
      setMeta(initialMeta);
      return;
    }
    let active = true;
    setMeta((current) => ({ ...current, schemaStatus: 'loading' }));
    loadPublishedTaskVersion(taskRef)
      .then((version) => {
        if (active) {
          setMeta((current) => publishedVersionToTaskMeta(version, current));
        }
      })
      .catch((error: unknown) => {
        if (active) setMeta((current) => taskSchemaErrorMeta(error, current));
      });
    return () => {
      active = false;
    };
  }, [
    initialMeta,
    taskRef?.taskId,
    taskRef?.taskVersionId,
    taskRef?.taskVersionNumber,
  ]);

  return meta;
};

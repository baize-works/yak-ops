import { message } from 'antd';
import { useExecutionPanelStore } from '../execution/store/execution-panel.store';
import {
  isWorkbenchConflict,
  workbenchErrorMessage,
  workbenchRepository,
} from '../repository/workbench.repository';
import { useWorkbenchControlStore } from '../store/workbench-control.store';
import { useWorkbenchStore } from '../store/workbench.store';
import type { ExecutionSession } from '../execution/types';
import type {
  DevelopmentDocument,
  ResourceContent,
  WorkbenchActionContext,
  WorkbenchCommandDefinition,
} from './types';

const updateContent = (
  document: DevelopmentDocument,
  content: ResourceContent,
): DevelopmentDocument => ({
  ...document,
  content,
  dirty: true,
  updatedAt: new Date().toISOString(),
});

const recordSubmittedExecution = (
  context: WorkbenchActionContext,
  executionId: string,
) => {
  const submittedAt = new Date().toISOString();
  const session: ExecutionSession = {
    id: executionId,
    resourceId: context.resource.id,
    resourceType: context.resource.resourceType,
    resourceName: context.resource.name,
    engine: context.resource.engine,
    status: 'RUNNING',
    submittedAt,
    startedAt: submittedAt,
    logs: [
      {
        id: `${executionId}-submitted`,
        level: 'INFO',
        timestamp: new Intl.DateTimeFormat('zh-CN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        }).format(new Date()),
        message: '执行快照已保存，等待 Execution Gateway 接管',
      },
    ],
  };

  useExecutionPanelStore.setState((state) => ({
    sessionsById: {
      ...state.sessionsById,
      [executionId]: session,
    },
    sessionIdsByResourceId: {
      ...state.sessionIdsByResourceId,
      [context.resource.id]: [
        executionId,
        ...(state.sessionIdsByResourceId[context.resource.id] ?? []),
      ],
    },
    activeSessionIdByResourceId: {
      ...state.activeSessionIdByResourceId,
      [context.resource.id]: executionId,
    },
    visible: true,
    activeTab: 'output',
  }));
};

const runResource = async (
  context: WorkbenchActionContext,
  loadingText: string,
) => {
  const store = useWorkbenchStore.getState();
  const controlStore = useWorkbenchControlStore.getState();
  const resourceId = context.resource.id;

  store.setExecutionStatus(resourceId, 'RUNNING');
  message.loading({
    content: `${loadingText}：${context.resource.name}`,
    key: `run-${resourceId}`,
  });

  try {
    const execution = await workbenchRepository.createExecution(
      context.resource,
      context.document,
    );
    controlStore.setExecutionRecord(resourceId, execution.id, 'QUEUED');
    recordSubmittedExecution(context, execution.id);
    message.success({
      content: `执行记录 #${execution.id} 已创建，等待执行网关接管`,
      key: `run-${resourceId}`,
    });
  } catch (error) {
    store.setExecutionStatus(resourceId, 'FAILED');
    message.error({
      content: workbenchErrorMessage(error),
      key: `run-${resourceId}`,
    });
  }
};

export const BUILTIN_COMMANDS: WorkbenchCommandDefinition[] = [
  {
    id: 'execution.run',
    execute: (context) => runResource(context, '正在提交运行'),
  },
  {
    id: 'sql.run-statement',
    execute: (context) => runResource(context, '正在提交当前 SQL'),
  },
  {
    id: 'http.test',
    execute: (context) => runResource(context, '正在提交测试请求'),
  },
  {
    id: 'notebook.run-all',
    execute: (context) => runResource(context, '正在提交全部 Cell'),
  },
  {
    id: 'execution.stop',
    execute: async ({ resource }) => {
      const store = useWorkbenchStore.getState();
      const controlStore = useWorkbenchControlStore.getState();
      const executionId = controlStore.executionIdByResourceId[resource.id];
      if (!executionId) {
        message.warning('当前节点没有可取消的执行记录');
        return;
      }

      try {
        await workbenchRepository.cancelExecution(executionId);
        store.setExecutionStatus(resource.id, 'STOPPED');
        useExecutionPanelStore.getState().stopExecution(resource.id);
        message.success(`执行记录 #${executionId} 已取消`);
      } catch (error) {
        message.error(workbenchErrorMessage(error));
      }
    },
  },
  {
    id: 'document.save',
    execute: async ({ resource, document }) => {
      const store = useWorkbenchStore.getState();
      store.updateDocument(resource.id, (current) => ({
        ...current,
        saveStatus: 'SAVING',
      }));

      try {
        const saved = await workbenchRepository.saveDraft(resource, document);
        store.updateDocument(resource.id, () => saved);
        store.updateResource(resource.id, {
          latestRevision: saved.revision,
          updatedAt: saved.updatedAt,
        });
        message.success(`${resource.name} 已保存，Revision ${saved.revision}`);
      } catch (error) {
        store.updateDocument(resource.id, (current) => ({
          ...current,
          saveStatus: isWorkbenchConflict(error) ? 'CONFLICT' : 'ERROR',
        }));
        message.error(
          isWorkbenchConflict(error)
            ? '草稿已被其他用户更新，请刷新工作区后再保存'
            : workbenchErrorMessage(error),
        );
      }
    },
  },
  {
    id: 'document.format',
    execute: ({ resource, document }) => {
      const store = useWorkbenchStore.getState();

      if (document.content.kind === 'text') {
        const textContent = document.content;
        store.updateDocument(resource.id, (current) =>
          updateContent(current, {
            ...textContent,
            value: textContent.value
              .split('\n')
              .map((line) => line.trimEnd())
              .join('\n'),
          }),
        );
      } else if (document.content.kind === 'form') {
        const formContent = document.content;
        store.updateDocument(resource.id, (current) =>
          updateContent(current, {
            ...formContent,
            value: { ...formContent.value },
          }),
        );
      }

      message.success('格式化完成');
    },
  },
  {
    id: 'document.refresh',
    execute: async ({ resource }) => {
      await useWorkbenchControlStore.getState().initialize();
      message.success(`${resource.name} 已从服务端刷新`);
    },
  },
  {
    id: 'document.validate',
    execute: async ({ resource, document, plugin }) => {
      try {
        const result = await workbenchRepository.validate(resource, document);
        useExecutionPanelStore
          .getState()
          .openForResource(resource.id, 'validation');
        message.success(
          `${plugin.metadata.label} 校验通过 · ${result.contentDigest.slice(0, 12)}`,
        );
      } catch (error) {
        useExecutionPanelStore
          .getState()
          .openForResource(resource.id, 'problems');
        message.error(workbenchErrorMessage(error));
      }
    },
  },
  {
    id: 'version.publish',
    execute: async ({ resource, document }) => {
      if (document.dirty) {
        message.warning('请先保存草稿，再创建发布版本');
        return;
      }

      try {
        const version = await workbenchRepository.publish(resource, document);
        useWorkbenchStore.getState().updateResource(resource.id, {
          status: 'PUBLISHED',
          publishedVersion: version.versionNumber,
        });
        useExecutionPanelStore
          .getState()
          .openForResource(resource.id, 'publish');
        message.success(`已创建不可变发布版本 V${version.versionNumber}`);
      } catch (error) {
        message.error(
          isWorkbenchConflict(error)
            ? '草稿版本已变化，请刷新后重新发布'
            : workbenchErrorMessage(error),
        );
      }
    },
  },
  {
    id: 'resource.share',
    execute: async ({ resource }) => {
      const url = new URL(window.location.href);
      url.searchParams.set('resourceId', resource.id);
      await navigator.clipboard.writeText(url.toString());
      message.success('分享链接已复制');
    },
  },
  {
    id: 'notebook.clear-output',
    execute: ({ resource, document }) => {
      if (document.content.kind !== 'notebook') return;
      const notebookContent = document.content;

      useWorkbenchStore.getState().updateDocument(resource.id, (current) =>
        updateContent(current, {
          ...notebookContent,
          cells: notebookContent.cells.map((cell) => ({
            ...cell,
            output: undefined,
          })),
        }),
      );
      message.success('Notebook 输出已清空');
    },
  },
  {
    id: 'integration.auto-layout',
    execute: ({ resource, document }) => {
      if (document.content.kind !== 'graph') return;
      const graphContent = document.content;

      useWorkbenchStore.getState().updateDocument(resource.id, (current) =>
        updateContent(current, {
          ...graphContent,
          nodes: graphContent.nodes.map((node, index) => ({
            ...node,
            position: { x: 120 + index * 420, y: 180 },
          })),
        }),
      );
      message.success('画布已自动布局');
    },
  },
  {
    id: 'integration.preview',
    execute: ({ document }) => {
      const count =
        document.content.kind === 'graph'
          ? document.content.nodes.length
          : 0;
      message.info(`当前任务包含 ${count} 个节点，预览配置已生成`);
    },
  },
  {
    id: 'http.show-response',
    execute: ({ resource }) => {
      useExecutionPanelStore.getState().openForResource(resource.id, 'result');
      message.info('已打开最近一次 HTTP 响应');
    },
  },
];

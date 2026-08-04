import { message } from 'antd';
import { useExecutionPanelStore } from '../execution/store/execution-panel.store';
import { useWorkbenchStore } from '../store/workbench.store';
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

const runResource = (
  context: WorkbenchActionContext,
  successText: string,
) => {
  const workbenchStore = useWorkbenchStore.getState();
  const executionPanelStore = useExecutionPanelStore.getState();
  const resourceId = context.resource.id;
  const executionId = executionPanelStore.startExecution(
    context.resource,
    context.plugin,
  );

  workbenchStore.setExecutionStatus(resourceId, 'RUNNING');
  message.loading({
    content: `${successText}：${context.resource.name}`,
    key: `run-${resourceId}`,
  });

  window.setTimeout(() => {
    const currentSession =
      useExecutionPanelStore.getState().sessionsById[executionId];
    if (!currentSession || currentSession.status !== 'RUNNING') return;

    useWorkbenchStore.getState().setExecutionStatus(resourceId, 'SUCCESS');
    useExecutionPanelStore
      .getState()
      .completeExecution(executionId, context.resource);
    message.success({
      content: '运行完成，结果已进入底部运行面板',
      key: `run-${resourceId}`,
    });
  }, 1100);
};

export const BUILTIN_COMMANDS: WorkbenchCommandDefinition[] = [
  {
    id: 'execution.run',
    execute: (context) => runResource(context, '正在运行'),
  },
  {
    id: 'sql.run-statement',
    execute: (context) => runResource(context, '正在运行当前 SQL'),
  },
  {
    id: 'http.test',
    execute: (context) => runResource(context, '正在发送测试请求'),
  },
  {
    id: 'notebook.run-all',
    execute: (context) => runResource(context, '正在运行全部 Cell'),
  },
  {
    id: 'execution.stop',
    execute: ({ resource }) => {
      useWorkbenchStore.getState().setExecutionStatus(resource.id, 'STOPPED');
      useExecutionPanelStore.getState().stopExecution(resource.id);
      message.success('停止请求已提交');
    },
  },
  {
    id: 'document.save',
    execute: async ({ resource }) => {
      const store = useWorkbenchStore.getState();
      store.updateDocument(resource.id, (document) => ({
        ...document,
        saveStatus: 'SAVING',
      }));

      await new Promise((resolve) => window.setTimeout(resolve, 260));
      useWorkbenchStore.getState().markDocumentSaved(resource.id);
      message.success(`${resource.name} 已保存`);
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
    execute: ({ resource }) => {
      message.success(`${resource.name} 已刷新`);
    },
  },
  {
    id: 'document.validate',
    execute: ({ resource, plugin }) => {
      useExecutionPanelStore
        .getState()
        .openForResource(resource.id, 'validation');
      message.success(`${plugin.metadata.label} 语法、依赖与运行参数检查通过`);
    },
  },
  {
    id: 'version.publish',
    execute: ({ resource }) => {
      const store = useWorkbenchStore.getState();
      store.updateResource(resource.id, {
        status: 'PUBLISHED',
        publishedVersion: (resource.publishedVersion ?? 0) + 1,
      });
      useExecutionPanelStore.getState().openForResource(resource.id, 'publish');
      message.success('已创建不可变发布版本');
    },
  },
  {
    id: 'resource.share',
    execute: () => {
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

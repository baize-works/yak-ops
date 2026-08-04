import { Button, Dropdown, message, Modal, Select, Tooltip } from 'antd';
import { Copy, History, MoreHorizontal, Trash2 } from 'lucide-react';
import {
  actionRegistry,
  commandRegistry,
  nodePluginRegistry,
} from '../core/registry';
import type {
  DevelopmentDocument,
  ToolbarGroup,
  WorkbenchActionContext,
  WorkbenchActionDefinition,
} from '../core/types';
import {
  workbenchErrorMessage,
  workbenchRepository,
} from '../repository/workbench.repository';
import { useWorkbenchControlStore } from '../store/workbench-control.store';
import {
  selectActiveDocument,
  selectActiveResource,
  useWorkbenchStore,
} from '../store/workbench.store';

const GROUP_ORDER: Record<ToolbarGroup, number> = {
  primary: 10,
  edit: 20,
  resource: 30,
  publish: 40,
  more: 50,
};

const ToolbarActionButton = ({
  action,
  context,
}: {
  action: WorkbenchActionDefinition;
  context: WorkbenchActionContext;
}) => {
  const Icon = action.icon;
  const disabled = action.enabled ? !action.enabled(context) : false;
  const loading = action.loading?.(context) ?? false;

  return (
    <Tooltip title={action.label} mouseEnterDelay={0.45}>
      <Button
        type="text"
        size="small"
        danger={action.danger}
        disabled={disabled}
        loading={loading}
        icon={<Icon size={15} />}
        className="!flex !h-8 !items-center !gap-1.5 !px-2 !text-[13px] !text-[rgba(22,24,35,0.72)]"
        onClick={() =>
          commandRegistry.execute(action.command, context).catch((error) => {
            message.error(
              error instanceof Error ? error.message : '命令执行失败',
            );
          })
        }
      >
        <span className="max-[1180px]:hidden">{action.label}</span>
      </Button>
    </Tooltip>
  );
};

const WorkbenchToolbar = () => {
  const resource = useWorkbenchStore(selectActiveResource);
  const document = useWorkbenchStore(selectActiveDocument);
  const projectId = useWorkbenchControlStore((state) => state.projectId);
  const executionStatusByResourceId = useWorkbenchStore(
    (state) => state.executionStatusByResourceId,
  );
  const createResource = useWorkbenchStore((state) => state.createResource);
  const deleteResource = useWorkbenchStore((state) => state.deleteResource);
  const setRightPanel = useWorkbenchStore((state) => state.setRightPanel);

  if (!resource || !document) {
    return (
      <div className="flex h-11 shrink-0 items-center border-b border-[#e5e7ea] px-3 text-[12px] text-[rgba(22,24,35,0.38)]">
        打开节点后显示对应的动态工具栏
      </div>
    );
  }

  const plugin = nodePluginRegistry.get(resource.resourceType);
  if (!plugin) return null;

  const executionStatus = executionStatusByResourceId[resource.id] ?? 'IDLE';
  const context: WorkbenchActionContext = {
    resource,
    document,
    plugin,
    executionStatus,
  };

  const actions = plugin.toolbar
    .map((actionId) => actionRegistry.get(actionId))
    .filter((action): action is WorkbenchActionDefinition => Boolean(action))
    .filter((action) => !action.visible || action.visible(context))
    .sort(
      (left, right) =>
        GROUP_ORDER[left.group] - GROUP_ORDER[right.group] ||
        left.order - right.order,
    );

  const duplicateResource = async () => {
    if (!projectId) return;
    const key = `toolbar-clone-${resource.id}`;
    message.loading({ content: '正在复制节点', key });
    try {
      const created = await workbenchRepository.createTask(
        projectId,
        resource.resourceType,
        `${resource.name} 副本`,
        resource.engine,
      );
      const copiedDocument: DevelopmentDocument = {
        ...created.document,
        content: structuredClone(document.content),
        config: structuredClone(document.config),
        runtime: structuredClone(document.runtime),
        dirty: true,
      };
      const saved = await workbenchRepository.saveDraft(
        created.resource,
        copiedDocument,
      );
      createResource(created.resource, saved);
      message.success({ content: '节点副本已创建并保存', key });
    } catch (error) {
      message.error({ content: workbenchErrorMessage(error), key });
    }
  };

  const confirmDelete = () => {
    Modal.confirm({
      centered: true,
      title: '删除开发节点',
      content: `确认删除“${resource.name}”吗？`,
      okText: '删除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await workbenchRepository.deleteResource(resource.id);
          deleteResource(resource.id);
          useWorkbenchControlStore.getState().clearExecutionRecord(resource.id);
          message.success('节点已删除');
        } catch (error) {
          message.error(workbenchErrorMessage(error));
          throw error;
        }
      },
    });
  };

  return (
    <div className="flex h-11 shrink-0 items-center justify-between gap-3 border-b border-[#e5e7ea] px-2">
      <div className="flex min-w-0 items-center gap-1 overflow-x-auto">
        <Select
          variant="filled"
          size="small"
          className="w-[125px] shrink-0"
          value={resource.engine}
          disabled
          options={
            plugin.metadata.engineOptions ?? [
              {
                label: plugin.metadata.defaultEngine,
                value: plugin.metadata.defaultEngine,
              },
            ]
          }
        />

        <span className="mx-1 h-5 w-px shrink-0 bg-[#e4e6e9]" />

        {actions.map((action, index) => {
          const previous = actions[index - 1];
          const showDivider = previous && previous.group !== action.group;

          return (
            <span key={action.id} className="flex items-center gap-1">
              {showDivider && (
                <span className="mx-1 h-5 w-px bg-[#e4e6e9]" />
              )}
              <ToolbarActionButton action={action} context={context} />
            </span>
          );
        })}
      </div>

      <Dropdown
        trigger={['click']}
        menu={{
          items: [
            { key: 'copy', label: '复制节点', icon: <Copy size={14} /> },
            {
              key: 'history',
              label: '查看版本',
              icon: <History size={14} />,
            },
            { type: 'divider' },
            {
              key: 'delete',
              label: '删除节点',
              danger: true,
              icon: <Trash2 size={14} />,
            },
          ],
          onClick: ({ key }: { key: string }) => {
            if (key === 'copy') void duplicateResource();
            if (key === 'history') setRightPanel('version');
            if (key === 'delete') confirmDelete();
          },
        }}
      >
        <Button
          type="text"
          size="small"
          icon={<MoreHorizontal size={16} />}
        />
      </Dropdown>
    </div>
  );
};

export default WorkbenchToolbar;

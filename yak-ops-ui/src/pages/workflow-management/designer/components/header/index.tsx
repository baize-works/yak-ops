import { Input, Tooltip } from 'antd';
import {
  Braces,
  Check,
  ChevronLeft,
  CircleDot,
  CircleHelp,
  Clock3,
  History,
  Home,
  PanelLeftClose,
  PanelLeftOpen,
  Play,
  Save,
  Search,
  Settings2,
  SlidersHorizontal,
  Workflow as WorkflowIcon,
} from 'lucide-react';
import {
  useEffect,
  useState,
  type ReactNode,
} from 'react';

import type {
  WorkflowDefinitionRecord,
  WorkflowPanelType,
} from '../../../types';

interface WorkflowHeaderProps {
  workflow?: WorkflowDefinitionRecord;
  dirty: boolean;
  saving: boolean;
  activePanel: WorkflowPanelType;
  onBack: () => void;
  onRename: (name: string) => void;
  onSave: () => void;
  onOpenPanel: (
    panel: Exclude<WorkflowPanelType, 'node' | null>,
  ) => void;

  /**
   * 用于关闭右侧面板并返回工作流画布。
   * 未传时，会沿用原来的面板切换方式。
   */
  onOpenCanvas?: () => void;
}

type SupportedPanel = Exclude<
  WorkflowPanelType,
  'node' | null
>;

interface SideNavItemProps {
  active: boolean;
  label: string;
  icon: ReactNode;
  collapsed: boolean;
  onClick: () => void;
}

const SideNavItem = ({
  active,
  label,
  icon,
  collapsed,
  onClick,
}: SideNavItemProps) => {
  const button = (
    <button
      type="button"
      aria-label={label}
      className={[
        'flex h-8 w-full items-center rounded-lg',
        'border-0 px-3 text-left text-[13px]',
        'transition-colors duration-150',
        collapsed
          ? 'justify-center px-0'
          : 'gap-2',
        active
          ? [
              'bg-[#eaf0ff]',
              'font-semibold text-[#155eef]',
              'shadow-[inset_0_0_0_1px_rgba(178,204,255,0.45)]',
            ].join(' ')
          : [
              'bg-transparent',
              'font-medium text-[#475467]',
              'hover:bg-[#f2f4f7]',
              'hover:text-[#344054]',
            ].join(' '),
      ].join(' ')}
      onClick={onClick}
    >
      <span className="flex h-5 w-5 shrink-0 items-center justify-center">
        {icon}
      </span>

      {!collapsed && (
        <span className="min-w-0 flex-1 truncate">
          {label}
        </span>
      )}
    </button>
  );

  if (!collapsed) return button;

  return (
    <Tooltip title={label} placement="right">
      {button}
    </Tooltip>
  );
};

const WorkflowHeader = ({
  workflow,
  dirty,
  saving,
  activePanel,
  onBack,
  onRename,
  onSave,
  onOpenPanel,
  onOpenCanvas,
}: WorkflowHeaderProps) => {
  const [editing, setEditing] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [name, setName] = useState(
    workflow?.name || '工作流',
  );

  useEffect(() => {
    setName(workflow?.name || '工作流');
  }, [workflow?.name]);

  const applyName = () => {
    const normalized = name.trim();

    if (
      normalized &&
      normalized !== workflow?.name
    ) {
      onRename(normalized);
    } else {
      setName(workflow?.name || '工作流');
    }

    setEditing(false);
  };

  const openCanvas = () => {
    if (onOpenCanvas) {
      onOpenCanvas();
      return;
    }

    /*
     * 保留原组件的兼容逻辑。
     * 推荐父组件传入 onOpenCanvas，
     * 用于将 activePanel 设置为 null。
     */
    if (
      activePanel &&
      activePanel !== 'node'
    ) {
      onOpenPanel(activePanel);
    }
  };

  const isCanvasActive =
    activePanel === null ||
    activePanel === 'node';

  const openPanel = (panel: SupportedPanel) => {
    onOpenPanel(panel);
  };

  const divider = (
    <div className="px-3 py-1">
      <div className="h-px w-full bg-gradient-to-r from-[#eaecf0] to-transparent" />
    </div>
  );

  return (
    <>
      {/* 左侧工作流导航 */}
      <aside
        className={[
          'absolute inset-y-0 left-0 z-50',
          'hidden shrink-0 overflow-hidden',
          'bg-[#f2f4f7]',
          'transition-[width] duration-200 ease-in-out',
          'lg:flex',
          collapsed ? 'w-[64px]' : 'w-[248px]',
        ].join(' ')}
      >
        <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden  bg-white">
          <div className="flex min-h-0 flex-1 flex-col">
            {/* 顶部面包屑 */}
            <div
              className={[
                'flex h-12 shrink-0 items-center',
                collapsed
                  ? 'justify-center px-1'
                  : 'gap-1 px-1',
              ].join(' ')}
            >
              {!collapsed && (
                <div className="flex min-w-0 flex-1 items-center">
                  <Tooltip title="返回工作流列表">
                    <button
                      type="button"
                      aria-label="返回工作流列表"
                      className={[
                        'flex h-8 shrink-0 items-center',
                        'rounded-lg border-0 bg-transparent',
                        'pl-1 pr-1.5',
                        'text-[#667085]',
                        'transition-colors',
                        'hover:bg-[#f2f4f7]',
                        'hover:text-[#344054]',
                      ].join(' ')}
                      onClick={onBack}
                    >
                      <ChevronLeft size={16} />
                      <Home size={15} />
                    </button>
                  </Tooltip>

                  <span className="px-1 text-[13px] text-[#d0d5dd]">
                    /
                  </span>

                  <button
                    type="button"
                    className={[
                      'min-w-0 truncate rounded-lg',
                      'border-0 bg-transparent',
                      'px-1.5 py-2',
                      'text-[13px] font-semibold',
                      'text-[#344054]',
                      'transition-colors',
                      'hover:bg-[#f2f4f7]',
                      'hover:text-[#101828]',
                    ].join(' ')}
                    onClick={onBack}
                  >
                    工作室
                  </button>
                </div>
              )}

              {!collapsed && (
                <Tooltip title="搜索">
                  <button
                    type="button"
                    aria-label="搜索"
                    className={[
                      'flex h-8 w-8 shrink-0',
                      'items-center justify-center',
                      'rounded-[10px] border-0',
                      'bg-transparent text-[#667085]',
                      'transition-colors',
                      'hover:bg-[#f2f4f7]',
                      'hover:text-[#344054]',
                    ].join(' ')}
                  >
                    <Search size={16} />
                  </button>
                </Tooltip>
              )}

              <Tooltip
                title={
                  collapsed
                    ? '展开侧边栏'
                    : '收起侧边栏'
                }
                placement={collapsed ? 'right' : 'bottom'}
              >
                <button
                  type="button"
                  aria-label={
                    collapsed
                      ? '展开侧边栏'
                      : '收起侧边栏'
                  }
                  className={[
                    'flex h-8 w-8 shrink-0',
                    'items-center justify-center',
                    'rounded-[10px] border-0',
                    'bg-transparent text-[#667085]',
                    'transition-colors',
                    'hover:bg-[#f2f4f7]',
                    'hover:text-[#344054]',
                  ].join(' ')}
                  onClick={() =>
                    setCollapsed((value) => !value)
                  }
                >
                  {collapsed ? (
                    <PanelLeftOpen size={16} />
                  ) : (
                    <PanelLeftClose size={16} />
                  )}
                </button>
              </Tooltip>
            </div>

            <div className="flex min-h-0 flex-1 flex-col px-2 pb-2">
              {/* 工作流信息 */}
              <div
                className={[
                  'py-2',
                  collapsed ? 'px-0' : 'px-1',
                ].join(' ')}
              >
                <div
                  className={[
                    'flex items-start rounded-xl',
                    'transition-colors',
                    'hover:bg-[#f2f4f7]',
                    collapsed
                      ? 'justify-center p-1'
                      : 'gap-2 p-2',
                  ].join(' ')}
                >
                  <span
                    className={[
                      'flex h-10 w-10 shrink-0',
                      'items-center justify-center',
                      'overflow-hidden rounded-[10px]',
                      'border border-[#f2d5b7]',
                      'bg-[#ffead5]',
                      'text-[22px]',
                    ].join(' ')}
                  >
                    🤖
                  </span>

                  {!collapsed && (
                    <>
                      <div className="flex min-w-0 flex-1 flex-col justify-center self-stretch">
                        {editing ? (
                          <Input
                            autoFocus
                            value={name}
                            maxLength={255}
                            className="h-7 px-2 text-[13px]"
                            onChange={(event) =>
                              setName(event.target.value)
                            }
                            onPressEnter={applyName}
                            onBlur={applyName}
                          />
                        ) : (
                          <button
                            type="button"
                            className={[
                              'block min-w-0 border-0',
                              'bg-transparent p-0 text-left',
                            ].join(' ')}
                            onDoubleClick={() =>
                              setEditing(true)
                            }
                          >
                            <strong
                              className={[
                                'block truncate',
                                'text-[14px] font-semibold',
                                'leading-5 text-[#344054]',
                              ].join(' ')}
                              title={
                                workflow?.name ||
                                '工作流设计器'
                              }
                            >
                              {workflow?.name ||
                                '工作流设计器'}
                            </strong>

                            <span
                              className={[
                                'mt-0.5 block truncate',
                                'text-[10px] font-medium',
                                'uppercase tracking-[0.04em]',
                                'text-[#667085]',
                              ].join(' ')}
                            >
                              {workflow?.code ||
                                'WORKFLOW'}
                            </span>
                          </button>
                        )}
                      </div>

                      <Tooltip title="工作流设置">
                        <button
                          type="button"
                          aria-label="工作流设置"
                          className={[
                            'flex h-6 w-6 shrink-0',
                            'items-center justify-center',
                            'rounded-md border-0',
                            'bg-transparent text-[#667085]',
                            'transition-colors',
                            'hover:bg-white',
                            'hover:text-[#344054]',
                          ].join(' ')}
                          onClick={() =>
                            openPanel(
                              'workflow-settings',
                            )
                          }
                        >
                          <Settings2 size={15} />
                        </button>
                      </Tooltip>
                    </>
                  )}
                </div>
              </div>

              {/* 导航菜单 */}
              <nav className="flex flex-col gap-0.5 px-1 py-1">
                <SideNavItem
                  active={isCanvasActive}
                  label="编排"
                  icon={<WorkflowIcon size={18} />}
                  collapsed={collapsed}
                  onClick={openCanvas}
                />

                <SideNavItem
                  active={activePanel === 'variables'}
                  label="变量"
                  icon={<Braces size={18} />}
                  collapsed={collapsed}
                  onClick={() =>
                    openPanel('variables')
                  }
                />

                {divider}

                <SideNavItem
                  active={
                    activePanel === 'environment'
                  }
                  label="环境变量"
                  icon={
                    <SlidersHorizontal size={18} />
                  }
                  collapsed={collapsed}
                  onClick={() =>
                    openPanel('environment')
                  }
                />

                <SideNavItem
                  active={activePanel === 'history'}
                  label="历史版本"
                  icon={<History size={18} />}
                  collapsed={collapsed}
                  onClick={() =>
                    openPanel('history')
                  }
                />

                {divider}

                <SideNavItem
                  active={activePanel === 'run'}
                  label="调试运行"
                  icon={<Play size={18} />}
                  collapsed={collapsed}
                  onClick={() => openPanel('run')}
                />
              </nav>
            </div>
          </div>

          {/* 底部账户区域 */}
          <div
            className={[
              'flex h-14 shrink-0 items-center',
              'bg-white py-2',
              collapsed
                ? 'justify-center px-1'
                : 'justify-between pl-3 pr-2',
            ].join(' ')}
          >
            <Tooltip
              title={collapsed ? 'Yak Ops' : undefined}
              placement="right"
            >
              <button
                type="button"
                className={[
                  'flex min-w-0 items-center',
                  'rounded-full border-0',
                  'bg-transparent text-left',
                  'transition-colors',
                  'hover:bg-[#f2f4f7]',
                  collapsed
                    ? 'justify-center p-1'
                    : 'gap-3 py-1 pl-1 pr-4',
                ].join(' ')}
              >
                <span
                  className={[
                    'flex h-7 w-7 shrink-0',
                    'items-center justify-center',
                    'rounded-full bg-[#155eef]',
                    'text-[12px] font-semibold',
                    'text-white',
                  ].join(' ')}
                >
                  Y
                </span>

                {!collapsed && (
                  <span className="min-w-0 truncate text-[13px] font-medium text-[#344054]">
                    Yak Ops
                  </span>
                )}
              </button>
            </Tooltip>

            {!collapsed && (
              <Tooltip title="帮助">
                <button
                  type="button"
                  aria-label="帮助"
                  className={[
                    'flex h-7 w-7 shrink-0',
                    'items-center justify-center',
                    'rounded-full border',
                    'border-[#e4e7ec]',
                    'bg-white text-[#667085]',
                    'shadow-[0_1px_2px_rgba(16,24,40,0.05)]',
                    'transition-colors',
                    'hover:bg-[#f9fafb]',
                    'hover:text-[#155eef]',
                  ].join(' ')}
                >
                  <CircleHelp size={15} />
                </button>
              </Tooltip>
            )}
          </div>
        </div>
      </aside>

      {/* 顶部操作栏 */}
      <header
        className={[
          'absolute right-0 top-0 z-40',
          'flex h-12 items-center justify-between',
          'border-b border-[#eaecf0]',
          'bg-white px-3',
          'transition-[left] duration-200 ease-in-out',
          'max-lg:left-0',
          collapsed
            ? 'left-[64px]'
            : 'left-[248px]',
        ].join(' ')}
      >
        <div className="flex min-w-0 items-center gap-2">
          {/* 移动端返回 */}
          <div className="hidden min-w-0 items-center gap-1 max-lg:flex">
            <button
              type="button"
              aria-label="返回工作流列表"
              className={[
                'flex h-8 w-8 shrink-0',
                'items-center justify-center',
                'rounded-lg border-0',
                'bg-transparent text-[#667085]',
                'hover:bg-[#f2f4f7]',
                'hover:text-[#344054]',
              ].join(' ')}
              onClick={onBack}
            >
              <ChevronLeft size={17} />
            </button>

            <strong className="max-w-[180px] truncate text-[13px] font-semibold text-[#344054]">
              {workflow?.name || '工作流'}
            </strong>
          </div>

          {/* 保存状态 */}
          <div className="hidden items-center gap-2 lg:flex">
            <span className="text-[12px] text-[#667085]">
              草稿状态
            </span>

            <span
              className={[
                'inline-flex h-6 items-center gap-1',
                'rounded-full px-2',
                'text-[11px] font-medium',
                dirty
                  ? 'bg-[#fffaeb] text-[#b54708]'
                  : 'bg-[#ecfdf3] text-[#027a48]',
              ].join(' ')}
            >
              {dirty ? (
                <CircleDot size={12} />
              ) : (
                <Check size={12} />
              )}

              {dirty
                ? '有未保存修改'
                : '草稿已保存'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className={[
              'inline-flex h-8 items-center gap-1.5',
              'rounded-[10px] border',
              'px-3 text-[12px] font-medium',
              'transition-colors',
              activePanel === 'run'
                ? [
                    'border-[#b2ccff]',
                    'bg-[#eff4ff]',
                    'text-[#155eef]',
                  ].join(' ')
                : [
                    'border-[#e4e7ec]',
                    'bg-white',
                    'text-[#475467]',
                    'hover:border-[#d0d5dd]',
                    'hover:bg-[#f9fafb]',
                  ].join(' '),
            ].join(' ')}
            onClick={() => openPanel('run')}
          >
            <Play size={14} />
            预览
          </button>

          <button
            type="button"
            disabled={saving}
            className={[
              'inline-flex h-8 items-center gap-1.5',
              'rounded-[10px] border-0',
              'bg-[#155eef] px-3.5',
              'text-[12px] font-semibold text-white',
              'transition-colors',
              'hover:bg-[#004eeb]',
              'disabled:cursor-not-allowed',
              'disabled:opacity-50',
            ].join(' ')}
            onClick={onSave}
          >
            {saving ? (
              <Clock3
                size={14}
                className="animate-spin"
              />
            ) : (
              <Save size={14} />
            )}

            {saving ? '保存中...' : '保存'}
          </button>
        </div>
      </header>
    </>
  );
};

export default WorkflowHeader;
import { Dropdown, Input, Tooltip, type MenuProps } from 'antd';
import {
  AlignHorizontalSpaceAround,
  Bot,
  BookOpen,
  Braces,
  BrainCircuit,
  ChevronDown,
  Code2,
  Download,
  Eye,
  EyeOff,
  FileInput,
  FileOutput,
  GitBranch,
  Hand,
  Infinity as InfinityIcon,
  ListFilter,
  Maximize2,
  MessageSquareText,
  Minus,
  MoreHorizontal,
  MousePointer2,
  Plus,
  Redo2,
  RefreshCw,
  ScanLine,
  Search,
  Upload,
  UserRound,
  Variable,
  Undo2,
} from 'lucide-react';
import {
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  MiniMap,
  useReactFlow,
  useViewport,
} from 'reactflow';

export type CanvasInteractionMode = 'select' | 'pan';

export interface CanvasLibraryItem {
  key: string;
  label: string;
  description?: string;
  keywords?: string[];
  icon: ReactNode;
  iconClassName: string;
}

export interface CanvasLibraryGroup {
  key: string;
  title?: string;
  items: CanvasLibraryItem[];
}

interface CanvasOperatorProps {
  canUndo: boolean;
  canRedo: boolean;
  showMiniMap: boolean;

  nodePanelOpen: boolean;
  interactionMode: CanvasInteractionMode;

  onUndo: () => void;
  onRedo: () => void;
  onToggleMiniMap: () => void;
  onAutoLayout: () => void;
  onExport: () => void;
  onImport: () => void;
  onToggleVariableInspect: () => void;
  onToggleNodePanel: () => void;
  onInteractionModeChange: (mode: CanvasInteractionMode) => void;
  onSelectLibraryItem?: (item: CanvasLibraryItem) => void;

  variableInspectOpen: boolean;
  nodeGroups?: CanvasLibraryGroup[];
  toolGroups?: CanvasLibraryGroup[];
}

const operatorGroupClass = [
  'pointer-events-auto flex items-center gap-px',
  'rounded-lg border border-[#e4e7ec]',
  'bg-white p-[3px]',
  'shadow-[0_4px_12px_rgba(16,24,40,0.08)]',
].join(' ');

const iconButtonClass = [
  'relative flex h-8 w-8 shrink-0 items-center justify-center',
  'rounded-md border-0 bg-transparent p-0',
  'text-[#667085] transition-all duration-150',
  'hover:bg-[#f2f4f7] hover:text-[#344054]',
  'disabled:cursor-not-allowed disabled:opacity-[0.35]',
].join(' ');

const activeIconButtonClass =
  'bg-[#eef2ff] text-[#155eef] hover:bg-[#e7edff] hover:text-[#155eef]';

const panelIconClass = [
  'flex h-5 w-5 shrink-0 items-center justify-center',
  'rounded-[6px] text-white',
].join(' ');

const DEFAULT_NODE_GROUPS: CanvasLibraryGroup[] = [
  {
    key: 'basic',
    items: [
      {
        key: 'llm',
        label: 'LLM',
        description: '调用大语言模型处理输入内容',
        keywords: ['大模型', '语言模型', 'AI'],
        icon: <BrainCircuit size={13} strokeWidth={2.2} />,
        iconClassName: 'bg-[#6366f1]',
      },
      {
        key: 'knowledge-retrieval',
        label: '知识检索',
        description: '从知识库中检索相关内容',
        keywords: ['知识库', '检索', 'RAG'],
        icon: <BookOpen size={13} strokeWidth={2.2} />,
        iconClassName: 'bg-[#12b76a]',
      },
      {
        key: 'direct-answer',
        label: '直接回复',
        description: '向用户直接输出指定内容',
        keywords: ['回答', '回复', '输出'],
        icon: <MessageSquareText size={13} strokeWidth={2.2} />,
        iconClassName: 'bg-[#f79009]',
      },
      {
        key: 'agent',
        label: 'Agent',
        description: '通过智能体自主选择工具完成任务',
        keywords: ['智能体', 'Agent', '工具调用'],
        icon: <Bot size={13} strokeWidth={2.2} />,
        iconClassName: 'bg-[#7f56d9]',
      },
    ],
  },
  {
    key: 'problem-understanding',
    title: '问题理解',
    items: [
      {
        key: 'question-classifier',
        label: '问题分类器',
        description: '根据问题内容选择不同的执行分支',
        keywords: ['分类', '判断', '意图'],
        icon: <ListFilter size={13} strokeWidth={2.2} />,
        iconClassName: 'bg-[#12b76a]',
      },
    ],
  },
  {
    key: 'logic',
    title: '逻辑',
    items: [
      {
        key: 'condition',
        label: '条件分支',
        description: '根据条件判断进入不同分支',
        keywords: ['判断', '条件', '分支'],
        icon: <GitBranch size={13} strokeWidth={2.2} />,
        iconClassName: 'bg-[#06aed4]',
      },
      {
        key: 'human-intervention',
        label: '人工介入',
        description: '暂停流程并等待人工处理',
        keywords: ['人工', '审核', '暂停'],
        icon: <UserRound size={13} strokeWidth={2.2} />,
        iconClassName: 'bg-[#06aed4]',
      },
      {
        key: 'iteration',
        label: '迭代',
        description: '遍历数组并逐项执行流程',
        keywords: ['遍历', '数组', '迭代'],
        icon: <RefreshCw size={13} strokeWidth={2.2} />,
        iconClassName: 'bg-[#06aed4]',
      },
      {
        key: 'loop',
        label: '循环',
        description: '根据条件重复执行流程',
        keywords: ['循环', '重复'],
        icon: <InfinityIcon size={14} strokeWidth={2.2} />,
        iconClassName: 'bg-[#06aed4]',
      },
    ],
  },
  {
    key: 'transform',
    title: '转换',
    items: [
      {
        key: 'code',
        label: '代码执行',
        description: '执行自定义代码处理数据',
        keywords: ['代码', 'JavaScript', 'Python'],
        icon: <Code2 size={13} strokeWidth={2.2} />,
        iconClassName: 'bg-[#2e90fa]',
      },
      {
        key: 'template',
        label: '模板转换',
        description: '使用模板重新组织输入内容',
        keywords: ['模板', '格式化'],
        icon: <FileOutput size={13} strokeWidth={2.2} />,
        iconClassName: 'bg-[#2e90fa]',
      },
      {
        key: 'variable-aggregator',
        label: '变量聚合器',
        description: '将多个分支变量合并为一个变量',
        keywords: ['变量', '合并', '聚合'],
        icon: <Variable size={13} strokeWidth={2.2} />,
        iconClassName: 'bg-[#2e90fa]',
      },
    ],
  },
];

const DEFAULT_TOOL_GROUPS: CanvasLibraryGroup[] = [
  {
    key: 'workflow-tools',
    items: [
      {
        key: 'variable-tool',
        label: '变量工具',
        description: '读取或处理工作流中的变量',
        keywords: ['变量', '参数'],
        icon: <Braces size={13} strokeWidth={2.2} />,
        iconClassName: 'bg-[#6172f3]',
      },
      {
        key: 'input-tool',
        label: '输入转换',
        description: '对输入数据进行格式转换',
        keywords: ['输入', '转换'],
        icon: <FileInput size={13} strokeWidth={2.2} />,
        iconClassName: 'bg-[#2e90fa]',
      },
    ],
  },
];

const CanvasOperator = ({
  canUndo,
  canRedo,
  showMiniMap,
  nodePanelOpen,
  interactionMode,
  variableInspectOpen,
  nodeGroups = DEFAULT_NODE_GROUPS,
  toolGroups = DEFAULT_TOOL_GROUPS,
  onUndo,
  onRedo,
  onToggleMiniMap,
  onAutoLayout,
  onExport,
  onImport,
  onToggleVariableInspect,
  onToggleNodePanel,
  onInteractionModeChange,
  onSelectLibraryItem,
}: CanvasOperatorProps) => {
  const reactFlow = useReactFlow();
  const { zoom } = useViewport();

  const [libraryTab, setLibraryTab] = useState<'node' | 'tool'>('node');
  const [keyword, setKeyword] = useState('');

  const zoomItems: MenuProps['items'] = [
    ...[2, 1, 0.75, 0.5, 0.25].map((value) => ({
      key: String(value),
      label: `${Math.round(value * 100)}%`,
      onClick: () => {
        reactFlow.zoomTo(value, {
          duration: 180,
        });
      },
    })),
    {
      type: 'divider' as const,
    },
    {
      key: 'fit',
      label: '适应画布',
      onClick: () => {
        reactFlow.fitView({
          padding: 0.24,
          duration: 220,
        });
      },
    },
  ];

  const moreItems: MenuProps['items'] = [
    {
      key: 'import',
      label: '导入 JSON',
      icon: <Upload size={14} />,
      onClick: onImport,
    },
    {
      key: 'export',
      label: '导出 JSON',
      icon: <Download size={14} />,
      onClick: onExport,
    },
  ];

  const visibleGroups = useMemo(() => {
    const groups = libraryTab === 'node' ? nodeGroups : toolGroups;
    const normalizedKeyword = keyword.trim().toLowerCase();

    if (!normalizedKeyword) {
      return groups;
    }

    return groups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => {
          const searchableContent = [
            item.label,
            item.description,
            ...(item.keywords ?? []),
          ]
            .join(' ')
            .toLowerCase();

          return searchableContent.includes(normalizedKeyword);
        }),
      }))
      .filter((group) => group.items.length > 0);
  }, [
    keyword,
    libraryTab,
    nodeGroups,
    toolGroups,
  ]);

  return (
    <div className="pointer-events-none absolute inset-0 z-20">
      {/* 左侧主工具栏 */}
      <div className="absolute left-3 top-1/2 flex -translate-y-1/2 items-start gap-1.5">
        <div
          className={[
            operatorGroupClass,
            'w-[38px] flex-col gap-1 py-1',
          ].join(' ')}
        >
          <Tooltip title="添加节点" placement="right">
            <button
              type="button"
              className={[
                iconButtonClass,
                nodePanelOpen
                  ? 'bg-[#f2f4f7] text-[#344054]'
                  : '',
              ].join(' ')}
              onClick={onToggleNodePanel}
            >
              <span className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-[#475467] text-white">
                <Plus size={12} strokeWidth={2.8} />
              </span>
            </button>
          </Tooltip>

          <Tooltip title="自动布局" placement="right">
            <button
              type="button"
              className={iconButtonClass}
              onClick={onAutoLayout}
            >
              <ScanLine size={16} strokeWidth={1.8} />
            </button>
          </Tooltip>

          <Tooltip title="选择节点" placement="right">
            <button
              type="button"
              className={[
                iconButtonClass,
                interactionMode === 'select'
                  ? activeIconButtonClass
                  : '',
              ].join(' ')}
              onClick={() => onInteractionModeChange('select')}
            >
              <MousePointer2 size={16} strokeWidth={1.9} />
            </button>
          </Tooltip>

          <Tooltip title="移动画布" placement="right">
            <button
              type="button"
              className={[
                iconButtonClass,
                interactionMode === 'pan'
                  ? activeIconButtonClass
                  : '',
              ].join(' ')}
              onClick={() => onInteractionModeChange('pan')}
            >
              <Hand size={16} strokeWidth={1.8} />
            </button>
          </Tooltip>

          <Tooltip title="变量检查" placement="right">
            <button
              type="button"
              className={[
                iconButtonClass,
                variableInspectOpen
                  ? activeIconButtonClass
                  : '',
              ].join(' ')}
              onClick={onToggleVariableInspect}
            >
              <Braces size={16} strokeWidth={1.8} />
            </button>
          </Tooltip>

          <Dropdown
            menu={{ items: moreItems }}
            placement="bottomLeft"
            trigger={['click']}
          >
            <button
              type="button"
              className={iconButtonClass}
              aria-label="更多操作"
            >
              <MoreHorizontal size={17} strokeWidth={2} />
            </button>
          </Dropdown>
        </div>

        {/* 节点选择面板 */}
        {nodePanelOpen && (
          <div
            className={[
              'pointer-events-auto flex',
              'h-[min(570px,calc(100vh-140px))] w-[400px]',
              'flex-col overflow-hidden rounded-xl',
              'border border-[#e4e7ec] bg-white',
              'shadow-[0_12px_32px_rgba(16,24,40,0.12)]',
            ].join(' ')}
            onMouseDown={(event) => event.stopPropagation()}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex h-10 shrink-0 items-end border-b border-[#e4e7ec] px-2">
              <button
                type="button"
                className={[
                  'relative flex h-10 items-center px-2.5 text-[14px]',
                  'transition-colors',
                  libraryTab === 'node'
                    ? 'font-medium text-[#155eef]'
                    : 'text-[#667085] hover:text-[#344054]',
                ].join(' ')}
                onClick={() => setLibraryTab('node')}
              >
                节点

                {libraryTab === 'node' && (
                  <span className="absolute inset-x-1 bottom-0 h-0.5 rounded-full bg-[#155eef]" />
                )}
              </button>

              <button
                type="button"
                className={[
                  'relative flex h-10 items-center px-2.5 text-[14px]',
                  'transition-colors',
                  libraryTab === 'tool'
                    ? 'font-medium text-[#155eef]'
                    : 'text-[#667085] hover:text-[#344054]',
                ].join(' ')}
                onClick={() => setLibraryTab('tool')}
              >
                工具

                {libraryTab === 'tool' && (
                  <span className="absolute inset-x-1 bottom-0 h-0.5 rounded-full bg-[#155eef]" />
                )}
              </button>
            </div>

            <div className="shrink-0 px-2 py-2">
              <Input
                allowClear
                value={keyword}
                prefix={
                  <Search
                    size={15}
                    className="text-[#98a2b3]"
                  />
                }
                placeholder={
                  libraryTab === 'node'
                    ? '搜索节点、Agent、人工、知识库'
                    : '搜索工具'
                }
                className={[
                  'h-8 rounded-lg border-[#d0d5dd]',
                  'bg-[#fcfcfd]',
                  '[&_.ant-input]:text-[13px]',
                  '[&_.ant-input::placeholder]:text-[#98a2b3]',
                ].join(' ')}
                onChange={(event) => setKeyword(event.target.value)}
              />
            </div>

            <div
              className={[
                'min-h-0 flex-1 overflow-y-auto px-3 pb-3',
                '[&::-webkit-scrollbar]:w-1.5',
                '[&::-webkit-scrollbar-thumb]:rounded-full',
                '[&::-webkit-scrollbar-thumb]:bg-[#98a2b3]',
                '[&::-webkit-scrollbar-track]:bg-transparent',
              ].join(' ')}
            >
              {visibleGroups.length > 0 ? (
                visibleGroups.map((group) => (
                  <div
                    key={group.key}
                    className="mb-2 last:mb-0"
                  >
                    {group.title && (
                      <div className="mb-1 px-1 text-[12px] leading-5 text-[#667085]">
                        {group.title}
                      </div>
                    )}

                    <div className="space-y-0.5">
                      {group.items.map((item) => (
                        <button
                          key={item.key}
                          type="button"
                          className={[
                            'group flex h-8 w-full items-center gap-2',
                            'rounded-md px-1.5 text-left',
                            'text-[14px] text-[#344054]',
                            'transition-colors',
                            'hover:bg-[#f2f4f7]',
                          ].join(' ')}
                          onClick={() => onSelectLibraryItem?.(item)}
                        >
                          <span
                            className={[
                              panelIconClass,
                              item.iconClassName,
                            ].join(' ')}
                          >
                            {item.icon}
                          </span>

                          <span className="min-w-0 flex-1 truncate">
                            {item.label}
                          </span>

                          <Plus
                            size={14}
                            className={[
                              'shrink-0 text-[#98a2b3]',
                              'opacity-0 transition-opacity',
                              'group-hover:opacity-100',
                            ].join(' ')}
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex h-32 flex-col items-center justify-center text-[#98a2b3]">
                  <Search size={22} strokeWidth={1.5} />

                  <span className="mt-2 text-[13px]">
                    没有找到相关内容
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 左下角撤销、重做 */}
      <div
        className={[
          operatorGroupClass,
          'absolute bottom-3 left-3',
        ].join(' ')}
      >
        <Tooltip title="撤销 Ctrl/⌘ + Z">
          <button
            type="button"
            className={iconButtonClass}
            disabled={!canUndo}
            onClick={onUndo}
          >
            <Undo2 size={15} />
          </button>
        </Tooltip>

        <Tooltip title="重做 Ctrl/⌘ + Shift + Z">
          <button
            type="button"
            className={iconButtonClass}
            disabled={!canRedo}
            onClick={onRedo}
          >
            <Redo2 size={15} />
          </button>
        </Tooltip>
      </div>

      {/* 右下角缩放、小地图 */}
      <div className="pointer-events-auto absolute bottom-3 right-3 flex items-end gap-2">
        {showMiniMap && (
          <MiniMap
            pannable
            zoomable
            className={[
              '!absolute !bottom-[43px] !right-0 !m-0',
              '!h-[88px] !w-32 !overflow-hidden',
              '!rounded-lg !border !border-[#d0d5dd]',
              '!bg-white/95',
              '!shadow-[0_8px_22px_rgba(16,24,40,0.12)]',
            ].join(' ')}
            nodeStrokeWidth={2}
            maskColor="rgba(248, 250, 252, 0.72)"
          />
        )}

        <div
          className={[
            operatorGroupClass,
            'min-w-[146px]',
          ].join(' ')}
        >
          <Tooltip title="缩小">
            <button
              type="button"
              className={iconButtonClass}
              disabled={zoom <= 0.25}
              onClick={() => {
                reactFlow.zoomOut({
                  duration: 150,
                });
              }}
            >
              <Minus size={15} />
            </button>
          </Tooltip>

          <Dropdown
            menu={{ items: zoomItems }}
            placement="topRight"
          >
            <button
              type="button"
              className={[
                iconButtonClass,
                'min-w-[48px] gap-1 text-[#475467]',
              ].join(' ')}
            >
              {Math.round(zoom * 100)}%

              <ChevronDown size={12} />
            </button>
          </Dropdown>

          <Tooltip title="放大">
            <button
              type="button"
              className={iconButtonClass}
              disabled={zoom >= 2}
              onClick={() => {
                reactFlow.zoomIn({
                  duration: 150,
                });
              }}
            >
              <Plus size={15} />
            </button>
          </Tooltip>

          <Tooltip title="适应画布">
            <button
              type="button"
              className={iconButtonClass}
              onClick={() => {
                reactFlow.fitView({
                  padding: 0.24,
                  duration: 220,
                });
              }}
            >
              <Maximize2 size={15} />
            </button>
          </Tooltip>

          <Tooltip
            title={showMiniMap ? '隐藏小地图' : '显示小地图'}
          >
            <button
              type="button"
              className={iconButtonClass}
              onClick={onToggleMiniMap}
            >
              {showMiniMap ? (
                <Eye size={15} />
              ) : (
                <EyeOff size={15} />
              )}
            </button>
          </Tooltip>
        </div>
      </div>
    </div>
  );
};

export default CanvasOperator;
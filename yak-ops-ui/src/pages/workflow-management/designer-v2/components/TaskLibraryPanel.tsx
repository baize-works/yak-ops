import {
  AppstoreOutlined,
  ClockCircleOutlined,
  StarFilled,
  StarOutlined,
} from '@ant-design/icons';
import {
  Button,
  Empty,
  Input,
  Segmented,
  Select,
  Spin,
  Tooltip,
  message,
} from 'antd';
import { Braces, GripVertical, Plus, RefreshCw, Search } from 'lucide-react';
import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type DragEvent,
  type MouseEvent,
} from 'react';

import {
  workflowTaskLibraryRepository,
  type WorkflowPublishedTask,
} from '../../repository/workflow-task-library.repository';
import {
  WORKFLOW_TASK_DRAG_TYPE,
  encodeTaskDragPayload,
} from '../model';

type LibraryView = 'all' | 'favorite' | 'recent';

interface TaskLibraryPanelProps {
  onInsert(task: WorkflowPublishedTask): void;
}

const viewOptions = [
  {
    label: (
      <span className="inline-flex items-center gap-1.5">
        <AppstoreOutlined />全部
      </span>
    ),
    value: 'all',
  },
  {
    label: (
      <span className="inline-flex items-center gap-1.5">
        <StarOutlined />收藏
      </span>
    ),
    value: 'favorite',
  },
  {
    label: (
      <span className="inline-flex items-center gap-1.5">
        <ClockCircleOutlined />最近
      </span>
    ),
    value: 'recent',
  },
];

const TaskLibraryPanel = ({ onInsert }: TaskLibraryPanelProps) => {
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [debouncedKeyword, setDebouncedKeyword] = useState('');
  const [taskType, setTaskType] = useState<string>();
  const [view, setView] = useState<LibraryView>('all');
  const [items, setItems] = useState<WorkflowPublishedTask[]>([]);
  const [total, setTotal] = useState(0);
  const [loadVersion, setLoadVersion] = useState(0);

  useEffect(() => {
    const timer = window.setTimeout(
      () => setDebouncedKeyword(keyword.trim()),
      260,
    );
    return () => window.clearTimeout(timer);
  }, [keyword]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        setLoading(true);
        const page = await workflowTaskLibraryRepository.search({
          keyword: debouncedKeyword || undefined,
          taskType,
          favoriteOnly: view === 'favorite' ? true : undefined,
          recentlyUsed: view === 'recent' ? true : undefined,
          sortBy: view === 'recent' ? 'RECENTLY_USED' : 'UPDATED_AT',
          offset: 0,
          limit: 100,
        });
        if (!active) return;
        setItems(page.items);
        setTotal(page.total);
      } catch (error) {
        if (!active) return;
        setItems([]);
        setTotal(0);
        message.error(
          error instanceof Error ? error.message : '加载已发布任务失败',
        );
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [debouncedKeyword, loadVersion, taskType, view]);

  const taskTypeOptions = useMemo(
    () =>
      Array.from(new Set(items.map((item) => item.taskType)))
        .sort((left, right) => left.localeCompare(right))
        .map((value) => ({ value, label: value })),
    [items],
  );

  const startDrag = (
    event: DragEvent<HTMLDivElement>,
    task: WorkflowPublishedTask,
  ) => {
    event.dataTransfer.effectAllowed = 'copy';
    event.dataTransfer.setData(
      WORKFLOW_TASK_DRAG_TYPE,
      encodeTaskDragPayload(task),
    );
    event.dataTransfer.setData('text/plain', task.name);
  };

  return (
    <aside className="flex h-full w-[300px] shrink-0 flex-col border-r border-[#e4e7ec] bg-white">
      <div className="border-b border-[#edf0f3] px-4 pb-3 pt-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="m-0 text-[15px] font-semibold text-[#161823]">
              已发布任务
            </h2>
            <p className="mb-0 mt-1 text-[11px] leading-4 text-[#98a2b3]">
              拖入画布后固定当前不可变版本
            </p>
          </div>
          <Tooltip title="刷新任务资源">
            <Button
              type="text"
              size="small"
              icon={<RefreshCw size={14} className={loading ? 'animate-spin' : ''} />}
              onClick={() => setLoadVersion((value) => value + 1)}
            />
          </Tooltip>
        </div>

        <div className="mt-3">
          <Input
            allowClear
            variant="filled"
            value={keyword}
            prefix={<Search size={14} className="text-[#98a2b3]" />}
            placeholder="搜索任务、项目或类型"
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              setKeyword(event.target.value)
            }
          />
        </div>

        <Segmented
          block
          size="small"
          className="mt-2.5"
          value={view}
          options={viewOptions}
          onChange={(value: string | number) =>
            setView(value as LibraryView)
          }
        />

        <Select
          allowClear
          variant="filled"
          size="small"
          className="mt-2.5 w-full"
          value={taskType}
          placeholder="全部任务类型"
          options={taskTypeOptions}
          onChange={(value: string | undefined) => setTaskType(value)}
        />
      </div>

      <div className="flex items-center justify-between px-4 py-2 text-[10px] text-[#98a2b3]">
        <span>共 {total} 个任务</span>
        {total > 100 && <span>请使用筛选缩小范围</span>}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2.5 pb-4">
        <Spin spinning={loading}>
          {!loading && items.length === 0 ? (
            <div className="flex min-h-[280px] items-center justify-center">
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  <span className="text-xs text-[#98a2b3]">
                    没有匹配的已发布任务
                  </span>
                }
              />
            </div>
          ) : (
            <div className="space-y-1.5">
              {items.map((task) => (
                <div
                  key={`${task.taskId}:${task.publishedVersionId}`}
                  draggable
                  className={[
                    'group cursor-grab rounded-lg border border-transparent bg-[#f7f7f8] px-2.5 py-2.5',
                    'transition-[border-color,background-color,box-shadow,transform] active:cursor-grabbing',
                    'hover:-translate-y-px hover:border-[#dfe3e8] hover:bg-white hover:shadow-[0_5px_14px_rgba(16,24,40,0.08)]',
                  ].join(' ')}
                  onDragStart={(event: DragEvent<HTMLDivElement>) =>
                    startDrag(event, task)
                  }
                  onDoubleClick={() => onInsert(task)}
                >
                  <div className="flex items-start gap-2">
                    <GripVertical
                      size={14}
                      className="mt-0.5 shrink-0 text-[#c4c9d1] group-hover:text-[#98a2b3]"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <strong className="min-w-0 flex-1 truncate text-[12px] font-semibold text-[#344054]">
                          {task.name}
                        </strong>
                        {task.favorite && (
                          <StarFilled className="text-[10px] text-[#f79009]" />
                        )}
                        <span className="rounded bg-white px-1.5 py-0.5 text-[9px] font-semibold text-[#667085] shadow-[inset_0_0_0_1px_#e4e7ec]">
                          v{task.publishedVersionNumber}
                        </span>
                      </div>

                      <div className="mt-1 flex items-center gap-1.5 text-[10px] text-[#98a2b3]">
                        <Braces size={11} className="shrink-0" />
                        <span className="truncate">{task.taskType}</span>
                        <span>·</span>
                        <span className="truncate">{task.projectName}</span>
                      </div>

                      {task.description && (
                        <p className="mb-0 mt-1.5 line-clamp-2 text-[10px] leading-[15px] text-[#667085]">
                          {task.description}
                        </p>
                      )}
                    </div>

                    <Tooltip title="添加到画布">
                      <Button
                        type="text"
                        size="small"
                        className="!h-6 !w-6 !min-w-6 shrink-0 opacity-0 group-hover:opacity-100"
                        icon={<Plus size={13} />}
                        onClick={(event: MouseEvent<HTMLElement>) => {
                          event.stopPropagation();
                          onInsert(task);
                        }}
                      />
                    </Tooltip>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Spin>
      </div>

      <div className="border-t border-[#edf0f3] px-4 py-2.5 text-[10px] leading-4 text-[#98a2b3]">
        拖拽只复制任务引用，不复制 HTTP、Shell、SQL 等任务配置。
      </div>
    </aside>
  );
};

export default TaskLibraryPanel;

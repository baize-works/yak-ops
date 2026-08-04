import {
  BRAND_CSS_VARIABLES,
  BRAND_THEME,
} from '@/styles/brand';
import { Alert, Button, ConfigProvider, Spin, Tooltip } from 'antd';
import {
  ChevronRight,
  Circle,
  Cloud,
  Columns2,
  Maximize2,
  Minimize2,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import CreateResourceModal from './components/CreateResourceModal';
import EditorTabs from './components/EditorTabs';
import ExplorerPanel from './components/ExplorerPanel';
import ResourceView from './components/ResourceView';
import RightPanel from './components/RightPanel';
import RightRail from './components/RightRail';
import StatusBar from './components/StatusBar';
import WorkbenchResizeHandle from './components/WorkbenchResizeHandle';
import WorkbenchToolbar from './components/WorkbenchToolbar';
import type { ResourceType } from './core/types';
import ExecutionBottomPanel from './execution/components/ExecutionBottomPanel';
import { useWorkbenchControlStore } from './store/workbench-control.store';
import { useWorkbenchStore } from './store/workbench.store';

const EXPLORER_MIN_WIDTH = 300;
const EXPLORER_MAX_WIDTH = 720;
const EXPLORER_DEFAULT_WIDTH = 460;

const WorkbenchPage = () => {
  const explorerVisible = useWorkbenchStore((state) => state.explorerVisible);
  const explorerWidth = useWorkbenchStore((state) => state.explorerWidth);
  const fullscreen = useWorkbenchStore((state) => state.fullscreen);
  const splitResourceId = useWorkbenchStore((state) => state.splitResourceId);
  const resourcesById = useWorkbenchStore((state) => state.resourcesById);
  const workspaceLoading = useWorkbenchControlStore(
    (state) => state.workspaceLoading,
  );
  const workspaceError = useWorkbenchControlStore(
    (state) => state.workspaceError,
  );
  const initialize = useWorkbenchControlStore((state) => state.initialize);
  const setExplorerWidth = useWorkbenchStore((state) => state.setExplorerWidth);
  const setFullscreen = useWorkbenchStore((state) => state.setFullscreen);
  const setSplitResource = useWorkbenchStore(
    (state) => state.setSplitResource,
  );
  const setActiveResource = useWorkbenchStore(
    (state) => state.setActiveResource,
  );
  const [createOpen, setCreateOpen] = useState(false);
  const [createType, setCreateType] = useState<ResourceType>('HTTP');

  useEffect(() => {
    void initialize();
  }, [initialize]);

  const openCreateModal = (resourceType: ResourceType = 'HTTP') => {
    setCreateType(resourceType);
    setCreateOpen(true);
  };

  const splitResource = splitResourceId
    ? resourcesById[splitResourceId]
    : undefined;

  return (
    <ConfigProvider theme={BRAND_THEME}>
      <div
        style={BRAND_CSS_VARIABLES}
        className="flex h-[calc(100vh-48px)] min-h-[620px] flex-col overflow-hidden bg-white text-[#161823]"
      >
        <header className="flex h-12 shrink-0 items-center justify-between border-b border-[#e5e7ea] px-4">
          <div className="flex min-w-0 items-center gap-2 text-[13px]">
            <span className="text-[rgba(22,24,35,0.48)]">工作台</span>
            <ChevronRight
              size={14}
              className="text-[rgba(22,24,35,0.26)]"
            />
            <strong className="truncate font-semibold text-[#161823]">
              数据开发
            </strong>
            <span className="ml-2 hidden rounded bg-[#f2f3f5] px-2 py-1 text-[10px] font-medium text-[rgba(22,24,35,0.48)] md:inline-flex">
              Control Plane
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-2 rounded-md border border-[#e2e5e9] bg-[#fafbfc] px-2.5 py-1.5 text-[12px] text-[rgba(22,24,35,0.68)] sm:flex">
              <Cloud size={14} />
              {workspaceError ? '连接异常' : '开发环境'}
              <Circle
                size={7}
                fill={workspaceError ? '#ff4d4f' : '#20b26b'}
                className={
                  workspaceError ? 'text-[#ff4d4f]' : 'text-[#20b26b]'
                }
              />
            </div>
            <Tooltip title={fullscreen ? '退出沉浸模式' : '沉浸模式'}>
              <Button
                type="text"
                size="small"
                icon={
                  fullscreen ? (
                    <Minimize2 size={16} />
                  ) : (
                    <Maximize2 size={16} />
                  )
                }
                onClick={() => setFullscreen(!fullscreen)}
              />
            </Tooltip>
          </div>
        </header>

        {workspaceError && (
          <Alert
            banner
            showIcon
            type="error"
            message={workspaceError}
            action={
              <Button size="small" onClick={() => void initialize()}>
                重新加载
              </Button>
            }
          />
        )}

        <div className="relative flex min-h-0 flex-1">
          {workspaceLoading && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/75">
              <Spin tip="正在加载数据开发工作区" />
            </div>
          )}

          {explorerVisible && !fullscreen && (
            <>
              <div
                style={{ width: explorerWidth }}
                className="h-full min-w-0 shrink-0 overflow-hidden"
              >
                <ExplorerPanel onCreate={openCreateModal} />
              </div>
              <WorkbenchResizeHandle
                value={explorerWidth}
                min={EXPLORER_MIN_WIDTH}
                max={EXPLORER_MAX_WIDTH}
                defaultValue={EXPLORER_DEFAULT_WIDTH}
                ariaLabel="调整项目目录宽度"
                onChange={setExplorerWidth}
              />
            </>
          )}

          <main className="flex min-w-0 flex-1 flex-col bg-white">
            <EditorTabs onCreate={openCreateModal} />
            <WorkbenchToolbar />

            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <div className="flex min-h-0 flex-1 overflow-hidden">
                <section className="min-w-0 flex-1 overflow-hidden">
                  <ResourceView onCreate={() => openCreateModal('HTTP')} />
                </section>

                {splitResource && !fullscreen && (
                  <section className="flex min-w-[360px] flex-1 flex-col border-l border-[#dfe2e6] bg-white">
                    <div className="flex h-9 shrink-0 items-center justify-between border-b border-[#e7e9ec] bg-[#fafbfc] px-3">
                      <button
                        type="button"
                        className="flex min-w-0 items-center gap-2 border-0 bg-transparent p-0 text-left text-[12px] text-[rgba(22,24,35,0.72)]"
                        onClick={() => setActiveResource(splitResource.id)}
                      >
                        <Columns2 size={14} />
                        <span className="truncate">{splitResource.name}</span>
                      </button>
                      <Tooltip title="关闭拆分编辑器">
                        <Button
                          type="text"
                          size="small"
                          className="!h-7 !w-7 !px-0"
                          icon={<X size={14} />}
                          onClick={() => setSplitResource(undefined)}
                        />
                      </Tooltip>
                    </div>
                    <div className="min-h-0 flex-1 overflow-hidden">
                      <ResourceView resourceId={splitResource.id} />
                    </div>
                  </section>
                )}
              </div>

              <ExecutionBottomPanel />
            </div>

            <StatusBar />
          </main>

          {!fullscreen && <RightPanel />}
          {!fullscreen && <RightRail />}
        </div>

        <CreateResourceModal
          open={createOpen}
          initialResourceType={createType}
          onClose={() => setCreateOpen(false)}
        />
      </div>
    </ConfigProvider>
  );
};

export default WorkbenchPage;

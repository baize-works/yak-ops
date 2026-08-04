import {
  BRAND_CSS_VARIABLES,
  BRAND_THEME,
} from '@/styles/brand';
import { Button, ConfigProvider, Tooltip } from 'antd';
import {
  ChevronRight,
  Circle,
  Cloud,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { useState } from 'react';
import CreateResourceModal from './components/CreateResourceModal';
import EditorTabs from './components/EditorTabs';
import ExplorerPanel from './components/ExplorerPanel';
import ResourceView from './components/ResourceView';
import RightPanel from './components/RightPanel';
import RightRail from './components/RightRail';
import StatusBar from './components/StatusBar';
import WorkbenchToolbar from './components/WorkbenchToolbar';
import type { ResourceType } from './core/types';
import { useWorkbenchStore } from './store/workbench.store';

const WorkbenchPage = () => {
  const explorerVisible = useWorkbenchStore((state) => state.explorerVisible);
  const fullscreen = useWorkbenchStore((state) => state.fullscreen);
  const setFullscreen = useWorkbenchStore((state) => state.setFullscreen);
  const [createOpen, setCreateOpen] = useState(false);
  const [createType, setCreateType] = useState<ResourceType>('SQL');

  const openCreateModal = (resourceType: ResourceType = 'SQL') => {
    setCreateType(resourceType);
    setCreateOpen(true);
  };

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
              Plugin Workbench
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-2 rounded-md border border-[#e2e5e9] bg-[#fafbfc] px-2.5 py-1.5 text-[12px] text-[rgba(22,24,35,0.68)] sm:flex">
              <Cloud size={14} />
              开发环境
              <Circle
                size={7}
                fill="#20b26b"
                className="text-[#20b26b]"
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

        <div className="flex min-h-0 flex-1">
          {explorerVisible && !fullscreen && (
            <ExplorerPanel onCreate={openCreateModal} />
          )}

          <main className="flex min-w-0 flex-1 flex-col bg-white">
            <EditorTabs onCreate={openCreateModal} />
            <WorkbenchToolbar />
            <div className="min-h-0 flex-1">
              <ResourceView onCreate={() => openCreateModal('SQL')} />
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

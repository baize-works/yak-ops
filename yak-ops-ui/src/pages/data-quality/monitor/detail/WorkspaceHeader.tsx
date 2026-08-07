import { Button, Tabs } from 'antd';
import { Database, ExternalLink } from 'lucide-react';
import type { MonitorWorkspaceView } from '../../types';
import type { WorkspaceTab } from './model';

interface WorkspaceHeaderProps {
  workspace?: MonitorWorkspaceView;
  activeTab: WorkspaceTab;
  onTabChange: (value: WorkspaceTab) => void;
  onBack: () => void;
}

const WorkspaceHeader = ({
  workspace,
  activeTab,
  onTabChange,
  onBack,
}: WorkspaceHeaderProps) => {
  const monitor = workspace?.monitor;
  const path = [
    monitor?.dataSourceName,
    monitor?.databaseName,
    monitor?.schemaName,
  ].filter(Boolean);

  return (
    <header className="shrink-0 border-b border-[#e5e7eb] bg-white">
      <div className="flex min-h-[86px] items-center gap-4 px-6 py-3">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md bg-[#eef3ff] text-[#3451d1]">
          <Database size={25} strokeWidth={1.8} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h1 className="m-0 truncate text-[18px] font-semibold leading-7 text-[#172033]">
              {monitor?.tableName || '规则管理'}
            </h1>
            <Button
              type="link"
              size="small"
              className="!h-6 !px-0 !text-xs"
              onClick={onBack}
            >
              返回数据表监控 <ExternalLink size={12} />
            </Button>
          </div>

          <div className="mt-0.5 truncate text-xs text-[#8b95a7]">
            {monitor?.description || '暂无数据表描述'}
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-x-6 gap-y-1 text-xs text-[#667085]">
            <span className="flex min-w-0 items-center gap-1.5">
              <span>路径：</span>
              {path.length ? (
                path.map((item, index) => (
                  <span key={`${item}-${index}`} className="flex items-center gap-1.5">
                    {index > 0 ? <span className="text-[#c4c9d2]">›</span> : null}
                    <span className="max-w-40 truncate text-[#43506a]">{item}</span>
                  </span>
                ))
              ) : (
                <span>--</span>
              )}
            </span>
            <span>
              表责任人：
              <span className="ml-1 text-[#43506a]">{monitor?.owner || '--'}</span>
            </span>
            <span>
              最近运行：
              <span className="ml-1 text-[#43506a]">
                {workspace?.stats.latestExecutionTime || monitor?.lastRunTime || '--'}
              </span>
            </span>
          </div>
        </div>
      </div>

      <div className="px-4">
        <Tabs
          activeKey={activeTab}
          onChange={(value) => onTabChange(value as WorkspaceTab)}
          items={[
            { key: 'rules', label: '规则管理' },
            { key: 'monitors', label: '监控信息' },
            { key: 'report', label: '质量报告' },
          ]}
          className="workspace-tabs"
        />
      </div>
    </header>
  );
};

export default WorkspaceHeader;

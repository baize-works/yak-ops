import { Button, Tooltip } from 'antd';
import {
  AlertCircle,
  ChevronDown,
  ChevronUp,
  GitBranch,
  ListChecks,
  Maximize2,
  Minimize2,
  PackageCheck,
  ScrollText,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';
import type {
  ExecutionPanelTabKey,
  ExecutionSession,
} from '../types';

const PANEL_TABS: Array<{
  key: ExecutionPanelTabKey;
  label: string;
  icon: typeof AlertCircle;
}> = [
  { key: 'problems', label: '问题', icon: AlertCircle },
  { key: 'output', label: '输出', icon: ScrollText },
  { key: 'lineage', label: '血缘', icon: GitBranch },
  { key: 'result', label: '结果', icon: ListChecks },
  { key: 'publish', label: '发布', icon: PackageCheck },
  { key: 'validation', label: '深度检查', icon: ShieldCheck },
  { key: 'quality', label: '质量测试', icon: Sparkles },
];

interface ExecutionPanelHeaderProps {
  activeTab: ExecutionPanelTabKey;
  activeSession?: ExecutionSession;
  maximized: boolean;
  onTabChange: (tab: ExecutionPanelTabKey) => void;
  onToggleMaximized: () => void;
  onMinimize: () => void;
  onRestore: () => void;
  onClose: () => void;
}

const ExecutionPanelHeader = ({
  activeTab,
  activeSession,
  maximized,
  onTabChange,
  onToggleMaximized,
  onMinimize,
  onRestore,
  onClose,
}: ExecutionPanelHeaderProps) => (
  <header className="flex h-10 shrink-0 items-center justify-between border-b border-[#eceef0] px-2">
    <div className="flex min-w-0 items-center gap-0.5 overflow-x-auto">
      {PANEL_TABS.map((tab) => {
        const Icon = tab.icon;
        const active = activeTab === tab.key;
        const badge =
          tab.key === 'problems' && activeSession?.status === 'FAILED'
            ? 1
            : undefined;

        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onTabChange(tab.key)}
            className={[
              'relative flex h-10 shrink-0 items-center gap-1.5 border-0 bg-transparent px-3 text-[11px] transition-colors',
              active
                ? 'font-medium text-[#161823]'
                : 'text-[rgba(22,24,35,0.5)] hover:text-[#161823]',
            ].join(' ')}
          >
            <Icon size={13} />
            {tab.label}
            {badge && (
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--yak-brand-color)] px-1 text-[9px] text-white">
                {badge}
              </span>
            )}
            {active && (
              <span className="absolute inset-x-2 bottom-0 h-0.5 bg-[var(--yak-brand-color)]" />
            )}
          </button>
        );
      })}
    </div>

    <div className="flex shrink-0 items-center gap-0.5 border-l border-[#eceef0] pl-2">
      <Tooltip title={maximized ? '还原面板' : '展开面板'}>
        <Button
          type="text"
          size="small"
          className="!h-7 !w-7 !px-0"
          icon={maximized ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          onClick={onToggleMaximized}
        />
      </Tooltip>
      <Tooltip title="缩小面板">
        <Button
          type="text"
          size="small"
          className="!h-7 !w-7 !px-0"
          icon={<ChevronDown size={14} />}
          onClick={onMinimize}
        />
      </Tooltip>
      <Tooltip title="恢复默认高度">
        <Button
          type="text"
          size="small"
          className="!h-7 !w-7 !px-0"
          icon={<ChevronUp size={14} />}
          onClick={onRestore}
        />
      </Tooltip>
      <Tooltip title="关闭运行面板">
        <Button
          type="text"
          size="small"
          className="!h-7 !w-7 !px-0"
          icon={<X size={14} />}
          onClick={onClose}
        />
      </Tooltip>
    </div>
  </header>
);

export default ExecutionPanelHeader;

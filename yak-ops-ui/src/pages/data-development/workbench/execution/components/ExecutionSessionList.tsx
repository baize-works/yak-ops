import {
  AlertCircle,
  CheckCircle2,
  History,
  LoaderCircle,
} from 'lucide-react';
import type { DevelopmentResource } from '../../core/types';
import type { ExecutionSession } from '../types';
import { formatExecutionDateTime } from './ExecutionPanelShared';

interface ExecutionSessionListProps {
  resource?: DevelopmentResource;
  resourcesById: Record<string, DevelopmentResource>;
  sessionIds: string[];
  sessionsById: Record<string, ExecutionSession>;
  activeSessionId?: string;
  onSelect: (sessionId: string) => void;
}

const ExecutionSessionList = ({
  resource,
  resourcesById,
  sessionIds,
  sessionsById,
  activeSessionId,
  onSelect,
}: ExecutionSessionListProps) => (
  <aside className="w-[220px] shrink-0 overflow-y-auto border-r border-[#eceef0] bg-[#fafbfc]">
    <div className="flex h-9 items-center gap-2 border-b border-[#eceef0] px-3 text-[11px] font-medium text-[rgba(22,24,35,0.62)]">
      <History size={13} />
      运行记录
    </div>

    {sessionIds.length === 0 ? (
      <div className="px-3 py-5 text-center text-[11px] leading-5 text-[rgba(22,24,35,0.36)]">
        当前节点暂无运行记录
      </div>
    ) : (
      <div className="py-1">
        {sessionIds.map((sessionId, index) => {
          const session = sessionsById[sessionId];
          if (!session) return null;
          const active = sessionId === activeSessionId;

          return (
            <button
              key={sessionId}
              type="button"
              onClick={() => onSelect(sessionId)}
              className={[
                'flex w-full items-start gap-2 border-0 px-3 py-2 text-left transition-colors',
                active
                  ? 'bg-[var(--yak-brand-color-soft)]'
                  : 'bg-transparent hover:bg-[#f1f2f4]',
              ].join(' ')}
            >
              <span className="mt-0.5">
                {session.status === 'RUNNING' ? (
                  <LoaderCircle
                    size={13}
                    className="animate-spin text-[#1677ff]"
                  />
                ) : session.status === 'SUCCESS' ? (
                  <CheckCircle2 size={13} className="text-[#14945f]" />
                ) : (
                  <AlertCircle size={13} className="text-[#d92d20]" />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[11px] font-medium text-[rgba(22,24,35,0.72)]">
                  {resource?.name ?? resourcesById[session.resourceId]?.name}
                  {index === 0 ? ' · 最新' : ''}
                </span>
                <span className="mt-0.5 block text-[10px] text-[rgba(22,24,35,0.36)]">
                  {formatExecutionDateTime(session.startedAt)} · {session.engine}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    )}
  </aside>
);

export default ExecutionSessionList;

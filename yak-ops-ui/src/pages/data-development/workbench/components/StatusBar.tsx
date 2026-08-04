import { CheckCircle2, Circle } from 'lucide-react';
import { nodePluginRegistry } from '../core/registry';
import {
  selectActiveDocument,
  selectActiveResource,
  useWorkbenchStore,
} from '../store/workbench.store';

const StatusBar = () => {
  const resource = useWorkbenchStore(selectActiveResource);
  const document = useWorkbenchStore(selectActiveDocument);
  const executionStatusByResourceId = useWorkbenchStore(
    (state) => state.executionStatusByResourceId,
  );

  const plugin = resource
    ? nodePluginRegistry.get(resource.resourceType)
    : undefined;
  const executionStatus = resource
    ? executionStatusByResourceId[resource.id] ?? 'IDLE'
    : 'IDLE';

  return (
    <footer className="flex h-7 shrink-0 items-center justify-between border-t border-[#e5e7ea] bg-[#fafbfc] px-3 text-[11px] text-[rgba(22,24,35,0.48)]">
      <div className="flex items-center gap-4">
        <span>项目：用户数据平台</span>
        <span className="flex items-center gap-1.5">
          环境：开发环境
          <Circle size={6} fill="#20b26b" className="text-[#20b26b]" />
        </span>
      </div>

      <div className="flex items-center gap-4">
        <span>Revision: {document?.revision ?? 0}</span>
        <span>UTF-8</span>
        <span>LF</span>
        <span>{resource?.engine ?? plugin?.metadata.defaultEngine ?? 'Yak'}</span>
        <span>运行状态：{executionStatus}</span>
        <span className="flex items-center gap-1 text-[#14945f]">
          <CheckCircle2 size={12} /> 插件已加载
        </span>
      </div>
    </footer>
  );
};

export default StatusBar;

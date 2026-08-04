import { Button } from 'antd';
import { Code2, Plus } from 'lucide-react';
import { nodePluginRegistry, rendererRegistry } from '../core/registry';
import type { DevelopmentDocument } from '../core/types';
import {
  selectActiveDocument,
  selectActiveResource,
  useWorkbenchStore,
} from '../store/workbench.store';

interface ResourceViewProps {
  onCreate: () => void;
}

const ResourceView = ({ onCreate }: ResourceViewProps) => {
  const resource = useWorkbenchStore(selectActiveResource);
  const document = useWorkbenchStore(selectActiveDocument);
  const updateDocument = useWorkbenchStore((state) => state.updateDocument);

  if (!resource || !document) {
    return (
      <div className="flex h-full items-center justify-center bg-[#fbfbfc] p-8">
        <div className="w-full max-w-[620px] text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--yak-brand-color-soft)] text-[var(--yak-brand-color)]">
            <Code2 size={28} />
          </div>
          <h2 className="mb-1 mt-4 text-lg font-semibold">
            Yak-ops 数据开发
          </h2>
          <p className="m-0 text-[13px] text-[rgba(22,24,35,0.48)]">
            从左侧打开开发节点，或创建 SQL、HTTP、Notebook、数据集成等资源。
          </p>
          <Button
            type="primary"
            className="mt-5"
            icon={<Plus size={15} />}
            onClick={onCreate}
          >
            新建开发节点
          </Button>
        </div>
      </div>
    );
  }

  const plugin = nodePluginRegistry.get(resource.resourceType);
  if (!plugin) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-[rgba(22,24,35,0.48)]">
        未找到节点插件：{resource.resourceType}
      </div>
    );
  }

  const Renderer = rendererRegistry.get(plugin.authoring.rendererKey);
  if (!Renderer) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-[rgba(22,24,35,0.48)]">
        未注册渲染器：{plugin.authoring.rendererKey}
      </div>
    );
  }

  return (
    <Renderer
      key={resource.id}
      resource={resource}
      document={document}
      plugin={plugin}
      onChange={(nextDocument: DevelopmentDocument) =>
        updateDocument(resource.id, () => nextDocument)
      }
    />
  );
};

export default ResourceView;

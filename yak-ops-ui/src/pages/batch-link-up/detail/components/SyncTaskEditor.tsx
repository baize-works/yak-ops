import type { DataSourceRecord } from '@/pages/data-source/types';

import useDataSourceTables from '../hooks/useDataSourceTables';
import {
  endpointNode,
  updateEndpointConfig,
  type SyncEditorState,
} from '../model';
import ChannelConfigSection from './ChannelConfigSection';
import MultiTableConfigSection from './MultiTableConfigSection';
import SingleTableConfigSection from './SingleTableConfigSection';
import TaskBasicSection from './TaskBasicSection';

interface SyncTaskEditorProps {
  editor: SyncEditorState;
  dataSources: DataSourceRecord[];
  dataSourceLoading: boolean;
  onChange: (value: SyncEditorState) => void;
}

export default function SyncTaskEditor({
  editor,
  dataSources,
  dataSourceLoading,
  onChange,
}: SyncTaskEditorProps) {
  const sourceNode = endpointNode(editor.workflow, 'source');
  const sinkNode = endpointNode(editor.workflow, 'sink');

  const sourceConfig = sourceNode?.data?.config || {};
  const sinkConfig = sinkNode?.data?.config || {};

  const sourceId = editor.basic.sourceDataSourceId;
  const targetId = editor.basic.targetDataSourceId;

  const sourceCatalog = useDataSourceTables(sourceId);
  const targetCatalog = useDataSourceTables(targetId);

  const updateSource = (patch: Record<string, any>) => {
    onChange(updateEndpointConfig(editor, 'source', patch));
  };

  const updateSink = (patch: Record<string, any>) => {
    onChange(updateEndpointConfig(editor, 'sink', patch));
  };

  return (
    <div className="space-y-5">
      <TaskBasicSection
        editor={editor}
        dataSources={dataSources}
        dataSourceLoading={dataSourceLoading}
        onChange={onChange}
      />

      {editor.mode === 'GUIDE_MULTI' ? (
        <MultiTableConfigSection
          sourceConfig={sourceConfig}
          sinkConfig={sinkConfig}
          sourceTables={sourceCatalog.tables}
          sourceLoading={sourceCatalog.loading}
          sourceReady={Boolean(sourceId)}
          targetReady={Boolean(targetId)}
          onSourceChange={updateSource}
          onSinkChange={updateSink}
        />
      ) : (
        <SingleTableConfigSection
          sourceConfig={sourceConfig}
          sinkConfig={sinkConfig}
          sourceTables={sourceCatalog.tables}
          targetTables={targetCatalog.tables}
          sourceLoading={sourceCatalog.loading}
          targetLoading={targetCatalog.loading}
          sourceReady={Boolean(sourceId)}
          targetReady={Boolean(targetId)}
          onSourceChange={updateSource}
          onSinkChange={updateSink}
        />
      )}

      <ChannelConfigSection
        editor={editor}
        sinkConfig={sinkConfig}
        onChange={onChange}
        onSinkChange={updateSink}
      />
    </div>
  );
}

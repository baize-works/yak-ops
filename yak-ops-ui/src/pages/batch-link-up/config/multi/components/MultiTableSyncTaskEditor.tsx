import type { DataSourceRecord } from '@/pages/data-source/types';

import ChannelConfigSection from '../../../detail/components/ChannelConfigSection';
import MultiTableConfigSection from '../../../detail/components/MultiTableConfigSection';
import TaskBasicSection from '../../../detail/components/TaskBasicSection';
import useDataSourceTables from '../../../detail/hooks/useDataSourceTables';
import {
  endpointNode,
  updateEndpointConfig,
  type SyncEditorState,
} from '../../../detail/model';

interface MultiTableSyncTaskEditorProps {
  editor: SyncEditorState;
  dataSources: DataSourceRecord[];
  dataSourceLoading: boolean;
  onChange: (value: SyncEditorState) => void;
}

export default function MultiTableSyncTaskEditor({
  editor,
  dataSources,
  dataSourceLoading,
  onChange,
}: MultiTableSyncTaskEditorProps) {
  const sourceNode = endpointNode(editor.workflow, 'source');
  const sinkNode = endpointNode(editor.workflow, 'sink');

  const sourceConfig = sourceNode?.data?.config || {};
  const sinkConfig = sinkNode?.data?.config || {};

  const sourceId = editor.basic.sourceDataSourceId;
  const targetId = editor.basic.targetDataSourceId;

  const sourceCatalog = useDataSourceTables(sourceId);

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

      <ChannelConfigSection
        editor={editor}
        sinkConfig={sinkConfig}
        onChange={onChange}
        onSinkChange={updateSink}
      />
    </div>
  );
}

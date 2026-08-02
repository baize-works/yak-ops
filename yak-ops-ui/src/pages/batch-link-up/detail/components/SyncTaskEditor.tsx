import type { DataSourceRecord } from '@/pages/data-source/types';

import {
  connectorIdForDataSourceType,
} from '../form-schema/valueAdapter';
import useDataSourceColumns from '../hooks/useDataSourceColumns';
import useDataSourceTables from '../hooks/useDataSourceTables';
import {
  endpointNode,
  updateEndpointConfig,
  type SyncEditorState,
} from '../model';
import ChannelConfigSection from './ChannelConfigSection';
import ConnectorExtraParams from './ConnectorExtraParams';
import MultiTableConfigSection from './MultiTableConfigSection';
import SingleTableConfigSection from './SingleTableConfigSection';
import TaskBasicSection from './TaskBasicSection';

interface SyncTaskEditorProps {
  editor: SyncEditorState;
  dataSources: DataSourceRecord[];
  dataSourceLoading: boolean;
  onChange: (value: SyncEditorState) => void;
}

const SOURCE_MANAGED_KEYS = [
  'table_path',
  'table_list',
  'query',
];

const SINK_MANAGED_KEYS = [
  'table_path',
  'schema_save_mode',
  'data_save_mode',
  'write_mode',
  'primary_keys',
  'batch_size',
  'dirty_data_policy',
  'dirty_data_max_count',
];

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

  const sourceColumnRequest = sourceConfig.readMode === 'sql'
    ? sourceConfig.sql?.trim()
      ? { query: sourceConfig.sql }
      : undefined
    : sourceConfig.table
      ? { table_path: sourceConfig.table }
      : undefined;
  const targetColumnRequest = sinkConfig.autoCreateTable
    ? sourceColumnRequest
    : sinkConfig.table
      ? { table_path: sinkConfig.table }
      : undefined;
  const primaryKeyCatalog = useDataSourceColumns(
    sinkConfig.autoCreateTable ? sourceId : targetId,
    targetColumnRequest,
  );

  const updateSource = (patch: Record<string, any>) => {
    onChange(updateEndpointConfig(editor, 'source', patch));
  };

  const updateSink = (patch: Record<string, any>) => {
    onChange(updateEndpointConfig(editor, 'sink', patch));
  };

  const sourceConnectorId = connectorIdForDataSourceType(
    sourceConfig.connectorId || editor.basic.sourceType,
  );
  const sinkConnectorId = connectorIdForDataSourceType(
    sinkConfig.connectorId || editor.basic.targetType,
  );

  const sourceExtraParameters = (
    <ConnectorExtraParams
      connectorId={sourceConnectorId}
      role="SOURCE"
      dataSourceId={sourceId}
      config={sourceConfig}
      excludeKeys={SOURCE_MANAGED_KEYS}
      onChange={updateSource}
    />
  );
  const sinkExtraParameters = (
    <ConnectorExtraParams
      connectorId={sinkConnectorId}
      role="SINK"
      dataSourceId={targetId}
      config={sinkConfig}
      excludeKeys={SINK_MANAGED_KEYS}
      onChange={updateSink}
    />
  );

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
          sourceExtraParameters={sourceExtraParameters}
          sinkExtraParameters={sinkExtraParameters}
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
          primaryKeyOptions={primaryKeyCatalog.columns}
          primaryKeyLoading={primaryKeyCatalog.loading}
          sourceReady={Boolean(sourceId)}
          targetReady={Boolean(targetId)}
          sourceExtraParameters={sourceExtraParameters}
          sinkExtraParameters={sinkExtraParameters}
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

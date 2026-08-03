import type { DataSourceRecord } from '@/pages/data-source/types';

import { connectorIdForDataSourceType } from '../form-schema/valueAdapter';
import useDataSourceColumns from '../hooks/useDataSourceColumns';
import useDataSourceTables from '../hooks/useDataSourceTables';
import {
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
];

const hasOwn = (value: Record<string, any>, key: string) =>
  Object.prototype.hasOwnProperty.call(value, key);

export default function SyncTaskEditor({
  editor,
  dataSources,
  dataSourceLoading,
  onChange,
}: SyncTaskEditorProps) {
  const sourceConfig = editor.source.config || {};
  const sinkConfig = editor.sink.config || {};
  const sourceId = editor.source.dataSourceId;
  const targetId = editor.sink.dataSourceId;

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
    let nextEditor = updateEndpointConfig(editor, 'sink', patch);
    const channelPatch: Partial<SyncEditorState['channel']> = {};

    if (hasOwn(patch, 'dirtyDataPolicy')) {
      channelPatch.dirtyDataPolicy =
        patch.dirtyDataPolicy === 'SKIP' ? 'skip' : 'stop';
    }
    if (hasOwn(patch, 'dirtyDataMaxCount')) {
      channelPatch.dirtyDataLimit = Number(
        patch.dirtyDataMaxCount || 0,
      );
    }

    if (Object.keys(channelPatch).length > 0) {
      nextEditor = {
        ...nextEditor,
        channel: {
          ...nextEditor.channel,
          ...channelPatch,
        },
      };
    }

    onChange(nextEditor);
  };

  const sourceConnectorId =
    editor.source.connectorId ||
    connectorIdForDataSourceType(editor.source.dbType);
  const sinkConnectorId =
    editor.sink.connectorId ||
    connectorIdForDataSourceType(editor.sink.dbType);

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

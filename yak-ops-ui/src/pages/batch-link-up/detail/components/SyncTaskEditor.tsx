import type { DataSourceRecord } from '@/pages/data-source/types';

import useDataSourceColumns from '../hooks/useDataSourceColumns';
import useDataSourceTables from '../hooks/useDataSourceTables';
import { updateEndpointConfig, type SyncEditorState } from '../model';
import ChannelConfigSection from './ChannelConfigSection';
import FieldMappingSection, { type FieldMappingValue } from './FieldMappingSection';
import MultiTableConfigSection from './MultiTableConfigSection';
import ScheduleConfigSection from './ScheduleConfigSection';
import SingleTableConfigSection from './SingleTableConfigSection';
import TaskBasicSection from './TaskBasicSection';

interface SyncTaskEditorProps {
  editor: SyncEditorState;
  dataSources: DataSourceRecord[];
  dataSourceLoading: boolean;
  onChange: (value: SyncEditorState) => void;
}

const normalizeMappings = (value: unknown): FieldMappingValue[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item: any) => ({
      source: String(item?.source ?? item?.sourceField ?? '').trim(),
      target: String(item?.target ?? item?.targetField ?? '').trim(),
    }))
    .filter((item) => item.source && item.target);
};

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
  const mappingColumns = normalizeMappings(editor.mapping?.columns);

  const sourceCatalog = useDataSourceTables(sourceId);
  const targetCatalog = useDataSourceTables(targetId);
  const sourceColumnRequest = sourceConfig.readMode === 'sql'
    ? sourceConfig.sql?.trim() ? { query: sourceConfig.sql } : undefined
    : sourceConfig.table ? { table_path: sourceConfig.table } : undefined;
  const targetColumnRequest = !sinkConfig.autoCreateTable && sinkConfig.table
    ? { table_path: sinkConfig.table }
    : undefined;
  const sourceColumnCatalog = useDataSourceColumns(sourceId, sourceColumnRequest);
  const targetColumnCatalog = useDataSourceColumns(targetId, targetColumnRequest);
  const primaryKeyCatalog = sinkConfig.autoCreateTable
    ? sourceColumnCatalog
    : targetColumnCatalog;
  const mappingTargetColumns = sinkConfig.autoCreateTable
    ? sourceColumnCatalog.columns
    : targetColumnCatalog.columns;
  const mappingTargetLoading = sinkConfig.autoCreateTable
    ? sourceColumnCatalog.loading
    : targetColumnCatalog.loading;

  const updateSource = (patch: Record<string, any>) =>
    onChange(updateEndpointConfig(editor, 'source', patch));
  const updateSink = (patch: Record<string, any>) =>
    onChange(updateEndpointConfig(editor, 'sink', patch));
  const updateMapping = (columns: FieldMappingValue[]) =>
    onChange({ ...editor, mapping: { columns } });

  return (
    <div className="space-y-5">
      <div id="task-basic" className="scroll-mt-6">
        <TaskBasicSection
          editor={editor}
          dataSources={dataSources}
          dataSourceLoading={dataSourceLoading}
          onChange={onChange}
        />
      </div>

      <div id="sync-config" className="scroll-mt-6">
        {editor.mode === 'GUIDE_MULTI' ? (
          <MultiTableConfigSection
            sourceConfig={sourceConfig}
            sinkConfig={sinkConfig}
            sourceTables={sourceCatalog.tables}
            sourceLoading={sourceCatalog.loading}
            sourceReady={Boolean(sourceId)}
            targetReady={Boolean(targetId)}
            sourceExtraParameters={null}
            sinkExtraParameters={null}
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
            sourceExtraParameters={null}
            sinkExtraParameters={null}
            onSourceChange={updateSource}
            onSinkChange={updateSink}
          />
        )}
      </div>

      <div id="runtime-params" className="scroll-mt-6">
        <ChannelConfigSection
          editor={editor}
          sinkConfig={sinkConfig}
          onChange={onChange}
          onSinkChange={updateSink}
        />
      </div>

      {editor.mode === 'GUIDE_SINGLE' ? (
        <div id="field-mapping" className="scroll-mt-6">
          <FieldMappingSection
            value={mappingColumns}
            onChange={updateMapping}
            sourceColumns={sourceColumnCatalog.columns}
            targetColumns={mappingTargetColumns}
            sourceLoading={sourceColumnCatalog.loading}
            targetLoading={mappingTargetLoading}
            sourceReady={Boolean(sourceId && sourceColumnRequest)}
            targetReady={Boolean(targetId && (sinkConfig.autoCreateTable || targetColumnRequest))}
            targetDerived={Boolean(sinkConfig.autoCreateTable)}
          />
        </div>
      ) : null}

      <div id="schedule-config" className="scroll-mt-6">
        <ScheduleConfigSection editor={editor} onChange={onChange} />
      </div>
    </div>
  );
}

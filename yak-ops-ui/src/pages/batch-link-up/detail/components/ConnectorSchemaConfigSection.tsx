import { Alert, Spin, Tabs } from 'antd';
import { useEffect, useMemo, useState } from 'react';

import type { SyncEditorState } from '../model';
import ConnectorDynamicForm from '../form-schema/ConnectorDynamicForm';
import useConnectorFormSchema from '../form-schema/useConnectorFormSchema';
import {
  applySchemaValue,
  connectorIdForDataSourceType,
  toSchemaValues,
} from '../form-schema/valueAdapter';
import EditorSection from './EditorSection';

interface ConnectorSchemaConfigSectionProps {
  editor: SyncEditorState;
  sourceConfig: Record<string, any>;
  sinkConfig: Record<string, any>;
  onSourceChange: (patch: Record<string, any>) => void;
  onSinkChange: (patch: Record<string, any>) => void;
  onChannelChange: (patch: Record<string, any>) => void;
  onValidationChange?: (errors: string[]) => void;
}

const SOURCE_MANAGED_KEYS = ['table_path', 'table_list', 'query'];
const SINK_MANAGED_KEYS = [
  'table_path',
  'schema_save_mode',
  'data_save_mode',
  'write_mode',
  'primary_keys',
  'batch_size',
];

export default function ConnectorSchemaConfigSection({
  editor,
  sourceConfig,
  sinkConfig,
  onSourceChange,
  onSinkChange,
  onChannelChange,
  onValidationChange,
}: ConnectorSchemaConfigSectionProps) {
  const sourceConnectorId = connectorIdForDataSourceType(editor.basic.sourceType);
  const sinkConnectorId = connectorIdForDataSourceType(editor.basic.targetType);
  const source = useConnectorFormSchema(sourceConnectorId, 'SOURCE');
  const sink = useConnectorFormSchema(sinkConnectorId, 'SINK');
  const [sourceErrors, setSourceErrors] = useState<string[]>([]);
  const [sinkErrors, setSinkErrors] = useState<string[]>([]);
  const channel = editor.workflow.channelConfig || {};

  const sourceValues = useMemo(
    () => toSchemaValues(sourceConfig, 'SOURCE'),
    [sourceConfig],
  );
  const sinkValues = useMemo(
    () => ({
      ...toSchemaValues(sinkConfig, 'SINK'),
      dirty_data_policy:
        channel.dirtyDataPolicy === 'skip' ? 'SKIP' : 'FAIL_FAST',
      dirty_data_max_count: Number(channel.dirtyDataLimit || 0),
    }),
    [channel.dirtyDataLimit, channel.dirtyDataPolicy, sinkConfig],
  );

  useEffect(() => {
    if (!source.schema) setSourceErrors([]);
  }, [source.schema, sourceConnectorId]);

  useEffect(() => {
    if (!sink.schema) setSinkErrors([]);
  }, [sink.schema, sinkConnectorId]);

  useEffect(() => {
    onValidationChange?.([...sourceErrors, ...sinkErrors]);
  }, [onValidationChange, sinkErrors, sourceErrors]);

  const updateSink = (key: string, value: unknown) => {
    if (key === 'dirty_data_policy') {
      onChannelChange({
        dirtyDataPolicy: value === 'SKIP' ? 'skip' : 'stop',
      });
      return;
    }
    if (key === 'dirty_data_max_count') {
      onChannelChange({ dirtyDataLimit: Number(value || 0) });
      return;
    }
    onSinkChange(applySchemaValue(sinkConfig, 'SINK', key, value));
  };

  if (!sourceConnectorId && !sinkConnectorId) return null;

  const loading = source.loading || sink.loading;
  const errors = [source.error, sink.error].filter(Boolean);
  const stale = source.schema?.stale || sink.schema?.stale;

  return (
    <EditorSection title="Connector 扩展配置">
      {stale ? (
        <Alert
          type="warning"
          showIcon
          className="mb-4"
          message="当前使用缓存的 Connector Schema"
          description="配置仍可编辑；Worker 恢复后会自动刷新 Schema。"
        />
      ) : null}

      {loading ? (
        <div className="flex min-h-36 items-center justify-center">
          <Spin />
        </div>
      ) : null}

      {!loading && errors.length > 0 && !source.schema && !sink.schema ? (
        <Alert
          type="warning"
          showIcon
          message="Connector Schema 暂不可用"
          description={errors[0]}
        />
      ) : null}

      {!loading && (source.schema || sink.schema) ? (
        <Tabs
          size="small"
          items={[
            source.schema
              ? {
                  key: 'source',
                  label: 'Source 高级配置',
                  children: (
                    <ConnectorDynamicForm
                      schema={source.schema}
                      dataSourceId={editor.basic.sourceDataSourceId}
                      values={sourceValues}
                      excludeKeys={SOURCE_MANAGED_KEYS}
                      onChange={(key, value) =>
                        onSourceChange(
                          applySchemaValue(sourceConfig, 'SOURCE', key, value),
                        )
                      }
                      onValidationChange={setSourceErrors}
                    />
                  ),
                }
              : null,
            sink.schema
              ? {
                  key: 'sink',
                  label: 'Sink 高级配置',
                  children: (
                    <ConnectorDynamicForm
                      schema={sink.schema}
                      dataSourceId={editor.basic.targetDataSourceId}
                      values={sinkValues}
                      excludeKeys={SINK_MANAGED_KEYS}
                      onChange={updateSink}
                      onValidationChange={setSinkErrors}
                    />
                  ),
                }
              : null,
          ].filter(Boolean) as any}
        />
      ) : null}
    </EditorSection>
  );
}

import {
  isApiSuccess,
  responseMessage,
  type SyncEditorState,
} from '../model';
import { connectorFormApi } from './service';
import {
  connectorIdForDataSourceType,
  toSchemaValues,
} from './valueAdapter';

const resultErrors = (result: any): string[] => {
  if (!result || result.valid) return [];
  return [
    ...(result.formErrors || []),
    ...Object.values(result.fieldErrors || {}).flatMap((errors) =>
      Array.isArray(errors) ? errors.map(String) : [],
    ),
  ].map(String);
};

export default async function validateEditorConnectorForms(
  editor: SyncEditorState,
): Promise<string[]> {
  const sourceConfig = editor.source.config || {};
  const sinkConfig = editor.sink.config || {};
  const sourceConnectorId =
    editor.source.connectorId ||
    connectorIdForDataSourceType(editor.source.dbType);
  const sinkConnectorId =
    editor.sink.connectorId ||
    connectorIdForDataSourceType(editor.sink.dbType);

  const requests: Promise<any>[] = [];
  if (sourceConnectorId) {
    requests.push(
      connectorFormApi.validate(
        sourceConnectorId,
        'SOURCE',
        toSchemaValues(sourceConfig, 'SOURCE'),
        { dataSourceId: editor.source.dataSourceId },
      ),
    );
  }
  if (sinkConnectorId) {
    requests.push(
      connectorFormApi.validate(
        sinkConnectorId,
        'SINK',
        {
          ...toSchemaValues(sinkConfig, 'SINK'),
          dirty_data_policy:
            editor.channel.dirtyDataPolicy === 'skip'
              ? 'SKIP'
              : 'FAIL_FAST',
          dirty_data_max_count: Number(editor.channel.dirtyDataLimit || 0),
        },
        { dataSourceId: editor.sink.dataSourceId },
      ),
    );
  }

  try {
    const responses = await Promise.all(requests);
    return responses.flatMap((response) =>
      isApiSuccess(response)
        ? resultErrors(response.data)
        : [responseMessage(response, 'Connector 配置校验失败')],
    );
  } catch (error: any) {
    return [
      error?.message ||
        'Connector 配置校验服务不可用，请检查 Link-Up Worker 和 Schema 缓存后重试',
    ];
  }
}

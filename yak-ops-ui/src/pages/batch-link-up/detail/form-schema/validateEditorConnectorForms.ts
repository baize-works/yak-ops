import {
  endpointNode,
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
  const sourceConfig = endpointNode(editor.workflow, 'source')?.data?.config || {};
  const sinkConfig = endpointNode(editor.workflow, 'sink')?.data?.config || {};
  const sourceConnectorId = connectorIdForDataSourceType(
    sourceConfig.connectorId || editor.basic.sourceType,
  );
  const sinkConnectorId = connectorIdForDataSourceType(
    sinkConfig.connectorId || editor.basic.targetType,
  );
  const channel = editor.workflow.channelConfig || {};

  const requests: Promise<any>[] = [];
  if (sourceConnectorId) {
    requests.push(
      connectorFormApi.validate(
        sourceConnectorId,
        'SOURCE',
        toSchemaValues(sourceConfig, 'SOURCE'),
        { dataSourceId: editor.basic.sourceDataSourceId },
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
            channel.dirtyDataPolicy === 'skip' ? 'SKIP' : 'FAIL_FAST',
          dirty_data_max_count: Number(channel.dirtyDataLimit || 0),
        },
        { dataSourceId: editor.basic.targetDataSourceId },
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

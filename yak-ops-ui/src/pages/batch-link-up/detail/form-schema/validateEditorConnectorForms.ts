import {
  endpointNode,
  isApiSuccess,
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
  const sourceConnectorId = connectorIdForDataSourceType(editor.basic.sourceType);
  const sinkConnectorId = connectorIdForDataSourceType(editor.basic.targetType);
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
      isApiSuccess(response) ? resultErrors(response.data) : [],
    );
  } catch {
    // Worker 或 Schema 缓存临时不可用时，保留原有前端校验，不阻断任务保存。
    return [];
  }
}

import type { SyncEditorState } from '../model';

/**
 * 一期不再维护远程 Connector Form Schema。
 * Link-Up 在任务提交时完成最终 JobSpec 校验。
 */
export default async function validateEditorConnectorForms(
  _editor: SyncEditorState,
): Promise<string[]> {
  return [];
}

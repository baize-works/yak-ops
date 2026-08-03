import type { DataSourceRecord } from '@/pages/data-source/types';

import SyncTaskEditor from '../../../detail/components/SyncTaskEditor';
import type { SyncEditorState } from '../../../detail/model';

interface MultiTableSyncTaskEditorProps {
  editor: SyncEditorState;
  dataSources: DataSourceRecord[];
  dataSourceLoading: boolean;
  onChange: (value: SyncEditorState) => void;
}

/**
 * 多表路由入口复用统一离线同步编辑器。
 *
 * 任务模式已经由路由页校验为 GUIDE_MULTI，具体渲染由 SyncTaskEditor
 * 基于 editor.mode 选择 MultiTableConfigSection，避免维护第二套旧 Workflow 状态。
 */
export default function MultiTableSyncTaskEditor(
  props: MultiTableSyncTaskEditorProps,
) {
  return <SyncTaskEditor {...props} />;
}

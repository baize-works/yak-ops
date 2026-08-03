import { history, useLocation, useParams } from '@umijs/max';
import { Button, ConfigProvider, Empty, message, Spin } from 'antd';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { fetchDataSourceAll } from '@/pages/data-source/service';
import type { DataSourceRecord } from '@/pages/data-source/types';
import { BRAND_THEME } from '@/styles/brand';

import { linkupJobDefinitionApi } from '../../api';
import SyncTaskEditor from '../../detail/components/SyncTaskEditor';
import validateEditorConnectorForms from '../../detail/form-schema/validateEditorConnectorForms';
import { useSmoothWheelScroll } from '../../detail/hooks/useSmoothWheelScroll';
import {
  buildSavePayload,
  extractSavedId,
  isApiSuccess,
  normalizeEditDetail,
  responseMessage,
  type SyncEditorState,
} from '../../detail/model';

const validateTaskConfig = (
  editor: SyncEditorState,
): string | null => {
  if (!editor.basic.jobName.trim()) {
    return '请输入任务名称';
  }

  if (!editor.source.dataSourceId) {
    return '请选择来源数据源';
  }

  if (!editor.sink.dataSourceId) {
    return '请选择目标数据源';
  }

  const source = editor.source.config || {};
  const sink = editor.sink.config || {};

  if (source.readMode === 'sql') {
    if (!source.sql?.trim()) {
      return '请填写来源查询 SQL';
    }
  } else if (!source.table) {
    return '请选择来源表';
  }

  if (sink.autoCreateTable) {
    if (!sink.targetTableName?.trim()) {
      return '请输入目标表名';
    }
  } else if (!sink.table) {
    return '请选择目标表';
  }

  if (
    String(sink.writeMode || '').toLowerCase() === 'upsert' &&
    !sink.primaryKey?.trim()
  ) {
    return 'Upsert 写入模式需要配置主键字段';
  }

  if (!editor.channel.parallelism || editor.channel.parallelism < 1) {
    return 'Channel 并发数必须大于 0';
  }

  if (
    editor.channel.dirtyDataPolicy === 'skip' &&
    editor.channel.dirtyDataLimit < 0
  ) {
    return '脏数据上限不能小于 0';
  }

  return null;
};

export default function SingleBatchLinkUpConfigPage() {
  const location = useLocation();
  const routeParams = useParams<{ id?: string }>();
  const pageRootRef = useRef<HTMLDivElement>(null);

  const taskId = useMemo(
    () =>
      routeParams.id ||
      new URLSearchParams(location.search).get('id') ||
      '',
    [location.search, routeParams.id],
  );

  const [editor, setEditor] = useState<SyncEditorState | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dataSourceLoading, setDataSourceLoading] = useState(false);
  const [dataSources, setDataSources] = useState<DataSourceRecord[]>([]);

  useSmoothWheelScroll(pageRootRef, true);

  const loadDataSources = useCallback(async () => {
    try {
      setDataSourceLoading(true);
      const response = await fetchDataSourceAll();

      if (!isApiSuccess(response)) {
        message.error(responseMessage(response, '获取数据源失败'));
        setDataSources([]);
        return;
      }

      setDataSources(response?.data?.bizData || []);
    } catch (error: any) {
      message.error(error?.message || '获取数据源失败');
      setDataSources([]);
    } finally {
      setDataSourceLoading(false);
    }
  }, []);

  const loadTask = useCallback(async () => {
    if (!taskId) return;

    try {
      setLoading(true);
      const response = await linkupJobDefinitionApi.selectEditDetail(taskId);

      if (!isApiSuccess(response) || !response?.data) {
        message.error(responseMessage(response, '获取同步任务失败'));
        setEditor(null);
        return;
      }

      const nextEditor = normalizeEditDetail(response.data, taskId);

      if (nextEditor.mode === 'GUIDE_MULTI') {
        history.replace(
          `/sync/batch-link-up/${encodeURIComponent(
            taskId,
          )}/config/multi?scene=edit`,
        );
        return;
      }

      if (nextEditor.mode === 'SCRIPT') {
        history.replace(
          `/sync/batch-link-up/${encodeURIComponent(
            taskId,
          )}/config/script?scene=edit`,
        );
        return;
      }

      setEditor(nextEditor);
    } catch (error: any) {
      message.error(error?.message || '获取同步任务失败');
      setEditor(null);
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    if (!taskId) return;
    void Promise.all([loadTask(), loadDataSources()]);
  }, [loadDataSources, loadTask, taskId]);

  const persistEditor = async (
    nextEditor: SyncEditorState,
  ): Promise<SyncEditorState | null> => {
    try {
      setSaving(true);
      const payload = buildSavePayload(nextEditor);
      const response = await linkupJobDefinitionApi.saveOrUpdateGuideSingle(
        payload,
      );

      if (!isApiSuccess(response)) {
        message.error(responseMessage(response, '保存同步任务失败'));
        return null;
      }

      const savedEditor: SyncEditorState = {
        ...nextEditor,
        basic: payload.basic,
        id: extractSavedId(response, nextEditor.id),
      };

      setEditor(savedEditor);
      message.success('任务配置已保存');
      return savedEditor;
    } catch (error: any) {
      message.error(error?.message || '保存同步任务失败');
      return null;
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (!editor) return;

    const error = validateTaskConfig(editor);
    if (error) {
      message.warning(error);
      return;
    }

    const remoteErrors = await validateEditorConnectorForms(editor);
    if (remoteErrors.length > 0) {
      message.warning(remoteErrors[0]);
      return;
    }

    await persistEditor(editor);
  };

  const handleCancel = () => {
    history.push('/sync/batch-link-up');
  };

  if (!taskId) {
    history.replace('/sync/batch-link-up');
    return null;
  }

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-64px)] items-center justify-center bg-[#f7f8fa]">
        <Spin size="large" />
      </div>
    );
  }

  if (!editor) {
    return (
      <div className="flex min-h-[calc(100vh-64px)] items-center justify-center bg-[#f7f8fa]">
        <Empty
          description="未找到单表同步任务"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        >
          <Button onClick={handleCancel}>返回任务列表</Button>
        </Empty>
      </div>
    );
  }

  return (
    <ConfigProvider theme={BRAND_THEME}>
      <div className="h-[calc(100vh-64px)] overflow-hidden bg-[#f7f8fa] text-[#161823]">
        <div ref={pageRootRef} className="h-full overflow-y-auto">
          <div className="mx-auto w-full max-w-[1040px] px-6 pt-6">
            <main className="pb-4">
              <SyncTaskEditor
                editor={editor}
                dataSources={dataSources}
                dataSourceLoading={dataSourceLoading}
                onChange={setEditor}
              />
            </main>

            <footer className="sticky bottom-0 z-50 overflow-hidden rounded-t-lg border border-b-0 border-[#eaecf0] bg-white shadow-[0_-8px_16px_rgba(0,0,0,0.06)]">
              <div className="flex min-h-[80px] items-center gap-3 px-8 py-4">
                <Button
                  type="primary"
                  loading={saving}
                  className="!h-9 !min-w-[120px] !rounded-lg !px-6 !font-medium !text-white"
                  onClick={handleSave}
                >
                  保存配置
                </Button>

                <Button
                  disabled={saving}
                  className="!h-9 !min-w-[120px] !rounded-lg !border-0 !bg-[#f2f3f5] !px-5 !font-medium !text-[#344054] hover:!bg-[#e9eaec]"
                  onClick={handleCancel}
                >
                  取消
                </Button>
              </div>
            </footer>
          </div>
        </div>
      </div>
    </ConfigProvider>
  );
}

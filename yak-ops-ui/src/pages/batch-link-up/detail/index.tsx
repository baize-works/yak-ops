import {
  ArrowLeftOutlined,
  SaveOutlined,
} from '@ant-design/icons';
import { history, useLocation, useParams } from '@umijs/max';
import {
  Button,
  ConfigProvider,
  Empty,
  message,
  Spin,
  Tag,
} from 'antd';
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
} from 'react';

import { fetchDataSourceAll } from '@/pages/data-source/service';
import type { DataSourceRecord } from '@/pages/data-source/types';
import {
  BRAND_COLOR,
  BRAND_COLOR_SOFT_HOVER,
  BRAND_THEME,
} from '@/styles/brand';

import { linkupJobDefinitionApi } from '../api';
import SyncTaskEditor from './components/SyncTaskEditor';
import {
  buildSavePayload,
  endpointNode,
  extractSavedId,
  isApiSuccess,
  normalizeEditDetail,
  responseMessage,
  type SyncEditorState,
} from './model';

const modeLabel = {
  GUIDE_SINGLE: '单表同步',
  GUIDE_MULTI: '多表同步',
} as const;

const brandCssVariables = {
  '--yak-brand-color': BRAND_COLOR,
  '--yak-brand-color-soft-hover': BRAND_COLOR_SOFT_HOVER,
} as CSSProperties;

const validateTaskConfig = (
  editor: SyncEditorState,
): string | null => {
  if (!editor.basic.jobName.trim()) {
    return '请输入任务名称';
  }

  if (!editor.basic.sourceDataSourceId) {
    return '请选择来源数据源';
  }

  if (!editor.basic.targetDataSourceId) {
    return '请选择目标数据源';
  }

  const source =
    endpointNode(editor.workflow, 'source')?.data?.config || {};

  const sink =
    endpointNode(editor.workflow, 'sink')?.data?.config || {};

  if (editor.mode === 'GUIDE_MULTI') {
    if (
      !source.tables?.length &&
      !source.tablePattern?.trim()
    ) {
      return '请选择来源表，或填写表名过滤规则';
    }

    if (
      sink.tableNamingRule !== 'same_name' &&
      !sink.tableNameAffix?.trim()
    ) {
      return '请填写目标表名前缀或后缀';
    }
  } else if (source.readMode === 'sql') {
    if (!source.sql?.trim()) {
      return '请填写来源查询 SQL';
    }
  } else if (!source.table) {
    return '请选择来源表';
  }

  if (editor.mode === 'GUIDE_SINGLE') {
    if (sink.autoCreateTable) {
      if (!sink.targetTableName?.trim()) {
        return '请输入目标表名';
      }
    } else if (!sink.table) {
      return '请选择目标表';
    }
  }

  if (
    sink.writeMode === 'upsert' &&
    !sink.primaryKey?.trim()
  ) {
    return 'Upsert 写入模式需要配置主键字段';
  }

  if (
    !editor.env.parallelism ||
    editor.env.parallelism < 1
  ) {
    return 'Channel 并发数必须大于 0';
  }

  return null;
};

export default function BatchLinkUpDetailPage() {
  const location = useLocation();
  const routeParams = useParams<{ id?: string }>();

  const taskId = useMemo(
    () =>
      routeParams.id ||
      new URLSearchParams(location.search).get('id') ||
      '',
    [location.search, routeParams.id],
  );

  const [editor, setEditor] =
    useState<SyncEditorState | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dataSourceLoading, setDataSourceLoading] =
    useState(false);
  const [dataSources, setDataSources] = useState<
    DataSourceRecord[]
  >([]);

  const loadDataSources = useCallback(async () => {
    try {
      setDataSourceLoading(true);

      const response = await fetchDataSourceAll();

      if (!isApiSuccess(response)) {
        message.error(
          responseMessage(response, '获取数据源失败'),
        );
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

      const response =
        await linkupJobDefinitionApi.selectEditDetail(taskId);

      if (!isApiSuccess(response) || !response?.data) {
        message.error(
          responseMessage(response, '获取同步任务失败'),
        );
        setEditor(null);
        return;
      }

      setEditor(
        normalizeEditDetail(response.data, taskId),
      );
    } catch (error: any) {
      message.error(error?.message || '获取同步任务失败');
      setEditor(null);
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    if (!taskId) return;

    void Promise.all([
      loadTask(),
      loadDataSources(),
    ]);
  }, [loadDataSources, loadTask, taskId]);

  const persistEditor = async (
    nextEditor: SyncEditorState,
  ): Promise<SyncEditorState | null> => {
    try {
      setSaving(true);

      const payload = buildSavePayload(nextEditor);

      const response =
        nextEditor.mode === 'GUIDE_MULTI'
          ? await linkupJobDefinitionApi.saveOrUpdateGuideMulti(
              payload,
            )
          : await linkupJobDefinitionApi.saveOrUpdateGuideSingle(
              payload,
            );

      if (!isApiSuccess(response)) {
        message.error(
          responseMessage(response, '保存同步任务失败'),
        );
        return null;
      }

      const savedEditor: SyncEditorState = {
        ...nextEditor,
        basic: payload.basic,
        id: extractSavedId(
          response,
          nextEditor.id,
        ),
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

    await persistEditor(editor);
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
          description="未找到同步任务"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        >
          <Button
            onClick={() =>
              history.push('/sync/batch-link-up')
            }
          >
            返回任务列表
          </Button>
        </Empty>
      </div>
    );
  }

  return (
    <ConfigProvider theme={BRAND_THEME}>
      <div
        className="min-h-[calc(100vh-64px)] bg-[#f7f8fa] text-[#161823]"
        style={brandCssVariables}
      >
        <header className="sticky top-0 z-30 border-b border-black/[0.055] bg-white/95 backdrop-blur">
          <div className="mx-auto flex min-h-[68px] max-w-[1040px] items-center px-6 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <Button
                type="text"
                icon={<ArrowLeftOutlined />}
                className="!h-9 !w-9 !shrink-0 !rounded-lg !text-[#475467] hover:!bg-[#f2f3f5]"
                onClick={() =>
                  history.push('/sync/batch-link-up')
                }
              />

              <div className="flex min-w-0 items-center gap-2.5">
                <h1 className="m-0 truncate text-[18px] font-semibold leading-7 text-[#161823]">
                  {editor.basic.jobName ||
                    '未命名同步任务'}
                </h1>

                <Tag className="!m-0 !rounded-md !border-[#ffd1da] !bg-[#fff4f6] !px-2 !text-[11px] !font-medium !text-[var(--yak-brand-color)]">
                  {modeLabel[editor.mode]}
                </Tag>
              </div>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-[1040px] px-6 py-6 pb-8">
          <SyncTaskEditor
            editor={editor}
            dataSources={dataSources}
            dataSourceLoading={dataSourceLoading}
            onChange={setEditor}
          />
        </main>

        <footer className="sticky bottom-0 z-20 border-t border-black/[0.055] bg-white/[0.96] shadow-[0_-8px_24px_rgba(22,24,35,0.035)] backdrop-blur">
          <div className="mx-auto flex min-h-[68px] max-w-[1040px] items-center justify-end gap-3 px-6 py-3">
            <Button
              disabled={saving}
              className="!h-9 !rounded-lg !border-[#dfe1e5] !px-5 !font-medium !text-[#344054]"
              onClick={() =>
                history.push('/sync/batch-link-up')
              }
            >
              取消
            </Button>

            <Button
              type="primary"
              icon={<SaveOutlined />}
              loading={saving}
              className="!h-9 !rounded-lg !px-6 !font-medium !text-white"
              onClick={handleSave}
            >
              保存配置
            </Button>
          </div>
        </footer>
      </div>
    </ConfigProvider>
  );
}

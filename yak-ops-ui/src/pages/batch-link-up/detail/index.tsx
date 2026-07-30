import {
  ArrowLeftOutlined,
  CalendarOutlined,
  CheckCircleFilled,
  SaveOutlined,
} from '@ant-design/icons';
import { history, useLocation, useParams } from '@umijs/max';
import {
  Button,
  Drawer,
  Empty,
  message,
  Spin,
  Steps,
  Tag,
} from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';
import BatchLinkUpPage from '../index';
import {
  fetchDataSourceAll,
  testDataSourceConnection,
} from '@/pages/data-source/service';
import type { DataSourceRecord } from '@/pages/data-source/types';
import { linkupJobDefinitionApi } from '../api';
import ScheduleConfigContent from '../workflow/components/ScheduleConfigContent';
import ConnectionTestStep, {
  type ConnectionTestState,
} from './components/ConnectionTestStep';
import CreateSyncTaskModal from './components/CreateSyncTaskModal';
import SyncTaskConfigStep from './components/SyncTaskConfigStep';
import {
  applyConnectionSelection,
  buildSavePayload,
  endpointNode,
  extractSavedId,
  isApiSuccess,
  normalizeEditDetail,
  responseMessage,
  type SyncEditorState,
} from './model';

const editorSteps = [
  {
    title: '连接测试',
    description: '选择并验证来源端与目标端',
  },
  {
    title: '任务配置',
    description: '配置 Source、Sink 和 Channel',
  },
];

const modeView = {
  GUIDE_SINGLE: {
    text: '单表同步',
    className: '!border-[#c7d7fe] !bg-[#eff4ff] !text-[#315efb]',
  },
  GUIDE_MULTI: {
    text: '多表同步',
    className: '!border-[#d9d6fe] !bg-[#f4f3ff] !text-[#6938ef]',
  },
} as const;

const getSelectedRecord = (
  records: DataSourceRecord[],
  id: string,
): DataSourceRecord | undefined =>
  records.find((record) => String(record.id) === String(id));

const validateTaskConfig = (editor: SyncEditorState): string | null => {
  const source = endpointNode(editor.workflow, 'source')?.data?.config || {};
  const sink = endpointNode(editor.workflow, 'sink')?.data?.config || {};

  if (editor.mode === 'GUIDE_MULTI') {
    if (!source.tables?.length && !source.tablePattern?.trim()) {
      return '请选择来源表，或填写表名过滤规则';
    }
    if (
      sink.tableNamingRule !== 'same_name' &&
      !sink.tableNameAffix?.trim()
    ) {
      return '请填写目标表名前缀或后缀';
    }
  } else if (source.readMode === 'sql') {
    if (!source.sql?.trim()) return '请填写来源查询 SQL';
  } else if (!source.table) {
    return '请选择来源表';
  }

  if (editor.mode === 'GUIDE_SINGLE') {
    if (sink.autoCreateTable) {
      if (!sink.targetTableName?.trim()) return '请输入目标表名';
    } else if (!sink.table) {
      return '请选择目标表';
    }
  }

  if (sink.writeMode === 'upsert' && !sink.primaryKey?.trim()) {
    return 'Upsert 写入模式需要配置主键字段';
  }

  if (!editor.env.parallelism || editor.env.parallelism < 1) {
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
  const editScene = useMemo(
    () => new URLSearchParams(location.search).get('scene') === 'edit',
    [location.search],
  );

  const [editor, setEditor] = useState<SyncEditorState | null>(null);
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dataSourceLoading, setDataSourceLoading] = useState(false);
  const [dataSources, setDataSources] = useState<DataSourceRecord[]>([]);
  const [sourceId, setSourceId] = useState('');
  const [targetId, setTargetId] = useState('');
  const [sourceState, setSourceState] =
    useState<ConnectionTestState>('idle');
  const [targetState, setTargetState] =
    useState<ConnectionTestState>('idle');
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

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
      setEditor(nextEditor);
      setSourceId(nextEditor.basic.sourceDataSourceId || '');
      setTargetId(nextEditor.basic.targetDataSourceId || '');
      setSourceState('idle');
      setTargetState('idle');
      setActiveStep(0);
    } catch (error: any) {
      message.error(error?.message || '获取同步任务失败');
      setEditor(null);
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    if (!taskId) return;

    const cacheKey = `batch-link-up-detail-${taskId}`;
    const hasCreateCache = Boolean(sessionStorage.getItem(cacheKey));
    if (hasCreateCache && !editScene) {
      setCreateOpen(true);
      void loadDataSources();
      return;
    }

    setCreateOpen(false);
    void Promise.all([loadTask(), loadDataSources()]);
  }, [editScene, loadDataSources, loadTask, taskId]);

  const persistEditor = async (
    nextEditor: SyncEditorState,
    successText?: string,
  ): Promise<SyncEditorState | null> => {
    try {
      setSaving(true);
      const payload = buildSavePayload(nextEditor);
      const response =
        nextEditor.mode === 'GUIDE_MULTI'
          ? await linkupJobDefinitionApi.saveOrUpdateGuideMulti(payload)
          : await linkupJobDefinitionApi.saveOrUpdateGuideSingle(payload);

      if (!isApiSuccess(response)) {
        message.error(responseMessage(response, '保存同步任务失败'));
        return null;
      }

      const savedEditor = {
        ...nextEditor,
        id: extractSavedId(response, nextEditor.id),
      };
      setEditor(savedEditor);
      if (successText) message.success(successText);
      return savedEditor;
    } catch (error: any) {
      message.error(error?.message || '保存同步任务失败');
      return null;
    } finally {
      setSaving(false);
    }
  };

  const testConnection = async (
    endpoint: 'source' | 'target',
  ) => {
    const id = endpoint === 'source' ? sourceId : targetId;
    const setState = endpoint === 'source' ? setSourceState : setTargetState;
    if (!id) {
      message.warning(
        endpoint === 'source' ? '请选择来源数据源' : '请选择目标数据源',
      );
      return;
    }

    try {
      setState('testing');
      const response = await testDataSourceConnection(id);
      if (isApiSuccess(response) && response?.data !== false) {
        setState('success');
        message.success(
          endpoint === 'source' ? '来源端连接成功' : '目标端连接成功',
        );
        return;
      }
      setState('error');
      message.error(responseMessage(response, '数据源连接失败'));
    } catch (error: any) {
      setState('error');
      message.error(error?.message || '数据源连接失败');
    }
  };

  const handleConnectionNext = async () => {
    if (!editor) return;
    const source = getSelectedRecord(dataSources, sourceId);
    const target = getSelectedRecord(dataSources, targetId);

    if (!source || !target) {
      message.warning('请选择来源端和目标端数据源');
      return;
    }
    if (sourceState !== 'success' || targetState !== 'success') {
      message.warning('请先完成来源端和目标端的连接测试');
      return;
    }

    const nextEditor = applyConnectionSelection(editor, source, target);
    const saved = await persistEditor(nextEditor, '连接信息已保存');
    if (saved) setActiveStep(1);
  };

  const handleSave = async () => {
    if (!editor) return;
    const error = validateTaskConfig(editor);
    if (error) {
      message.warning(error);
      return;
    }
    await persistEditor(editor, '任务配置已保存');
  };

  if (!taskId) {
    history.replace('/sync/batch-link-up');
    return null;
  }

  if (createOpen) {
    const cacheKey = `batch-link-up-detail-${taskId}`;
    return (
      <div className="relative min-h-screen bg-[#f8fafc]">
        <BatchLinkUpPage />
        <CreateSyncTaskModal
          open
          reservedTaskId={taskId}
          onCancel={() => {
            sessionStorage.removeItem(cacheKey);
            history.push('/sync/batch-link-up');
          }}
          onCreated={(id) => {
            sessionStorage.removeItem(cacheKey);
            setCreateOpen(false);
            const nextPath = `/sync/batch-link-up/${encodeURIComponent(id)}/detail?scene=edit`;
            history.replace(nextPath);
            if (String(id) === String(taskId)) {
              void loadTask();
            }
          }}
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-64px)] items-center justify-center bg-[#f8fafc]">
        <Spin size="large" />
      </div>
    );
  }

  if (!editor) {
    return (
      <div className="flex min-h-[calc(100vh-64px)] items-center justify-center bg-[#f8fafc]">
        <Empty
          description="未找到同步任务"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        >
          <Button onClick={() => history.push('/sync/batch-link-up')}>
            返回任务列表
          </Button>
        </Empty>
      </div>
    );
  }

  const mode = modeView[editor.mode];

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#f8fafc]">
      <div className="sticky top-0 z-20 border-b border-[#e4e7ec] bg-white/95 backdrop-blur">
        <div className="flex h-[72px] items-center justify-between px-6">
          <div className="flex min-w-0 items-center gap-4">
            <Button
              type="text"
              icon={<ArrowLeftOutlined />}
              onClick={() => history.push('/sync/batch-link-up')}
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <div className="truncate text-lg font-semibold text-[#101828]">
                  {editor.basic.jobName || '未命名同步任务'}
                </div>
                <Tag className={`!m-0 ${mode.className}`}>{mode.text}</Tag>
              </div>
              <div className="mt-1 max-w-[720px] truncate text-xs text-[#667085]">
                {editor.basic.jobDesc || '暂无任务描述'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {activeStep === 1 && (
              <Button
                type="primary"
                icon={<SaveOutlined />}
                loading={saving}
                onClick={handleSave}
              >
                保存配置
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1480px] px-6 py-6">
        <div className="rounded-xl border border-[#e4e7ec] bg-white px-8 py-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <Steps
            current={activeStep}
            items={editorSteps}
            responsive={false}
            className="mx-auto max-w-[760px]"
          />
        </div>

        <div className="mt-5">
          {activeStep === 0 ? (
            <ConnectionTestStep
              dataSources={dataSources}
              loading={dataSourceLoading}
              sourceId={sourceId}
              targetId={targetId}
              sourceState={sourceState}
              targetState={targetState}
              onSourceChange={(value) => {
                setSourceId(value);
                setSourceState('idle');
              }}
              onTargetChange={(value) => {
                setTargetId(value);
                setTargetState('idle');
              }}
              onTestSource={() => void testConnection('source')}
              onTestTarget={() => void testConnection('target')}
            />
          ) : (
            <SyncTaskConfigStep
              editor={editor}
              dataSources={dataSources}
              onChange={setEditor}
              onBackToConnection={() => setActiveStep(0)}
            />
          )}
        </div>

        <div className="mt-5 flex items-center justify-between rounded-xl border border-[#e4e7ec] bg-white px-5 py-4">
          <div className="flex items-center gap-2 text-xs text-[#667085]">
            <CheckCircleFilled className="text-[#12b76a]" />
            当前阶段仅保存任务定义，不会触发任务执行。
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => history.push('/sync/batch-link-up')}>取消</Button>
            {activeStep === 0 ? (
              <Button
                type="primary"
                loading={saving}
                onClick={handleConnectionNext}
              >
                下一步：任务配置
              </Button>
            ) : (
              <>
                <Button onClick={() => setActiveStep(0)}>上一步</Button>
                <Button
                  type="primary"
                  icon={<SaveOutlined />}
                  loading={saving}
                  onClick={handleSave}
                >
                  保存配置
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      <button
        type="button"
        className="fixed right-0 top-[42%] z-30 flex cursor-pointer flex-col items-center gap-2 rounded-l-lg border border-r-0 border-[#c7d7fe] bg-white px-3 py-4 text-xs font-medium text-[#315efb] shadow-[0_8px_24px_rgba(16,24,40,0.12)] transition hover:bg-[#f5f7ff]"
        onClick={() => setScheduleOpen(true)}
      >
        <CalendarOutlined className="text-base" />
        <span className="[writing-mode:vertical-rl]">调度配置</span>
      </button>

      <Drawer
        open={scheduleOpen}
        width={440}
        title="调度配置"
        placement="right"
        destroyOnClose={false}
        onClose={() => setScheduleOpen(false)}
        extra={
          <Tag className="!m-0 !border-[#c7d7fe] !bg-[#eff4ff] !text-[#315efb]">
            随任务保存
          </Tag>
        }
      >
        <ScheduleConfigContent
          value={editor.schedule}
          onChange={(value) =>
            setEditor((previous) => {
              if (!previous) return previous;
              const schedule =
                typeof value === 'function'
                  ? value(previous.schedule)
                  : value;
              return { ...previous, schedule };
            })
          }
        />
      </Drawer>
    </div>
  );
}

import {
  ArrowLeftOutlined,
  CalendarOutlined,
  SaveOutlined,
} from '@ant-design/icons';
import { history, useLocation, useParams } from '@umijs/max';
import {
  Button,
  Drawer,
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
} from 'react';

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

const modeView = {
  GUIDE_SINGLE: {
    text: '单表同步',
    className:
      '!border-[#b2ccff] !bg-[#eff4ff] !text-[#315efb]',
  },
  GUIDE_MULTI: {
    text: '多表同步',
    className:
      '!border-[#d9d6fe] !bg-[#f4f3ff] !text-[#6938ef]',
  },
} as const;

const getSelectedRecord = (
  records: DataSourceRecord[],
  id: string,
): DataSourceRecord | undefined =>
  records.find(
    (record) => String(record.id) === String(id),
  );

const validateTaskConfig = (
  editor: SyncEditorState,
): string | null => {
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

interface StepTabProps {
  index: number;
  label: string;
  active: boolean;
  completed?: boolean;
  disabled?: boolean;
  onClick: () => void;
}

function StepTab({
  index,
  label,
  active,
  completed = false,
  disabled = false,
  onClick,
}: StepTabProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={[
        'relative flex h-[46px] shrink-0 items-center gap-2 px-1',
        'text-sm font-medium transition-colors duration-200',
        'disabled:cursor-not-allowed disabled:opacity-50',
        active || completed
          ? 'text-[#101828]'
          : 'text-[#667085] hover:text-[#344054]',
      ].join(' ')}
    >
      <span
        className={[
          'flex h-5 w-5 items-center justify-center rounded-full',
          'text-[11px] font-semibold transition-colors duration-200',
          active
            ? 'bg-[#315efb] text-white'
            : completed
              ? 'bg-[#eff4ff] text-[#315efb]'
              : 'bg-[#f2f4f7] text-[#98a2b3]',
        ].join(' ')}
      >
        {index}
      </span>

      <span>{label}</span>

      <span
        className={[
          'absolute inset-x-0 bottom-0 h-[2px]',
          'transition-all duration-200',
          active ? 'bg-[#315efb]' : 'bg-transparent',
        ].join(' ')}
      />
    </button>
  );
}

interface EditorStepNavigationProps {
  activeStep: number;
  saving: boolean;
  onConnectionClick: () => void;
  onTaskClick: () => void;
}

function EditorStepNavigation({
  activeStep,
  saving,
  onConnectionClick,
  onTaskClick,
}: EditorStepNavigationProps) {
  return (
    <nav className="flex items-end gap-8">
      <StepTab
        index={1}
        label="连接测试"
        active={activeStep === 0}
        completed={activeStep > 0}
        onClick={onConnectionClick}
      />

      <StepTab
        index={2}
        label="任务配置"
        active={activeStep === 1}
        disabled={saving}
        onClick={onTaskClick}
      />
    </nav>
  );
}

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

  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [dataSourceLoading, setDataSourceLoading] =
    useState(false);

  const [dataSources, setDataSources] = useState<
    DataSourceRecord[]
  >([]);

  const [sourceId, setSourceId] = useState('');
  const [targetId, setTargetId] = useState('');

  const [sourceState, setSourceState] =
    useState<ConnectionTestState>('idle');

  const [targetState, setTargetState] =
    useState<ConnectionTestState>('idle');

  const [scheduleOpen, setScheduleOpen] = useState(false);

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

      const nextEditor = normalizeEditDetail(
        response.data,
        taskId,
      );

      setEditor(nextEditor);
      setSourceId(
        nextEditor.basic.sourceDataSourceId || '',
      );
      setTargetId(
        nextEditor.basic.targetDataSourceId || '',
      );
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

    void Promise.all([
      loadTask(),
      loadDataSources(),
    ]);
  }, [loadDataSources, loadTask, taskId]);

  const persistEditor = async (
    nextEditor: SyncEditorState,
    successText?: string,
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
        id: extractSavedId(
          response,
          nextEditor.id,
        ),
      };

      setEditor(savedEditor);

      if (successText) {
        message.success(successText);
      }

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
    const id =
      endpoint === 'source' ? sourceId : targetId;

    const setState =
      endpoint === 'source'
        ? setSourceState
        : setTargetState;

    if (!id) {
      message.warning(
        endpoint === 'source'
          ? '请选择来源数据源'
          : '请选择目标数据源',
      );
      return;
    }

    try {
      setState('testing');

      const response =
        await testDataSourceConnection(id);

      if (
        isApiSuccess(response) &&
        response?.data !== false
      ) {
        setState('success');

        message.success(
          endpoint === 'source'
            ? '来源端连接成功'
            : '目标端连接成功',
        );
        return;
      }

      setState('error');

      message.error(
        responseMessage(response, '数据源连接失败'),
      );
    } catch (error: any) {
      setState('error');
      message.error(error?.message || '数据源连接失败');
    }
  };

  const handleConnectionNext = async () => {
    if (!editor) return;

    const source = getSelectedRecord(
      dataSources,
      sourceId,
    );

    const target = getSelectedRecord(
      dataSources,
      targetId,
    );

    if (!source || !target) {
      message.warning('请选择来源端和目标端数据源');
      return;
    }

    if (
      sourceState !== 'success' ||
      targetState !== 'success'
    ) {
      message.warning(
        '请先完成来源端和目标端的连接测试',
      );
      return;
    }

    const nextEditor = applyConnectionSelection(
      editor,
      source,
      target,
    );

    const saved = await persistEditor(
      nextEditor,
      '连接信息已保存',
    );

    if (saved) {
      setActiveStep(1);
    }
  };

  const handleSave = async () => {
    if (!editor) return;

    const error = validateTaskConfig(editor);

    if (error) {
      message.warning(error);
      return;
    }

    await persistEditor(
      editor,
      '任务配置已保存',
    );
  };

  if (!taskId) {
    history.replace('/sync/batch-link-up');
    return null;
  }

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-64px)] items-center justify-center bg-white">
        <Spin size="large" />
      </div>
    );
  }

  if (!editor) {
    return (
      <div className="flex min-h-[calc(100vh-64px)] items-center justify-center bg-white">
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

  const mode = modeView[editor.mode];

  return (
    <div className="min-h-[calc(100vh-64px)] bg-white">
      <main className="mx-auto max-w-[1480px] px-8">
        <header className="border-b border-[#e4e7ec] pt-7">
          <div className="flex items-start justify-between gap-8">
            <div className="flex min-w-0 items-start gap-3">
              <Button
                type="text"
                icon={<ArrowLeftOutlined />}
                className={[
                  '!mt-0.5 !h-9 !w-9 !shrink-0 !rounded-lg',
                  '!text-[#475467] hover:!bg-[#f2f4f7]',
                ].join(' ')}
                onClick={() =>
                  history.push('/sync/batch-link-up')
                }
              />

              <div className="min-w-0">
                <div className="flex min-w-0 items-center gap-3">
                  <h1 className="truncate text-[22px] font-semibold leading-8 text-[#101828]">
                    {editor.basic.jobName ||
                      '未命名同步任务'}
                  </h1>

                  <Tag
                    className={[
                      '!m-0 !rounded-md !px-2',
                      '!text-[11px] !font-medium',
                      mode.className,
                    ].join(' ')}
                  >
                    {mode.text}
                  </Tag>
                </div>

                <div className="mt-1 max-w-[760px] truncate text-sm text-[#667085]">
                  {editor.basic.jobDesc ||
                    '配置数据源连接关系和同步任务参数'}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 flex items-end justify-between gap-6">
            <EditorStepNavigation
              activeStep={activeStep}
              saving={saving}
              onConnectionClick={() => setActiveStep(0)}
              onTaskClick={() => {
                if (activeStep === 1 || saving) {
                  return;
                }

                void handleConnectionNext();
              }}
            />

            <Button
              icon={<CalendarOutlined />}
              className={[
                '!mb-2 !h-9 !rounded-lg',
                '!border-[#d0d5dd] !px-4',
                '!font-medium !text-[#344054]',
                'hover:!border-[#98a2b3]',
                'hover:!text-[#101828]',
              ].join(' ')}
              onClick={() => setScheduleOpen(true)}
            >
              调度配置
            </Button>
          </div>
        </header>

        <section className="min-h-[calc(100vh-270px)] py-6">
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
              onTestSource={() =>
                void testConnection('source')
              }
              onTestTarget={() =>
                void testConnection('target')
              }
            />
          ) : (
            <SyncTaskConfigStep
              editor={editor}
              dataSources={dataSources}
              onChange={setEditor}
              onBackToConnection={() =>
                setActiveStep(0)
              }
            />
          )}
        </section>

        <footer
          className={[
            'sticky bottom-0 z-20',
            '-mx-8 flex flex-wrap items-center justify-end gap-3',
            'border-t border-[#e4e7ec]',
            'bg-white/95 px-8 py-4 backdrop-blur',
          ].join(' ')}
        >
          <Button
            className={[
              '!h-9 !rounded-lg',
              '!border-[#d0d5dd] !px-4',
              '!font-medium !text-[#344054]',
              'hover:!border-[#98a2b3]',
              'hover:!text-[#101828]',
            ].join(' ')}
            onClick={() =>
              history.push('/sync/batch-link-up')
            }
          >
            取消
          </Button>

          {activeStep === 0 ? (
            <Button
              type="primary"
              loading={saving}
              className={[
                '!h-9 !rounded-lg',
                '!border-[#315efb] !bg-[#315efb]',
                '!px-5 !font-medium',
                'hover:!border-[#244edb]',
                'hover:!bg-[#244edb]',
              ].join(' ')}
              onClick={handleConnectionNext}
            >
              下一步：任务配置
            </Button>
          ) : (
            <>
              <Button
                className={[
                  '!h-9 !rounded-lg',
                  '!border-[#d0d5dd] !px-4',
                  '!font-medium !text-[#344054]',
                  'hover:!border-[#98a2b3]',
                  'hover:!text-[#101828]',
                ].join(' ')}
                onClick={() => setActiveStep(0)}
              >
                上一步
              </Button>

              <Button
                type="primary"
                icon={<SaveOutlined />}
                loading={saving}
                className={[
                  '!h-9 !rounded-lg',
                  '!border-[#315efb] !bg-[#315efb]',
                  '!px-5 !font-medium',
                  'hover:!border-[#244edb]',
                  'hover:!bg-[#244edb]',
                ].join(' ')}
                onClick={handleSave}
              >
                保存配置
              </Button>
            </>
          )}
        </footer>
      </main>

      <Drawer
        open={scheduleOpen}
        width={440}
        title="调度配置"
        placement="right"
        destroyOnClose={false}
        onClose={() => setScheduleOpen(false)}
        extra={
          <Tag className="!m-0 !rounded-md !border-[#c7d7fe] !bg-[#eff4ff] !text-[#315efb]">
            随任务保存
          </Tag>
        }
      >
        <ScheduleConfigContent
          value={editor.schedule}
          onChange={(value) =>
            setEditor((previous) => {
              if (!previous) {
                return previous;
              }

              const schedule =
                typeof value === 'function'
                  ? value(previous.schedule)
                  : value;

              return {
                ...previous,
                schedule,
              };
            })
          }
        />
      </Drawer>
    </div>
  );
}

import { useParams } from '@umijs/max';
import { Alert, message } from 'antd';
import { useMemo, useState } from 'react';
import ConfigShell from '../components/ConfigShell';
import {
  PipelineBasicPanel,
  PipelineRuntimePanel,
  SourceSinkPanel,
} from '../components/CommonConfigPanels';
import { TransformRuleEditor, UdfEditor } from '../components/TransformEditor';
import {
  createDefaultSingleDraft,
  formatUpdatedAt,
  loadRealtimeDraft,
  saveRealtimeDraft,
  saveRealtimeTask,
} from '../data';
import type { SingleTableDraft } from '../types';
import { buildSingleTableYaml } from '../yaml';

const SingleConfigPage = () => {
  const { id = `rt-${Date.now()}` } = useParams<{ id: string }>();
  const [draft, setDraft] = useState<SingleTableDraft>(() =>
    loadRealtimeDraft<SingleTableDraft>(id) || createDefaultSingleDraft(id),
  );
  const [activeStep, setActiveStep] = useState('basic');
  const [saving, setSaving] = useState(false);

  const yaml = useMemo(() => buildSingleTableYaml(draft), [draft]);
  const selectedColumns = draft.transform.columns.filter((column) => column.selected);

  const steps = [
    {
      key: 'basic',
      title: '基本信息',
      description: '任务名称与运行版本',
      complete: Boolean(draft.pipeline.name.trim()),
    },
    {
      key: 'endpoint',
      title: '来源与目标',
      description: '单表采集与写入位置',
      complete: Boolean(
        draft.source.dataSourceId &&
          draft.source.database &&
          draft.source.table &&
          draft.sink.dataSourceId &&
          draft.sink.database &&
          draft.sink.table,
      ),
    },
    {
      key: 'transform',
      title: '字段与转换',
      description: '投影、过滤、键和 UDF',
      complete: Boolean(
        selectedColumns.length &&
          selectedColumns.every((column) => column.targetName.trim() && column.expression.trim()),
      ),
    },
    {
      key: 'runtime',
      title: '运行参数',
      description: '并行度与 Checkpoint',
      complete: draft.pipeline.parallelism > 0 && draft.pipeline.checkpointInterval >= 10,
    },
  ];

  const save = async () => {
    const firstIncomplete = steps.find((step) => !step.complete);
    if (firstIncomplete) {
      setActiveStep(firstIncomplete.key);
      message.warning(`请先完成“${firstIncomplete.title}”配置`);
      return;
    }

    setSaving(true);
    try {
      saveRealtimeDraft(id, draft);
      saveRealtimeTask({
        id,
        name: draft.pipeline.name,
        description: draft.pipeline.description,
        mode: 'SINGLE_TABLE',
        status: 'DRAFT',
        sourceType: `${draft.source.type.toUpperCase()} CDC`,
        sourceSummary: [draft.source.database, draft.source.schema, draft.source.table]
          .filter(Boolean)
          .join('.'),
        sinkType: draft.sink.type.toUpperCase(),
        sinkSummary: [draft.sink.database, draft.sink.schema, draft.sink.table]
          .filter(Boolean)
          .join('.'),
        flinkVersion: draft.pipeline.flinkVersion,
        cdcVersion: draft.pipeline.cdcVersion,
        updatedAt: formatUpdatedAt(),
        yaml,
      });
      message.success('单表实时同步草稿已保存');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ConfigShell
      taskId={id}
      mode="SINGLE_TABLE"
      title={draft.pipeline.name || '未命名单表同步任务'}
      description={draft.pipeline.description}
      steps={steps}
      activeStep={activeStep}
      onStepChange={setActiveStep}
      yaml={yaml}
      saving={saving}
      onSave={() => void save()}
    >
      {activeStep === 'basic' && (
        <PipelineBasicPanel
          value={draft.pipeline}
          onChange={(pipeline) => setDraft((current) => ({ ...current, pipeline }))}
        />
      )}

      {activeStep === 'endpoint' && (
        <div className="space-y-4">
          <Alert
            type="info"
            showIcon
            message="当前版本不要求在配置过程中执行连接测试"
            description="这里只选择资源管理中已维护的数据源。连接检查与 Connector 参数校验将在后端提交任务时统一处理。"
            className="!rounded-[9px] !border-[#c7d7fe] !bg-[#f5f8ff] [&_.ant-alert-message]:!text-[12px] [&_.ant-alert-description]:!text-[11px]"
          />
          <SourceSinkPanel
            source={draft.source}
            sink={draft.sink}
            onSourceChange={(source) => {
              const sourceTable = [source.database, source.schema, source.table]
                .filter(Boolean)
                .join('.');
              setDraft((current) => ({
                ...current,
                source,
                transform: { ...current.transform, sourceTable },
              }));
            }}
            onSinkChange={(sink) => setDraft((current) => ({ ...current, sink }))}
          />
        </div>
      )}

      {activeStep === 'transform' && (
        <div className="space-y-4">
          <TransformRuleEditor
            value={draft.transform}
            onChange={(transform) => setDraft((current) => ({ ...current, transform }))}
          />
          <UdfEditor
            value={draft.udfs}
            onChange={(udfs) => setDraft((current) => ({ ...current, udfs }))}
          />
        </div>
      )}

      {activeStep === 'runtime' && (
        <PipelineRuntimePanel
          value={draft.pipeline}
          onChange={(pipeline) => setDraft((current) => ({ ...current, pipeline }))}
        />
      )}
    </ConfigShell>
  );
};

export default SingleConfigPage;

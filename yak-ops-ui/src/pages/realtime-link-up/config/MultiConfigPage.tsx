import { Plus, Trash2 } from 'lucide-react';
import { useParams } from '@umijs/max';
import { Alert, Button, Collapse, Empty, Input, message, Select, Tag } from 'antd';
import { useMemo, useState } from 'react';
import ConfigShell from '../components/ConfigShell';
import {
  PipelineBasicPanel,
  PipelineRuntimePanel,
  SourceSinkPanel,
} from '../components/CommonConfigPanels';
import { TransformRuleEditor, UdfEditor } from '../components/TransformEditor';
import {
  createDefaultMultiDraft,
  createDefaultTransform,
  formatUpdatedAt,
  loadRealtimeDraft,
  sampleTables,
  saveRealtimeDraft,
  saveRealtimeTask,
} from '../data';
import type { MultiTableDraft, TransformRule } from '../types';
import { buildMultiTableYaml } from '../yaml';

const createId = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const MultiConfigPage = () => {
  const { id = `rt-${Date.now()}` } = useParams<{ id: string }>();
  const [draft, setDraft] = useState<MultiTableDraft>(() =>
    loadRealtimeDraft<MultiTableDraft>(id) || createDefaultMultiDraft(id),
  );
  const [activeStep, setActiveStep] = useState('basic');
  const [saving, setSaving] = useState(false);

  const yaml = useMemo(() => buildMultiTableYaml(draft), [draft]);

  const steps = [
    {
      key: 'basic',
      title: '基本信息',
      description: '任务名称与运行版本',
      complete: Boolean(draft.pipeline.name.trim()),
    },
    {
      key: 'scope',
      title: '同步范围',
      description: '来源规则、目标端和表清单',
      complete: Boolean(
        draft.source.dataSourceId &&
          draft.source.database &&
          (draft.source.tablePattern.trim() || draft.source.tables.length) &&
          draft.sink.dataSourceId &&
          draft.sink.database,
      ),
    },
    {
      key: 'route',
      title: '表路由',
      description: '来源表映射到目标表',
      complete: Boolean(
        draft.routes.length &&
          draft.routes.every((route) => route.sourceTable.trim() && route.sinkTable.trim()),
      ),
    },
    {
      key: 'transform',
      title: '转换规则',
      description: '每张表独立配置 Transform',
      complete: Boolean(
        draft.transforms.length &&
          draft.transforms.every(
            (rule) =>
              rule.sourceTable.trim() &&
              rule.columns.some(
                (column) => column.selected && column.targetName.trim() && column.expression.trim(),
              ),
          ),
      ),
    },
    {
      key: 'udf',
      title: 'UDF',
      description: '注册自定义转换函数',
      complete: draft.udfs.every((udf) => udf.name.trim() && udf.classpath.trim()),
    },
    {
      key: 'runtime',
      title: '运行参数',
      description: '并行度与 Checkpoint',
      complete: draft.pipeline.parallelism > 0 && draft.pipeline.checkpointInterval >= 10,
    },
  ];

  const updateSelectedTables = (tables: string[]) => {
    setDraft((current) => {
      const transformMap = new Map(current.transforms.map((rule) => [rule.sourceTable, rule]));
      const routeMap = new Map(current.routes.map((route) => [route.sourceTable, route]));
      const transforms = tables.map(
        (table) => transformMap.get(table) || createDefaultTransform(table),
      );
      const routes = tables.map((table) => {
        const existing = routeMap.get(table);
        if (existing) return existing;
        const tableName = table.split('.').pop() || table;
        return {
          id: createId('route'),
          sourceTable: table,
          sinkTable: `${current.sink.database}.${current.sink.tablePrefix}${tableName}${current.sink.tableSuffix}`,
          description: '',
        };
      });
      return {
        ...current,
        source: { ...current.source, tables },
        transforms,
        routes,
      };
    });
  };

  const updateTransform = (id: string, transform: TransformRule) => {
    setDraft((current) => ({
      ...current,
      transforms: current.transforms.map((item) => (item.id === id ? transform : item)),
    }));
  };

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
        mode: 'MULTI_TABLE',
        status: 'DRAFT',
        sourceType: `${draft.source.type.toUpperCase()} CDC`,
        sourceSummary: `${draft.source.tablePattern || draft.source.database}（${draft.source.tables.length} 张表）`,
        sinkType: draft.sink.type.toUpperCase(),
        sinkSummary: `${draft.sink.database}.${draft.sink.tablePrefix || ''}*${draft.sink.tableSuffix || ''}`,
        flinkVersion: draft.pipeline.flinkVersion,
        cdcVersion: draft.pipeline.cdcVersion,
        updatedAt: formatUpdatedAt(),
        yaml,
      });
      message.success('多表实时同步草稿已保存');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ConfigShell
      taskId={id}
      mode="MULTI_TABLE"
      title={draft.pipeline.name || '未命名多表同步任务'}
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

      {activeStep === 'scope' && (
        <div className="space-y-4">
          <Alert
            type="info"
            showIcon
            message="多表模式支持表名正则与明确表清单"
            description="当前页面不执行连接测试。表清单暂使用前端示例元数据，后续接入后端后由数据源元数据接口加载。"
            className="!rounded-[9px] !border-[#c7d7fe] !bg-[#f5f8ff] [&_.ant-alert-message]:!text-[12px] [&_.ant-alert-description]:!text-[11px]"
          />
          <SourceSinkPanel
            multi
            source={draft.source}
            sink={draft.sink}
            onSourceChange={(source) => setDraft((current) => ({ ...current, source }))}
            onSinkChange={(sink) => setDraft((current) => ({ ...current, sink }))}
          />

          <section className="overflow-hidden rounded-[10px] border border-black/[0.07] bg-white">
            <div className="border-b border-black/[0.055] px-5 py-4">
              <div className="text-[13px] font-semibold text-[#161823]">已选择同步表</div>
              <div className="mt-1 text-[11px] text-[rgba(22,24,35,0.46)]">
                选择后会自动生成对应的 Transform 和 Route 草稿，可在后续步骤逐条调整。
              </div>
            </div>
            <div className="p-5">
              <Select
                mode="multiple"
                allowClear
                value={draft.source.tables}
                options={sampleTables.map((table) => ({ label: table, value: table }))}
                onChange={updateSelectedTables}
                placeholder="选择需要同步的表"
                className="w-full [&_.ant-select-selector]:!min-h-11 [&_.ant-select-selector]:!rounded-[8px] [&_.ant-select-selector]:!border-black/[0.075]"
              />
              <div className="mt-3 flex flex-wrap gap-2">
                {draft.source.tables.map((table) => (
                  <Tag
                    key={table}
                    className="!m-0 !rounded-full !border-black/[0.07] !bg-[#f7f8fa] !px-2.5 !py-1 !font-mono !text-[10px] !text-[#343741]"
                  >
                    {table}
                  </Tag>
                ))}
              </div>
            </div>
          </section>
        </div>
      )}

      {activeStep === 'route' && (
        <section className="overflow-hidden rounded-[10px] border border-black/[0.07] bg-white">
          <div className="flex items-start justify-between gap-4 border-b border-black/[0.055] px-5 py-4">
            <div>
              <div className="text-[13px] font-semibold text-[#161823]">Route 表路由</div>
              <div className="mt-1 text-[11px] text-[rgba(22,24,35,0.46)]">
                定义来源表到目标表的映射。规则顺序会保持在最终 Pipeline YAML 中。
              </div>
            </div>
            <Button
              icon={<Plus size={14} />}
              onClick={() =>
                setDraft((current) => ({
                  ...current,
                  routes: [
                    ...current.routes,
                    { id: createId('route'), sourceTable: '', sinkTable: '', description: '' },
                  ],
                }))
              }
              className="!h-8 !rounded-[7px] !border-black/[0.08] !text-[11px]"
            >
              新增路由
            </Button>
          </div>

          {draft.routes.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[920px] border-collapse">
                <thead>
                  <tr className="border-b border-black/[0.055] bg-[#fafafa] text-left text-[10px] font-semibold text-[rgba(22,24,35,0.52)]">
                    <th className="w-[36%] px-5 py-3">来源表规则</th>
                    <th className="w-[36%] px-3 py-3">目标表</th>
                    <th className="px-3 py-3">说明</th>
                    <th className="w-[60px] px-3 py-3">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {draft.routes.map((route) => (
                    <tr key={route.id} className="border-b border-black/[0.045] last:border-b-0">
                      <td className="px-5 py-3">
                        <Input
                          value={route.sourceTable}
                          onChange={(event) =>
                            setDraft((current) => ({
                              ...current,
                              routes: current.routes.map((item) =>
                                item.id === route.id
                                  ? { ...item, sourceTable: event.target.value }
                                  : item,
                              ),
                            }))
                          }
                          className="!h-9 !rounded-[7px] !border-black/[0.075] !font-mono !text-[11px]"
                        />
                      </td>
                      <td className="px-3 py-3">
                        <Input
                          value={route.sinkTable}
                          onChange={(event) =>
                            setDraft((current) => ({
                              ...current,
                              routes: current.routes.map((item) =>
                                item.id === route.id
                                  ? { ...item, sinkTable: event.target.value }
                                  : item,
                              ),
                            }))
                          }
                          className="!h-9 !rounded-[7px] !border-black/[0.075] !font-mono !text-[11px]"
                        />
                      </td>
                      <td className="px-3 py-3">
                        <Input
                          value={route.description}
                          onChange={(event) =>
                            setDraft((current) => ({
                              ...current,
                              routes: current.routes.map((item) =>
                                item.id === route.id
                                  ? { ...item, description: event.target.value }
                                  : item,
                              ),
                            }))
                          }
                          placeholder="可选"
                          className="!h-9 !rounded-[7px] !border-black/[0.075] !text-[11px]"
                        />
                      </td>
                      <td className="px-3 py-3">
                        <button
                          type="button"
                          onClick={() =>
                            setDraft((current) => ({
                              ...current,
                              routes: current.routes.filter((item) => item.id !== route.id),
                            }))
                          }
                          className="flex h-8 w-8 items-center justify-center rounded-[6px] border-0 bg-transparent text-[rgba(22,24,35,0.35)] hover:bg-[#fff1f2] hover:text-[#d92d20]"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={<span className="text-[11px] text-[rgba(22,24,35,0.42)]">暂未配置路由规则</span>}
            />
          )}
        </section>
      )}

      {activeStep === 'transform' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-[10px] border border-black/[0.07] bg-white px-5 py-4">
            <div>
              <div className="text-[13px] font-semibold text-[#161823]">Transform 规则</div>
              <div className="mt-1 text-[11px] text-[rgba(22,24,35,0.46)]">
                多条规则按顺序匹配，同一张表只应用第一条命中的 Transform。
              </div>
            </div>
            <Button
              icon={<Plus size={14} />}
              onClick={() =>
                setDraft((current) => ({
                  ...current,
                  transforms: [...current.transforms, createDefaultTransform('')],
                }))
              }
              className="!h-8 !rounded-[7px] !border-black/[0.08] !text-[11px]"
            >
              新增 Transform
            </Button>
          </div>

          <Collapse
            defaultActiveKey={draft.transforms[0]?.id ? [draft.transforms[0].id] : []}
            className="!border-0 !bg-transparent [&_.ant-collapse-item]:!mb-4 [&_.ant-collapse-item]:!overflow-hidden [&_.ant-collapse-item]:!rounded-[10px] [&_.ant-collapse-item]:!border [&_.ant-collapse-item]:!border-black/[0.07] [&_.ant-collapse-header]:!items-center [&_.ant-collapse-header]:!bg-white [&_.ant-collapse-header]:!px-5 [&_.ant-collapse-header]:!py-4 [&_.ant-collapse-content-box]:!bg-[#f7f8fa] [&_.ant-collapse-content-box]:!p-4"
            items={draft.transforms.map((rule, index) => ({
              key: rule.id,
              label: (
                <div className="flex items-center gap-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#f1f3f6] text-[10px] font-semibold text-[#343741]">
                    {index + 1}
                  </span>
                  <div>
                    <div className="font-mono text-[12px] font-semibold text-[#252832]">
                      {rule.sourceTable || '未配置来源表规则'}
                    </div>
                    <div className="mt-0.5 text-[10px] text-[rgba(22,24,35,0.42)]">
                      {rule.columns.filter((column) => column.selected).length} 个输出字段
                      {rule.filter ? ' · 已配置行过滤' : ''}
                    </div>
                  </div>
                </div>
              ),
              extra: (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    setDraft((current) => ({
                      ...current,
                      transforms: current.transforms.filter((item) => item.id !== rule.id),
                    }));
                  }}
                  className="flex h-8 w-8 items-center justify-center rounded-[6px] border-0 bg-transparent text-[rgba(22,24,35,0.35)] hover:bg-[#fff1f2] hover:text-[#d92d20]"
                >
                  <Trash2 size={14} />
                </button>
              ),
              children: (
                <div className="space-y-4">
                  <section className="rounded-[9px] border border-black/[0.07] bg-white p-4">
                    <div className="grid grid-cols-2 gap-4 max-lg:grid-cols-1">
                      <label>
                        <span className="mb-2 block text-[11px] font-semibold text-[#343741]">
                          来源表规则 <span className="text-[#d92d20]">*</span>
                        </span>
                        <Input
                          value={rule.sourceTable}
                          onChange={(event) =>
                            updateTransform(rule.id, {
                              ...rule,
                              sourceTable: event.target.value,
                            })
                          }
                          placeholder="trade_db.order_main 或正则"
                          className="!h-9 !rounded-[7px] !border-black/[0.075] !font-mono !text-[11px]"
                        />
                      </label>
                      <label>
                        <span className="mb-2 block text-[11px] font-semibold text-[#343741]">
                          规则说明
                        </span>
                        <Input
                          value={rule.description}
                          onChange={(event) =>
                            updateTransform(rule.id, {
                              ...rule,
                              description: event.target.value,
                            })
                          }
                          placeholder="可选"
                          className="!h-9 !rounded-[7px] !border-black/[0.075] !text-[11px]"
                        />
                      </label>
                    </div>
                  </section>
                  <TransformRuleEditor
                    compact
                    value={rule}
                    onChange={(next) => updateTransform(rule.id, next)}
                  />
                </div>
              ),
            }))}
          />
        </div>
      )}

      {activeStep === 'udf' && (
        <UdfEditor
          value={draft.udfs}
          onChange={(udfs) => setDraft((current) => ({ ...current, udfs }))}
        />
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

export default MultiConfigPage;

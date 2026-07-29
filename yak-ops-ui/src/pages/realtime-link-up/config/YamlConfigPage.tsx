import { FileCode2, FileUp, ShieldCheck } from 'lucide-react';
import { useParams } from '@umijs/max';
import { Alert, Input, message, Select, Tag, Upload } from 'antd';
import { useMemo, useState } from 'react';
import ConfigShell from '../components/ConfigShell';
import {
  formatUpdatedAt,
  loadRealtimeDraft,
  saveRealtimeDraft,
  saveRealtimeTask,
} from '../data';
import type { CustomYamlDraft } from '../types';
import { validateCustomYaml } from '../yaml';

const { TextArea } = Input;
const { Dragger } = Upload;

const DEFAULT_YAML = `source:
  type: mysql
  hostname: localhost
  port: 3306
  username: root
  password: ""
  tables: trade_db.order_main
  server-id: 5400-5404
  server-time-zone: Asia/Shanghai

sink:
  type: doris
  fenodes: 127.0.0.1:8030
  username: root
  password: ""

transform:
  - source-table: trade_db.order_main
    projection: "id, order_no, UPPER(product_name) AS product_name, amount"
    filter: "status = 'PAID' AND amount > 0"
    primary-keys: id
    partition-keys: created_at
    table-options: "comment=order realtime table"

route:
  - source-table: trade_db.order_main
    sink-table: ods_db.ods_order_main

pipeline:
  name: Order Realtime Pipeline
  parallelism: 2
  schema.change.behavior: evolve
  local-time-zone: Asia/Shanghai
  user-defined-function:
    - name: format_order
      classpath: com.example.cdc.FormatOrderFunction
      options:
        prefix: "ORDER-"
`;

const createDefaultDraft = (taskId: string): CustomYamlDraft => ({
  taskId,
  mode: 'CUSTOM_YAML',
  name: '自定义 Flink CDC Pipeline',
  description: '',
  flinkVersion: '2.2.1',
  cdcVersion: '3.6.0',
  yaml: DEFAULT_YAML,
});

const YamlConfigPage = () => {
  const { id = `rt-${Date.now()}` } = useParams<{ id: string }>();
  const [draft, setDraft] = useState<CustomYamlDraft>(() =>
    loadRealtimeDraft<CustomYamlDraft>(id) || createDefaultDraft(id),
  );
  const [activeStep, setActiveStep] = useState('metadata');
  const [saving, setSaving] = useState(false);
  const validation = useMemo(() => validateCustomYaml(draft.yaml), [draft.yaml]);

  const steps = [
    {
      key: 'metadata',
      title: '任务信息',
      description: '名称与运行版本',
      complete: Boolean(draft.name.trim()),
    },
    {
      key: 'yaml',
      title: 'Pipeline YAML',
      description: '编辑或导入 YAML 文件',
      complete: validation.valid,
    },
    {
      key: 'review',
      title: '配置检查',
      description: '检查必要区块与版本',
      complete: Boolean(draft.name.trim() && validation.valid),
    },
  ];

  const importFile = async (file: File) => {
    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith('.yaml') && !fileName.endsWith('.yml')) {
      message.error('请选择 .yaml 或 .yml 文件');
      return Upload.LIST_IGNORE;
    }
    try {
      const yaml = await file.text();
      setDraft((current) => ({ ...current, yaml }));
      setActiveStep('yaml');
      message.success('YAML 文件已导入');
    } catch {
      message.error('读取 YAML 文件失败');
    }
    return false;
  };

  const save = async () => {
    if (!draft.name.trim()) {
      setActiveStep('metadata');
      message.warning('请输入任务名称');
      return;
    }
    if (!validation.valid) {
      setActiveStep('yaml');
      message.warning(`YAML 缺少必要区块：${validation.missing.join('、')}`);
      return;
    }

    setSaving(true);
    try {
      saveRealtimeDraft(id, draft);
      saveRealtimeTask({
        id,
        name: draft.name,
        description: draft.description,
        mode: 'CUSTOM_YAML',
        status: 'DRAFT',
        sourceType: 'YAML Pipeline',
        sourceSummary: '由 YAML source 区块定义',
        sinkType: 'YAML Pipeline',
        sinkSummary: '由 YAML sink 区块定义',
        flinkVersion: draft.flinkVersion,
        cdcVersion: draft.cdcVersion,
        updatedAt: formatUpdatedAt(),
        yaml: draft.yaml,
      });
      message.success('自定义 YAML 草稿已保存');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ConfigShell
      taskId={id}
      mode="CUSTOM_YAML"
      title={draft.name || '未命名 YAML Pipeline'}
      description={draft.description}
      steps={steps}
      activeStep={activeStep}
      onStepChange={setActiveStep}
      yaml={draft.yaml}
      saving={saving}
      onSave={() => void save()}
    >
      {activeStep === 'metadata' && (
        <section className="overflow-hidden rounded-[10px] border border-black/[0.07] bg-white">
          <div className="flex items-start gap-3 border-b border-black/[0.055] px-5 py-4">
            <span className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-[8px] bg-[#fff5e7] text-[#b54708]">
              <FileCode2 size={17} strokeWidth={1.8} />
            </span>
            <div>
              <div className="text-[13px] font-semibold text-[#161823]">自定义 Pipeline 信息</div>
              <div className="mt-1 text-[11px] text-[rgba(22,24,35,0.46)]">
                YAML 模式完全保留用户输入，前端只维护任务元数据和基础结构检查。
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-5 p-5 max-lg:grid-cols-1">
            <label className="block">
              <span className="mb-2 block text-[11px] font-semibold text-[#343741]">
                任务名称 <span className="text-[#d92d20]">*</span>
              </span>
              <Input
                value={draft.name}
                onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
                className="!h-10 !rounded-[7px] !border-black/[0.075] !text-[12px]"
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label>
                <span className="mb-2 block text-[11px] font-semibold text-[#343741]">Flink 版本</span>
                <Select
                  value={draft.flinkVersion}
                  options={[
                    { label: 'Flink 2.2.1', value: '2.2.1' },
                    { label: 'Flink 2.2.0', value: '2.2.0' },
                    { label: 'Flink 1.20.2', value: '1.20.2' },
                  ]}
                  onChange={(flinkVersion) =>
                    setDraft((current) => ({ ...current, flinkVersion }))
                  }
                  className="w-full [&_.ant-select-selector]:!h-10 [&_.ant-select-selector]:!rounded-[7px] [&_.ant-select-selector]:!border-black/[0.075] [&_.ant-select-selection-item]:!text-[11px] [&_.ant-select-selection-item]:!leading-[38px]"
                />
              </label>
              <label>
                <span className="mb-2 block text-[11px] font-semibold text-[#343741]">CDC 版本</span>
                <Select
                  value={draft.cdcVersion}
                  options={[
                    { label: 'CDC 3.6.0', value: '3.6.0' },
                    { label: 'CDC 3.5.0', value: '3.5.0' },
                  ]}
                  onChange={(cdcVersion) =>
                    setDraft((current) => ({ ...current, cdcVersion }))
                  }
                  className="w-full [&_.ant-select-selector]:!h-10 [&_.ant-select-selector]:!rounded-[7px] [&_.ant-select-selector]:!border-black/[0.075] [&_.ant-select-selection-item]:!text-[11px] [&_.ant-select-selection-item]:!leading-[38px]"
                />
              </label>
            </div>
            <div className="col-span-2 max-lg:col-span-1">
              <span className="mb-2 block text-[11px] font-semibold text-[#343741]">任务描述</span>
              <TextArea
                value={draft.description}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, description: event.target.value }))
                }
                autoSize={{ minRows: 3, maxRows: 5 }}
                placeholder="说明 YAML Pipeline 的用途和维护信息"
                className="!rounded-[7px] !border-black/[0.075] !text-[12px]"
              />
            </div>
          </div>
        </section>
      )}

      {activeStep === 'yaml' && (
        <div className="space-y-4">
          <Dragger
            accept=".yaml,.yml,text/yaml,application/x-yaml"
            maxCount={1}
            showUploadList={false}
            beforeUpload={importFile}
            className="!rounded-[10px] !border-black/[0.08] !bg-white [&_.ant-upload]:!py-5"
          >
            <div className="flex items-center justify-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-[8px] bg-[#fff5e7] text-[#b54708]">
                <FileUp size={18} strokeWidth={1.8} />
              </span>
              <div className="text-left">
                <div className="text-[12px] font-semibold text-[#343741]">导入 YAML 文件</div>
                <div className="mt-0.5 text-[10px] text-[rgba(22,24,35,0.42)]">
                  点击或拖入 .yaml / .yml 文件，导入后仍可继续编辑。
                </div>
              </div>
            </div>
          </Dragger>

          <section className="overflow-hidden rounded-[10px] border border-black/[0.07] bg-white">
            <div className="flex items-center justify-between border-b border-black/[0.055] px-5 py-3.5">
              <div>
                <div className="text-[13px] font-semibold text-[#161823]">Pipeline YAML</div>
                <div className="mt-1 text-[10px] text-[rgba(22,24,35,0.42)]">
                  必须包含 source、sink 和 pipeline 区块；transform 与 route 为可选区块。
                </div>
              </div>
              <div className="flex items-center gap-2">
                {['source', 'sink', 'transform', 'route', 'pipeline'].map((section) => {
                  const exists = new RegExp(`^${section}:`, 'm').test(draft.yaml);
                  return (
                    <Tag
                      key={section}
                      className={[
                        '!m-0 !rounded-full !px-2 !font-mono !text-[9px]',
                        exists
                          ? '!border-[#b7e4cf] !bg-[#edf9f3] !text-[#16845b]'
                          : '!border-black/[0.08] !bg-[#f7f8fa] !text-[rgba(22,24,35,0.40)]',
                      ].join(' ')}
                    >
                      {section}
                    </Tag>
                  );
                })}
              </div>
            </div>
            <TextArea
              value={draft.yaml}
              spellCheck={false}
              onChange={(event) =>
                setDraft((current) => ({ ...current, yaml: event.target.value }))
              }
              className="!min-h-[620px] !resize-y !rounded-none !border-0 !bg-[#101318] !p-5 !font-mono !text-[12px] !leading-6 !text-[#d7dce2] !shadow-none focus:!shadow-none"
            />
          </section>
        </div>
      )}

      {activeStep === 'review' && (
        <div className="space-y-4">
          <Alert
            type={validation.valid ? 'success' : 'error'}
            showIcon
            message={validation.valid ? 'YAML 必要区块检查通过' : 'YAML 配置不完整'}
            description={
              validation.valid
                ? '已检测到 source、sink 和 pipeline。更完整的 Connector 参数、表达式和 UDF 校验将在后端接入后执行。'
                : `当前缺少：${validation.missing.join('、')}`
            }
            className="!rounded-[9px] [&_.ant-alert-message]:!text-[12px] [&_.ant-alert-description]:!text-[11px]"
          />

          <section className="overflow-hidden rounded-[10px] border border-black/[0.07] bg-white">
            <div className="flex items-start gap-3 border-b border-black/[0.055] px-5 py-4">
              <span className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-[8px] bg-[#edf9f3] text-[#16845b]">
                <ShieldCheck size={17} strokeWidth={1.8} />
              </span>
              <div>
                <div className="text-[13px] font-semibold text-[#161823]">保存内容摘要</div>
                <div className="mt-1 text-[11px] text-[rgba(22,24,35,0.46)]">
                  保存后会在实时同步列表中生成草稿记录。
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-x-8 gap-y-5 p-5 text-[11px] max-lg:grid-cols-1">
              <div>
                <div className="text-[rgba(22,24,35,0.42)]">任务名称</div>
                <div className="mt-1 font-semibold text-[#343741]">{draft.name || '未填写'}</div>
              </div>
              <div>
                <div className="text-[rgba(22,24,35,0.42)]">运行版本</div>
                <div className="mt-1 font-semibold text-[#343741]">
                  Flink {draft.flinkVersion} / CDC {draft.cdcVersion}
                </div>
              </div>
              <div>
                <div className="text-[rgba(22,24,35,0.42)]">YAML 行数</div>
                <div className="mt-1 font-semibold text-[#343741]">
                  {draft.yaml.split('\n').length} 行
                </div>
              </div>
              <div>
                <div className="text-[rgba(22,24,35,0.42)]">必要区块</div>
                <div className="mt-1 font-semibold text-[#343741]">
                  {validation.valid ? '完整' : `缺少 ${validation.missing.length} 项`}
                </div>
              </div>
            </div>
          </section>
        </div>
      )}
    </ConfigShell>
  );
};

export default YamlConfigPage;

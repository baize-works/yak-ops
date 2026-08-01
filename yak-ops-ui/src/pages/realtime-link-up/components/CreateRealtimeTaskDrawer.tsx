import {
  DatabaseOutlined,
  FileTextOutlined,
  TableOutlined,
} from '@ant-design/icons';
import { Button, Drawer, Form, Input, Radio, message } from 'antd';
import { useEffect, useState, type ReactNode } from 'react';

import {
  createDefaultMultiDraft,
  createDefaultSingleDraft,
  createTaskId,
  formatUpdatedAt,
  saveRealtimeDraft,
  saveRealtimeTask,
} from '../data';
import type {
  CustomYamlDraft,
  RealtimeTaskMode,
} from '../types';

interface CreateRealtimeTaskDrawerProps {
  open: boolean;
  onCancel: () => void;
  onCreated: (taskId: string, mode: RealtimeTaskMode) => void;
}

interface CreateRealtimeTaskValues {
  name: string;
  description?: string;
  mode: RealtimeTaskMode;
}

const modeOptions: Array<{
  value: RealtimeTaskMode;
  title: string;
  description: string;
  icon: ReactNode;
}> = [
  {
    value: 'SINGLE_TABLE',
    title: '单表同步',
    description: '配置一个来源表到一个目标表的实时同步链路',
    icon: <TableOutlined />,
  },
  {
    value: 'MULTI_TABLE',
    title: '多表同步',
    description: '配置整库、多表匹配、路由和转换规则',
    icon: <DatabaseOutlined />,
  },
  {
    value: 'CUSTOM_YAML',
    title: '自定义 YAML',
    description: '直接维护 Flink CDC Pipeline YAML 配置',
    icon: <FileTextOutlined />,
  },
];

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

pipeline:
  name: Realtime Pipeline
  parallelism: 2
  schema.change.behavior: evolve
  local-time-zone: Asia/Shanghai
`;

const CreateRealtimeTaskDrawer = ({
  open,
  onCancel,
  onCreated,
}: CreateRealtimeTaskDrawerProps) => {
  const [form] = Form.useForm<CreateRealtimeTaskValues>();
  const [submitting, setSubmitting] = useState(false);
  const selectedMode = Form.useWatch('mode', form);

  useEffect(() => {
    if (!open) return;

    form.setFieldsValue({
      name: '',
      description: '',
      mode: 'SINGLE_TABLE',
    });
  }, [form, open]);

  const handleSubmit = async (values: CreateRealtimeTaskValues) => {
    setSubmitting(true);

    try {
      const taskId = createTaskId();
      const name = values.name.trim();
      const description = values.description?.trim() || '';

      if (values.mode === 'SINGLE_TABLE') {
        const draft = createDefaultSingleDraft(taskId);
        draft.pipeline.name = name;
        draft.pipeline.description = description;
        saveRealtimeDraft(taskId, draft);
        saveRealtimeTask({
          id: taskId,
          name,
          description,
          mode: values.mode,
          status: 'DRAFT',
          sourceType: 'MySQL CDC',
          sourceSummary: [
            draft.source.database,
            draft.source.schema,
            draft.source.table,
          ]
            .filter(Boolean)
            .join('.'),
          sinkType: draft.sink.type.toUpperCase(),
          sinkSummary: [
            draft.sink.database,
            draft.sink.schema,
            draft.sink.table,
          ]
            .filter(Boolean)
            .join('.'),
          flinkVersion: draft.pipeline.flinkVersion,
          cdcVersion: draft.pipeline.cdcVersion,
          updatedAt: formatUpdatedAt(),
        });
      }

      if (values.mode === 'MULTI_TABLE') {
        const draft = createDefaultMultiDraft(taskId);
        draft.pipeline.name = name;
        draft.pipeline.description = description;
        saveRealtimeDraft(taskId, draft);
        saveRealtimeTask({
          id: taskId,
          name,
          description,
          mode: values.mode,
          status: 'DRAFT',
          sourceType: 'MySQL CDC',
          sourceSummary: `${draft.source.database}.${draft.source.tablePattern || '*'}（${draft.source.tables.length} 张表）`,
          sinkType: draft.sink.type.toUpperCase(),
          sinkSummary: `${draft.sink.database}.${draft.sink.tablePrefix || ''}*${draft.sink.tableSuffix || ''}`,
          flinkVersion: draft.pipeline.flinkVersion,
          cdcVersion: draft.pipeline.cdcVersion,
          updatedAt: formatUpdatedAt(),
        });
      }

      if (values.mode === 'CUSTOM_YAML') {
        const draft: CustomYamlDraft = {
          taskId,
          mode: 'CUSTOM_YAML',
          name,
          description,
          flinkVersion: '2.2.1',
          cdcVersion: '3.6.0',
          yaml: DEFAULT_YAML,
        };

        saveRealtimeDraft(taskId, draft);
        saveRealtimeTask({
          id: taskId,
          name,
          description,
          mode: values.mode,
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
      }

      message.success('实时同步任务已创建');
      onCreated(taskId, values.mode);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Drawer
      title="新建实时同步任务"
      width={520}
      open={open}
      onClose={onCancel}
      destroyOnClose
      styles={{
        body: { padding: '20px 24px 96px' },
        footer: { padding: '14px 24px' },
      }}
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button disabled={submitting} onClick={onCancel}>
            取消
          </Button>
          <Button
            danger
            type="primary"
            loading={submitting}
            onClick={() => form.submit()}
          >
            创建并配置
          </Button>
        </div>
      }
    >
      <Form<CreateRealtimeTaskValues>
        form={form}
        layout="vertical"
        requiredMark={false}
        onFinish={(values) => void handleSubmit(values)}
      >
        <Form.Item
          label="任务名称"
          name="name"
          rules={[
            { required: true, message: '请输入任务名称' },
            { max: 80, message: '任务名称不能超过 80 个字符' },
          ]}
        >
          <Input
            variant="filled"
            placeholder="请输入实时同步任务名称"
            maxLength={80}
          />
        </Form.Item>

        <Form.Item
          label="同步模式"
          name="mode"
          rules={[{ required: true, message: '请选择同步模式' }]}
        >
          <Radio.Group className="w-full">
            <div className="space-y-3">
              {modeOptions.map((option) => {
                const active = selectedMode === option.value;

                return (
                  <label
                    key={option.value}
                    className={[
                      'flex cursor-pointer items-start gap-3 rounded-lg border px-4 py-3.5 transition',
                      active
                        ? 'border-[#ff4d4f] bg-[#fff7f7]'
                        : 'border-[#eaecf0] bg-white hover:border-[#d0d5dd] hover:bg-[#fafafa]',
                    ].join(' ')}
                  >
                    <Radio value={option.value} className="mt-0.5" />
                    <span
                      className={[
                        'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[16px]',
                        active
                          ? 'bg-[#ff4d4f] text-white'
                          : 'bg-[#f2f4f7] text-[#667085]',
                      ].join(' ')}
                    >
                      {option.icon}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[14px] font-medium text-[#344054]">
                        {option.title}
                      </span>
                      <span className="mt-1 block text-[12px] leading-5 text-[#98a2b3]">
                        {option.description}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          </Radio.Group>
        </Form.Item>

        <Form.Item label="任务描述" name="description">
          <Input.TextArea
            variant="filled"
            placeholder="可选，说明任务用途或同步范围"
            autoSize={{ minRows: 3, maxRows: 5 }}
            maxLength={200}
            showCount
          />
        </Form.Item>
      </Form>
    </Drawer>
  );
};

export default CreateRealtimeTaskDrawer;

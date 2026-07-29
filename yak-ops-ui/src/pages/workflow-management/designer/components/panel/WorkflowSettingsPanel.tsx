import { Form, Input, InputNumber, Select } from 'antd';
import { Save, X } from 'lucide-react';
import { useEffect } from 'react';
import type {
  WorkflowDefinitionRecord,
  WorkflowFailureStrategy,
} from '../../../types';
import {
  PanelTitle,
  panelContentClass,
  panelFooterClass,
  panelHeaderClass,
  panelIconButtonClass,
  panelShellClass,
} from './shared';

interface SettingsValues {
  name: string;
  description?: string;
  failureStrategy: WorkflowFailureStrategy;
  maxParallelism: number;
}

interface WorkflowSettingsPanelProps {
  workflow: WorkflowDefinitionRecord;
  onApply: (values: SettingsValues) => void;
  onClose: () => void;
}

const WorkflowSettingsPanel = ({
  workflow,
  onApply,
  onClose,
}: WorkflowSettingsPanelProps) => {
  const [form] = Form.useForm<SettingsValues>();

  useEffect(() => {
    form.setFieldsValue({
      name: workflow.name,
      description: workflow.description,
      failureStrategy: workflow.failureStrategy,
      maxParallelism: workflow.maxParallelism,
    });
  }, [form, workflow]);

  const apply = async () => {
    const values = await form.validateFields();
    onApply(values);
  };

  return (
    <aside className={panelShellClass}>
      <header className={panelHeaderClass}>
        <PanelTitle title="工作流设置" description="修改名称、描述与草稿策略" />
        <button type="button" className={panelIconButtonClass} onClick={onClose}>
          <X size={17} />
        </button>
      </header>
      <div className={[panelContentClass, 'p-4'].join(' ')}>
        <Form
          form={form}
          layout="vertical"
          requiredMark={false}
          className="[&_.ant-form-item-label_label]:text-[11px] [&_.ant-form-item-label_label]:font-semibold [&_.ant-form-item-label_label]:text-[#475467]"
        >
          <Form.Item
            label="工作流名称"
            name="name"
            rules={[{ required: true, message: '请输入工作流名称' }]}
          >
            <Input maxLength={255} />
          </Form.Item>
          <Form.Item label="工作流编码">
            <Input value={workflow.code} disabled />
          </Form.Item>
          <Form.Item label="描述" name="description">
            <Input.TextArea rows={5} maxLength={1000} showCount />
          </Form.Item>
          <Form.Item label="失败策略" name="failureStrategy">
            <Select
              options={[
                { label: '失败即停止', value: 'FAIL_FAST' },
                { label: '继续后续分支', value: 'CONTINUE' },
              ]}
            />
          </Form.Item>
          <Form.Item label="最大并行度" name="maxParallelism">
            <InputNumber min={1} max={256} className="w-full" />
          </Form.Item>
        </Form>
      </div>
      <footer className={panelFooterClass}>
        <span />
        <button
          type="button"
          className="inline-flex h-[29px] items-center gap-1.5 rounded-md border border-[#d0d5dd] bg-white px-2.5 text-[9px] text-[#475467] hover:bg-[#f9fafb]"
          onClick={() => void apply()}
        >
          <Save size={15} /> 应用设置
        </button>
      </footer>
    </aside>
  );
};

export default WorkflowSettingsPanel;

import { Form, Input, InputNumber, Select } from 'antd';
import { Save, X } from 'lucide-react';
import { useEffect } from 'react';
import type {
  WorkflowDefinitionRecord,
  WorkflowFailureStrategy,
} from '../../types';

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

const WorkflowSettingsPanel = ({ workflow, onApply, onClose }: WorkflowSettingsPanelProps) => {
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
    <aside className="dify-workspace-panel">
      <header>
        <div>
          <strong>工作流设置</strong>
          <span>修改名称、描述与草稿策略</span>
        </div>
        <button type="button" onClick={onClose}><X size={17} /></button>
      </header>
      <div className="dify-workspace-panel__content">
        <Form form={form} layout="vertical" requiredMark={false} className="dify-workflow-settings-form">
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
      <footer className="dify-workspace-panel__footer">
        <button type="button" onClick={() => void apply()}><Save size={15} /> 应用设置</button>
      </footer>
    </aside>
  );
};

export default WorkflowSettingsPanel;

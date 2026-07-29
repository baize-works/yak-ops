import {
  DatabaseOutlined,
  TableOutlined,
} from '@ant-design/icons';
import { Form, Input, Modal, Radio, message } from 'antd';
import { useEffect, useState, type ReactNode } from 'react';
import { linkupJobDefinitionApi } from '../../api';
import {
  buildCreatePayload,
  extractGeneratedId,
  extractSavedId,
  isApiSuccess,
  responseMessage,
  type CreateSyncTaskValues,
  type SyncMode,
} from '../model';

interface CreateSyncTaskModalProps {
  open: boolean;
  onCancel: () => void;
  onCreated: (taskId: string) => void;
}

const modeOptions: Array<{
  value: SyncMode;
  title: string;
  description: string;
  icon: ReactNode;
}> = [
  {
    value: 'GUIDE_SINGLE',
    title: '单表同步',
    description: '配置一张来源表到一张目标表的离线同步任务',
    icon: <TableOutlined />,
  },
  {
    value: 'GUIDE_MULTI',
    title: '多表同步',
    description: '批量选择多张来源表，并按规则写入目标端',
    icon: <DatabaseOutlined />,
  },
];

export default function CreateSyncTaskModal({
  open,
  onCancel,
  onCreated,
}: CreateSyncTaskModalProps) {
  const [form] = Form.useForm<CreateSyncTaskValues>();
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    form.setFieldsValue({
      jobName: '',
      jobDesc: '',
      mode: 'GUIDE_SINGLE',
    });
  }, [form, open]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);

      const idResponse = await linkupJobDefinitionApi.getUniqueId();
      if (!isApiSuccess(idResponse)) {
        message.error(responseMessage(idResponse, '生成任务 ID 失败'));
        return;
      }

      const taskId = extractGeneratedId(idResponse);
      if (!taskId) {
        message.error('生成任务 ID 失败');
        return;
      }

      const payload = buildCreatePayload(taskId, values);
      const saveResponse =
        values.mode === 'GUIDE_MULTI'
          ? await linkupJobDefinitionApi.saveOrUpdateGuideMulti(payload)
          : await linkupJobDefinitionApi.saveOrUpdateGuideSingle(payload);

      if (!isApiSuccess(saveResponse)) {
        message.error(responseMessage(saveResponse, '创建同步任务失败'));
        return;
      }

      const createdId = extractSavedId(saveResponse, taskId);
      message.success('同步任务已创建');
      onCreated(createdId);
    } catch (error: any) {
      if (error?.errorFields) return;
      message.error(error?.message || '创建同步任务失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      title={null}
      width={620}
      centered
      destroyOnClose
      maskClosable={false}
      confirmLoading={submitting}
      okText="创建并配置"
      cancelText="取消"
      onOk={handleSubmit}
      onCancel={onCancel}
      styles={{ body: { padding: '8px 4px 4px' } }}
    >
      <div className="mb-6">
        <div className="text-[20px] font-semibold text-[#101828]">
          新建离线同步任务
        </div>
        <div className="mt-1 text-[13px] text-[#667085]">
          先创建任务基本信息，随后完成连接测试和同步配置。
        </div>
      </div>

      <Form<CreateSyncTaskValues>
        form={form}
        layout="vertical"
        requiredMark="optional"
      >
        <Form.Item
          name="jobName"
          label="任务名称"
          rules={[
            { required: true, message: '请输入任务名称' },
            { max: 64, message: '任务名称不能超过 64 个字符' },
            {
              validator: (_, value) =>
                value?.trim()
                  ? Promise.resolve()
                  : Promise.reject(new Error('任务名称不能为空')),
            },
          ]}
        >
          <Input
            autoFocus
            maxLength={64}
            showCount
            placeholder="例如：订单数据每日同步"
          />
        </Form.Item>

        <Form.Item
          name="jobDesc"
          label="任务描述"
          rules={[{ max: 200, message: '任务描述不能超过 200 个字符' }]}
        >
          <Input.TextArea
            rows={3}
            maxLength={200}
            showCount
            placeholder="说明数据范围、用途或维护责任人"
          />
        </Form.Item>

        <Form.Item
          name="mode"
          label="同步类型"
          rules={[{ required: true, message: '请选择同步类型' }]}
        >
          <Radio.Group className="grid w-full grid-cols-2 gap-3">
            {modeOptions.map((option) => (
              <Radio.Button
                key={option.value}
                value={option.value}
                className="!h-auto !rounded-lg !border !border-[#e4e7ec] !px-4 !py-4 [&.ant-radio-button-wrapper-checked]:!border-[#315efb] [&.ant-radio-button-wrapper-checked]:!bg-[#f5f7ff]"
              >
                <div className="flex items-start gap-3 whitespace-normal">
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#eef2ff] text-[17px] text-[#315efb]">
                    {option.icon}
                  </div>
                  <div>
                    <div className="font-medium text-[#182230]">
                      {option.title}
                    </div>
                    <div className="mt-1 text-xs leading-5 text-[#667085]">
                      {option.description}
                    </div>
                  </div>
                </div>
              </Radio.Button>
            ))}
          </Radio.Group>
        </Form.Item>
      </Form>
    </Modal>
  );
}

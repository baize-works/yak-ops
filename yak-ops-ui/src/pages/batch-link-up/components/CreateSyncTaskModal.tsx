import {
  DatabaseOutlined,
  TableOutlined,
} from '@ant-design/icons';
import {
  Button,
  ConfigProvider,
  Drawer,
  Form,
  Input,
  Radio,
  message,
} from 'antd';
import {
  useEffect,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';

import {
  BRAND_COLOR,
  BRAND_COLOR_BORDER,
  BRAND_COLOR_SOFT,
  BRAND_COLOR_SOFT_HOVER,
  BRAND_THEME,
} from '@/styles/brand';

import { linkupJobDefinitionApi } from '../api';
import {
  buildCreatePayload,
  extractGeneratedId,
  extractSavedId,
  isApiSuccess,
  responseMessage,
  type CreateSyncTaskValues,
  type SyncMode,
} from '../detail/model';

interface CreateSyncTaskDrawerProps {
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

const brandCssVariables = {
  '--yak-brand-color': BRAND_COLOR,
  '--yak-brand-color-border': BRAND_COLOR_BORDER,
  '--yak-brand-color-soft': BRAND_COLOR_SOFT,
  '--yak-brand-color-soft-hover': BRAND_COLOR_SOFT_HOVER,
} as CSSProperties;

export default function CreateSyncTaskDrawer({
  open,
  onCancel,
  onCreated,
}: CreateSyncTaskDrawerProps) {
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

  const handleCancel = () => {
    if (submitting) return;

    form.resetFields();
    onCancel();
  };

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

      form.resetFields();
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
    <ConfigProvider theme={BRAND_THEME}>
      <Drawer
        open={open}
        width={620}
        placement="right"
        destroyOnClose
        maskClosable={false}
        keyboard={!submitting}
        rootStyle={brandCssVariables}
        onClose={handleCancel}
        title={
          <div>
            <div className="text-[18px] font-semibold text-[#101828]">
              新建离线同步任务
            </div>

            <div className="mt-1 text-[13px] font-normal text-[#667085]">
              填写任务基础信息，创建后可在任务列表中继续配置。
            </div>
          </div>
        }
        styles={{
          header: {
            padding: '20px 24px',
            borderBottom: '1px solid #eaecf0',
          },
          body: {
            padding: '24px',
          },
          footer: {
            padding: '16px 24px',
            borderTop: '1px solid #eaecf0',
          },
        }}
        footer={
          <div className="flex items-center justify-end gap-3">
            <Button
              disabled={submitting}
              onClick={handleCancel}
            >
              取消
            </Button>

            <Button
              type="primary"
              loading={submitting}
              onClick={handleSubmit}
              className="!text-white"
            >
              创建
            </Button>
          </div>
        }
      >
        <Form<CreateSyncTaskValues>
          form={form}
          layout="vertical"
          requiredMark="optional"
        >
          <Form.Item
            name="jobName"
            label="任务名称"
            rules={[
              {
                required: true,
                message: '请输入任务名称',
              },
              {
                max: 64,
                message: '任务名称不能超过 64 个字符',
              },
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
            rules={[
              {
                max: 200,
                message: '任务描述不能超过 200 个字符',
              },
            ]}
          >
            <Input.TextArea
              rows={4}
              maxLength={200}
              showCount
              placeholder="说明数据范围、用途或维护责任人"
            />
          </Form.Item>

          <Form.Item
            name="mode"
            label="同步类型"
            rules={[
              {
                required: true,
                message: '请选择同步类型',
              },
            ]}
          >
            <Radio.Group className="grid w-full grid-cols-2 gap-3">
              {modeOptions.map((option) => (
                <Radio.Button
                  key={option.value}
                  value={option.value}
                  className={[
                    '!h-auto',
                    '!rounded-lg',
                    '!border',
                    '!border-[#e4e7ec]',
                    '!px-4',
                    '!py-4',
                    '!shadow-none',
                    'hover:!border-[var(--yak-brand-color-border)]',
                    'hover:!bg-[var(--yak-brand-color-soft-hover)]',
                    '[&.ant-radio-button-wrapper-checked]:!border-[var(--yak-brand-color)]',
                    '[&.ant-radio-button-wrapper-checked]:!bg-[var(--yak-brand-color-soft)]',
                    '[&.ant-radio-button-wrapper-checked]:!text-inherit',
                    'before:!hidden',
                  ].join(' ')}
                >
                  <div className="flex items-start gap-3 whitespace-normal">
                    <div
                      className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[17px]"
                      style={{
                        color: BRAND_COLOR,
                        backgroundColor: BRAND_COLOR_SOFT_HOVER,
                      }}
                    >
                      {option.icon}
                    </div>

                    <div className="min-w-0 text-left">
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
      </Drawer>
    </ConfigProvider>
  );
}

import {
  ArrowRightOutlined,
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

export interface CreateSyncEndpoint {
  name?: string;
  dbType?: string;
  connectorType?: string;
  pluginName?: string;
}

interface CreateSyncTaskDrawerProps {
  open: boolean;
  source: CreateSyncEndpoint;
  target: CreateSyncEndpoint;
  onCancel: () => void;
  onCreated: (taskId: string) => void;
}

interface EndpointSummaryProps {
  role: '来源端' | '目标端';
  endpoint: CreateSyncEndpoint;
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

const endpointName = (endpoint: CreateSyncEndpoint) =>
  endpoint.name?.trim() || endpoint.dbType?.trim() || '未指定';

const endpointMeta = (endpoint: CreateSyncEndpoint) =>
  [endpoint.connectorType, endpoint.pluginName]
    .map((value) => value?.trim())
    .filter(Boolean)
    .join(' · ');

const buildDefaultJobName = (
  sourceName: string,
  targetName: string,
) => `${sourceName} → ${targetName} 离线同步`.slice(0, 64);

const buildDefaultJobDescription = (
  sourceName: string,
  targetName: string,
) =>
  [
    '业务场景：请填写所属业务或使用场景；',
    `同步范围：从 ${sourceName} 的【来源表】同步至 ${targetName} 的【目标表】；`,
    '同步目的：请填写数据分析、数据服务、数据归档等使用目的。',
  ]
    .join('\n')
    .slice(0, 200);

function EndpointSummary({
  role,
  endpoint,
}: EndpointSummaryProps) {
  const name = endpointName(endpoint);
  const meta = endpointMeta(endpoint);

  return (
    <div className="min-w-0 rounded-xl border border-[#e4e7ec] bg-white px-4 py-3 shadow-[0_1px_2px_rgba(16,24,40,0.03)]">
      <div className="flex items-center gap-3">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[16px]"
          style={{
            color: BRAND_COLOR,
            backgroundColor: BRAND_COLOR_SOFT_HOVER,
          }}
        >
          <DatabaseOutlined />
        </div>

        <div className="min-w-0">

          <div
            className="mt-0.5 truncate text-[14px] font-semibold text-[#182230]"
            title={name}
          >
            {name}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CreateSyncTaskDrawer({
  open,
  source,
  target,
  onCancel,
  onCreated,
}: CreateSyncTaskDrawerProps) {
  const [form] = Form.useForm<CreateSyncTaskValues>();
  const [submitting, setSubmitting] = useState(false);

  const sourceName = endpointName(source);
  const targetName = endpointName(target);

  useEffect(() => {
    if (!open) return;

    form.setFieldsValue({
      jobName: buildDefaultJobName(sourceName, targetName),
      jobDesc: undefined,
      mode: 'GUIDE_SINGLE',
    });
  }, [form, open, sourceName, targetName]);

  const handleCancel = () => {
    if (submitting) return;

    form.resetFields();
    onCancel();
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const normalizedValues: CreateSyncTaskValues = {
        ...values,
        jobName: values.jobName.trim(),
        jobDesc: values.jobDesc?.trim(),
      };

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

      const payload = buildCreatePayload(taskId, normalizedValues);

      const saveResponse =
        normalizedValues.mode === 'GUIDE_MULTI'
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
        closable={false}
        destroyOnClose
        maskClosable={false}
        keyboard={!submitting}
        rootStyle={brandCssVariables}
        onClose={handleCancel}
        title={
          <div className="min-w-0">
            <div className="text-[18px] font-semibold leading-7 text-[#101828]">
              新建离线同步任务
            </div>

          </div>
        }
        extra={
          <div className="flex shrink-0 items-center gap-2">
            <Button
              disabled={submitting}
              onClick={handleCancel}
              className="!h-9 !rounded-lg !px-4 !font-medium"
            >
              取消
            </Button>

            <Button
              type="primary"
              loading={submitting}
              onClick={handleSubmit}
              className="!h-9 !rounded-lg !px-5 !font-medium !text-white"
            >
              创建
            </Button>
          </div>
        }
        styles={{
          header: {
            padding: '18px 24px',
            borderBottom: '1px solid #eaecf0',
          },
          body: {
            padding: '24px',
          },
        }}
      >
        <div className="mb-6">
          <div className="mb-2 text-[13px] font-medium text-[#344054]">
            同步链路
          </div>

          <div className="grid grid-cols-[minmax(0,1fr)_40px_minmax(0,1fr)] items-center gap-2 rounded-xl bg-[#f8fafc] p-3">
            <EndpointSummary
              role="来源端"
              endpoint={source}
            />

            <div className="flex items-center justify-center text-[#98a2b3]">
              <span className="flex h-8 w-8 items-center justify-center rounded-full border border-[#e4e7ec] bg-white">
                <ArrowRightOutlined />
              </span>
            </div>

            <EndpointSummary
              role="目标端"
              endpoint={target}
            />
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
              {
                required: true,
                message: '请输入任务名称',
              },
              {
                max: 64,
                message: '任务名称不能超过 64 个字符',
              },
            ]}
          >
            <Input
              autoFocus
              maxLength={64}
              showCount
              variant="filled"
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
              rows={5}
              maxLength={200}
              variant="filled"
              showCount
              placeholder="请说明业务场景、同步范围和使用目的"
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

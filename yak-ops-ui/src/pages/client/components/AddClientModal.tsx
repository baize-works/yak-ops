import {
  DeleteOutlined,
  LinkOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import {
  Alert,
  Button,
  Drawer,
  Form,
  Input,
  InputNumber,
  Space,
  Tag,
  type FormInstance,
} from 'antd';
import { useEffect, useState } from 'react';

import type { LinkupClient } from '../api';

export interface LinkUpWorkerLabelValue {
  key?: string;
  value?: string;
}

export interface LinkUpWorkerFormValues {
  nodeName?: string;
  baseUrl: string;
  weight?: number;
  labels?: LinkUpWorkerLabelValue[];
}

interface AddClientDrawerProps {
  open: boolean;
  form: FormInstance<LinkUpWorkerFormValues>;
  confirmLoading?: boolean;
  verifying?: boolean;
  mode?: 'create' | 'edit';
  initialValues?: LinkupClient;
  onCancel: () => void;
  onSubmit: () => void;
  onVerify: (baseUrl: string) => Promise<LinkupClient>;
}

const labelsToList = (
  labels?: Record<string, string>,
): LinkUpWorkerLabelValue[] => {
  return Object.entries(labels || {}).map(([key, value]) => ({ key, value }));
};

const AddClientDrawer = ({
  open,
  form,
  confirmLoading = false,
  verifying = false,
  mode = 'create',
  initialValues,
  onCancel,
  onSubmit,
  onVerify,
}: AddClientDrawerProps) => {
  const [verifiedWorker, setVerifiedWorker] = useState<LinkupClient>();
  const isEdit = mode === 'edit';
  const configManaged = initialValues?.registrationMode === 'CONFIG';
  const dynamicManaged = initialValues?.registrationMode === 'DYNAMIC';
  const addressManaged = configManaged || dynamicManaged;

  useEffect(() => {
    if (!open) return;
    setVerifiedWorker(undefined);
    form.resetFields();
    form.setFieldsValue({
      nodeName: initialValues?.nodeName,
      baseUrl: initialValues?.baseUrl || 'http://127.0.0.1:18080',
      weight: initialValues?.weight || 100,
      labels: labelsToList(initialValues?.labels),
    });
  }, [form, initialValues, open]);

  const handleVerify = async () => {
    const { baseUrl } = await form.validateFields(['baseUrl']);
    const worker = await onVerify(baseUrl);
    setVerifiedWorker(worker);
    if (!form.getFieldValue('nodeName')) {
      form.setFieldValue('nodeName', worker.nodeName);
    }
  };

  return (
    <Drawer
      width={640}
      open={open}
      placement="right"
      maskClosable={false}
      destroyOnClose
      onClose={onCancel}
      title={
        <div>
          <div className="text-[17px] font-semibold text-[#1f2329]">
            {isEdit ? '编辑执行节点' : '注册执行节点'}
          </div>
          <div className="mt-1 text-[12px] font-normal text-[#8a8f99]">
            登记一个可由 Yak Ops 管理的 Link-Up 离线 Worker
          </div>
        </div>
      }
      styles={{
        header: { padding: '18px 24px', borderBottom: '1px solid #e8e9ec' },
        body: { padding: '20px 24px 32px', background: '#fff' },
        footer: { padding: '14px 24px', borderTop: '1px solid #e8e9ec' },
      }}
      footer={
        <div className="flex justify-end gap-2">
          <Button onClick={onCancel}>取消</Button>
          <Button
            icon={<LinkOutlined />}
            loading={verifying}
            onClick={() => void handleVerify()}
          >
            连接验证
          </Button>
          <Button
            type="primary"
            loading={confirmLoading}
            onClick={onSubmit}
          >
            {isEdit ? '保存修改' : '注册节点'}
          </Button>
        </div>
      }
    >
      <Alert
        className="mb-5"
        type="info"
        showIcon
        message="Yak Ops 会读取 /api/v1/node 获取 nodeId、进程实例、版本和执行容量。"
        description="手工和配置节点由 Yak Ops 主动探测；动态节点由 Worker 使用签名心跳续租。禁用节点不接收新任务，排空节点保留运行任务。"
      />

      {configManaged ? (
        <Alert
          className="mb-5"
          type="warning"
          showIcon
          message="该节点来自 application.yml"
          description="Worker 地址和稳定 nodeId 由配置文件托管；页面可调整名称、权重、标签和调度状态。"
        />
      ) : null}

      {dynamicManaged ? (
        <Alert
          className="mb-5"
          type="warning"
          showIcon
          message="该节点由 Worker 动态注册"
          description="Worker 地址、进程实例、容量和 Connector 能力由签名心跳维护；页面仅管理名称、权重、标签和调度状态。"
        />
      ) : null}

      {verifiedWorker ? (
        <div className="mb-5 rounded-lg border border-[#e8e9ec] bg-[#fafafa] p-4">
          <div className="flex items-center justify-between gap-3">
            <strong className="text-[14px] text-[#1f2329]">连接验证成功</strong>
            <Tag bordered={false}>{verifiedWorker.engineVersion || '未知版本'}</Tag>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 text-[12px] text-[#667085]">
            <span>nodeId：{verifiedWorker.nodeId}</span>
            <span>状态：{verifiedWorker.status}</span>
            <span>并发：{verifiedWorker.maxConcurrentJobs}</span>
            <span>队列：{verifiedWorker.maxQueuedJobs}</span>
          </div>
        </div>
      ) : null}

      <Form
        form={form}
        layout="vertical"
        requiredMark={false}
        initialValues={{
          baseUrl: 'http://127.0.0.1:18080',
          weight: 100,
          labels: [],
        }}
      >
        <Form.Item
          name="nodeName"
          label="节点名称"
          rules={[{ max: 200, message: '节点名称不能超过 200 个字符' }]}
        >
          <Input
            variant="filled"
            placeholder="例如：华南离线节点-01；留空则使用 Worker 名称"
          />
        </Form.Item>

        <Form.Item
          name="baseUrl"
          label="Worker 地址"
          extra={
            configManaged
              ? '配置来源节点的地址请在 application.yml 中修改'
              : dynamicManaged
                ? '动态节点地址由 Worker 的 advertised base URL 维护'
                : undefined
          }
          rules={[
            { required: true, whitespace: true, message: '请输入 Worker 地址' },
            {
              pattern: /^https?:\/\/.+/i,
              message: '地址必须以 http:// 或 https:// 开头',
            },
          ]}
        >
          <Input
            variant="filled"
            disabled={addressManaged}
            placeholder="http://127.0.0.1:18080"
          />
        </Form.Item>

        <Form.Item
          name="weight"
          label="调度权重"
          extra="自动调度会在能力、可达性、租约和容量硬过滤后使用该权重评分。"
          rules={[{ required: true, message: '请输入调度权重' }]}
        >
          <InputNumber
            variant="filled"
            min={1}
            max={1000}
            precision={0}
            className="!w-full"
          />
        </Form.Item>

        <Form.Item label="节点标签">
          <Form.List name="labels">
            {(fields, { add, remove }) => (
              <div>
                <div className="space-y-2">
                  {fields.map((field) => (
                    <Space.Compact key={field.key} block>
                      <Form.Item
                        name={[field.name, 'key']}
                        noStyle
                        rules={[{ required: true, message: '请输入标签名' }]}
                      >
                        <Input variant="filled" placeholder="region" />
                      </Form.Item>
                      <Form.Item name={[field.name, 'value']} noStyle>
                        <Input variant="filled" placeholder="south-china" />
                      </Form.Item>
                      <Button
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => remove(field.name)}
                      />
                    </Space.Compact>
                  ))}
                </div>
                <Button
                  type="dashed"
                  block
                  className="mt-2"
                  icon={<PlusOutlined />}
                  onClick={() => add({ key: '', value: '' })}
                >
                  添加标签
                </Button>
              </div>
            )}
          </Form.List>
        </Form.Item>
      </Form>
    </Drawer>
  );
};

export default AddClientDrawer;

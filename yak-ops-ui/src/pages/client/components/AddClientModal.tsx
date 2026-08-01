import {
  ApiOutlined,
  ClusterOutlined,
  DeleteOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import {
  Button,
  Col,
  Drawer,
  Form,
  Input,
  Row,
  Segmented,
  Select,
  Switch,
  type FormInstance,
} from 'antd';
import { useEffect, useRef } from 'react';

const { TextArea } = Input;

export type LinkUpClientDeployMode = 'SINGLE' | 'SEPARATED_CLUSTER';
export type LinkUpClientProtocol = 'http' | 'https';

export interface LinkUpClientEndpointDTO {
  host?: string;
  hostname?: string;
  port?: string | number;
  role?: 'MASTER' | 'WORKER';
  priority?: number;
}

export interface LinkUpClientFormValues {
  id?: number;
  clientName: string;
  engineType: string;
  deployMode: LinkUpClientDeployMode;
  protocol: LinkUpClientProtocol;
  contextPath?: string;
  clientAddress?: string;
  clientPort?: string | number;
  masterEndpoints?: LinkUpClientEndpointDTO[];
  remark?: string;
  authEnabled?: boolean;
  username?: string;
  password?: string;
}

interface AddClientDrawerProps {
  open: boolean;
  form: FormInstance<LinkUpClientFormValues>;
  confirmLoading?: boolean;
  mode?: 'create' | 'edit';
  initialValues?: Partial<LinkUpClientFormValues>;
  onCancel: () => void;
  onSubmit: () => void;
}

const CONTROL_CLASS_NAME = '!h-9';

const DEFAULT_VALUES: Partial<LinkUpClientFormValues> = {
  engineType: 'ZETA',
  deployMode: 'SINGLE',
  protocol: 'http',
  contextPath: '',
  clientPort: 8080,
  authEnabled: false,
};

const PROTOCOL_OPTIONS = [
  { label: 'HTTP', value: 'http' },
  { label: 'HTTPS', value: 'https' },
];

const DEPLOY_MODE_OPTIONS = [
  {
    label: (
      <span className="flex items-center justify-center gap-2">
        <ApiOutlined />
        单节点
      </span>
    ),
    value: 'SINGLE',
  },
  {
    label: (
      <span className="flex items-center justify-center gap-2">
        <ClusterOutlined />
        分离集群
      </span>
    ),
    value: 'SEPARATED_CLUSTER',
  },
];

const REMARK_PRESETS = [
  '客户端已就绪，今天也要稳定发挥呀。',
  '已完成基础连接配置，可用于后续任务绑定与调度。',
  '新的客户端已接入，期待它接下来的表现。',
  '连接成功只是开始，真正的表现还在后面。',
];

const CLIENT_NAME_PRESETS = [
  '九阴真经',
  '九阳神功',
  '太玄经',
  '易筋经',
  '北冥神功',
  '凌波微步',
  '乾坤大挪移',
  '降龙十八掌',
  '独孤九剑',
  '六脉神剑',
  '黯然销魂掌',
  '龙象般若功',
  '吸星大法',
  '三分归元气',
  '一阳指',
  '葵花宝典',
  '辟邪剑谱',
  '蛤蟆功',
  '小无相功',
  '玄冥神掌',
  '七伤拳',
  '睡梦罗汉拳',
  '天山折梅手',
];

const createMasterEndpoint = (
  priority = 1,
): LinkUpClientEndpointDTO => ({
  host: '',
  port: 8080,
  role: 'MASTER',
  priority,
});

const pickRandom = (items: string[], previous?: string) => {
  if (!items.length) return '';
  if (items.length === 1) return items[0];

  let result = items[Math.floor(Math.random() * items.length)];

  while (result === previous) {
    result = items[Math.floor(Math.random() * items.length)];
  }

  return result;
};

const normalizeMasterEndpoints = (
  endpoints?: LinkUpClientEndpointDTO[],
): LinkUpClientEndpointDTO[] => {
  if (!endpoints?.length) {
    return [createMasterEndpoint()];
  }

  return endpoints.map((endpoint, index) => ({
    ...endpoint,
    host: endpoint.host || endpoint.hostname || '',
    port: endpoint.port ?? 8080,
    role: 'MASTER',
    priority: index + 1,
  }));
};

const AddClientDrawer = ({
  open,
  form,
  confirmLoading = false,
  mode = 'create',
  initialValues,
  onCancel,
  onSubmit,
}: AddClientDrawerProps) => {
  const lastRemarkRef = useRef<string>();
  const lastClientNameRef = useRef<string>();

  const isEdit = mode === 'edit';

  const deployMode = Form.useWatch('deployMode', form);
  const authEnabled = Form.useWatch('authEnabled', form);

  useEffect(() => {
    if (!open) return;

    form.resetFields();

    if (isEdit) {
      const currentDeployMode =
        initialValues?.deployMode ||
        (initialValues?.masterEndpoints?.length
          ? 'SEPARATED_CLUSTER'
          : 'SINGLE');

      form.setFieldsValue({
        ...DEFAULT_VALUES,
        ...initialValues,
        deployMode: currentDeployMode,
        masterEndpoints: normalizeMasterEndpoints(
          initialValues?.masterEndpoints,
        ),
        authEnabled: Boolean(initialValues?.authEnabled),
      });

      return;
    }

    const clientNamePreset = pickRandom(
      CLIENT_NAME_PRESETS,
      lastClientNameRef.current,
    );
    const remark = pickRandom(REMARK_PRESETS, lastRemarkRef.current);

    lastClientNameRef.current = clientNamePreset;
    lastRemarkRef.current = remark;

    form.setFieldsValue({
      ...DEFAULT_VALUES,
      clientName: `ZETA-${clientNamePreset}`,
      masterEndpoints: [createMasterEndpoint()],
      remark,
    });
  }, [open, isEdit, initialValues, form]);

  return (
    <Drawer
      width={720}
      open={open}
      placement="right"
      maskClosable={false}
      destroyOnClose
      onClose={onCancel}
      title={
        <div>
          <div className="text-[17px] font-semibold text-[#1f2329]">
            {isEdit ? '编辑客户端' : '新增客户端'}
          </div>

          <div className="mt-1 text-[12px] font-normal text-[#8a8f99]">
            配置 LinkUp Zeta REST 连接信息
          </div>
        </div>
      }
      styles={{
        header: {
          padding: '18px 24px',
          borderBottom: '1px solid #e8e9ec',
        },
        body: {
          padding: '20px 24px 32px',
          background: '#ffffff',
        },
        footer: {
          padding: '14px 24px',
          borderTop: '1px solid #e8e9ec',
          background: '#ffffff',
        },
      }}
      footer={
        <div className="flex justify-end gap-2">
          <Button className="!h-9" onClick={onCancel}>
            取消
          </Button>

          <Button
            type="primary"
            loading={confirmLoading}
            className="!h-9 !px-5"
            onClick={onSubmit}
          >
            {isEdit ? '保存修改' : '创建客户端'}
          </Button>
        </div>
      }
    >
      <Form
        form={form}
        layout="vertical"
        requiredMark={false}
        initialValues={{
          ...DEFAULT_VALUES,
          masterEndpoints: [createMasterEndpoint()],
        }}
      >
        <Form.Item name="id" hidden>
          <Input />
        </Form.Item>

        <Form.Item name="engineType" hidden>
          <Input />
        </Form.Item>

        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              name="clientName"
              label="客户端名称"
              rules={[
                {
                  required: true,
                  whitespace: true,
                  message: '请输入客户端名称',
                },
              ]}
            >
              <Input
                variant="filled"
                placeholder="例如：ZETA-独孤九剑"
                className={CONTROL_CLASS_NAME}
              />
            </Form.Item>
          </Col>

          <Col xs={24} md={12}>
            <Form.Item
              name="protocol"
              label="访问协议"
              rules={[
                {
                  required: true,
                  message: '请选择访问协议',
                },
              ]}
            >
              <Select
                variant="filled"
                options={PROTOCOL_OPTIONS}
                className={CONTROL_CLASS_NAME}
              />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          name="deployMode"
          label="部署模式"
          rules={[
            {
              required: true,
              message: '请选择部署模式',
            },
          ]}
        >
          <Segmented
            block
            options={DEPLOY_MODE_OPTIONS}
            className={[
              '!bg-[#f3f3f4] !p-1',
              '[&_.ant-segmented-item]:!min-h-9',
              '[&_.ant-segmented-item]:!text-[#555b65]',
              '[&_.ant-segmented-item-label]:!flex',
              '[&_.ant-segmented-item-label]:!h-9',
              '[&_.ant-segmented-item-label]:!items-center',
              '[&_.ant-segmented-item-label]:!justify-center',
              '[&_.ant-segmented-item-selected]:!text-[#1f2329]',
              '[&_.ant-segmented-item-selected]:!shadow-none',
            ].join(' ')}
          />
        </Form.Item>

        <Form.Item name="contextPath" label="上下文路径">
          <Input
            variant="filled"
            placeholder="例如：/"
            className={CONTROL_CLASS_NAME}
          />
        </Form.Item>

        {deployMode === 'SEPARATED_CLUSTER' ? (
          <Form.List name="masterEndpoints">
            {(fields, { add, remove }) => (
              <div className="mb-6">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[14px] font-medium text-[#1f2329]">
                    Master REST 地址
                  </span>

                  <Button
                    type="text"
                    icon={<PlusOutlined />}
                    className="!h-8 !px-2"
                    onClick={() =>
                      add(createMasterEndpoint(fields.length + 1))
                    }
                  >
                    添加
                  </Button>
                </div>

                <div className="space-y-3">
                  {fields.map((field, index) => (
                    <div
                      key={field.key}
                      className="grid grid-cols-[minmax(0,1fr)_120px_32px] items-start gap-2"
                    >
                      <Form.Item
                        name={[field.name, 'host']}
                        className="!mb-0"
                        rules={[
                          {
                            required: true,
                            whitespace: true,
                            message: '请输入 Master 地址',
                          },
                        ]}
                      >
                        <Input
                          variant="filled"
                          placeholder={`Master ${index + 1} 地址`}
                          className={CONTROL_CLASS_NAME}
                        />
                      </Form.Item>

                      <Form.Item
                        name={[field.name, 'port']}
                        className="!mb-0"
                        rules={[
                          {
                            required: true,
                            message: '请输入端口',
                          },
                          {
                            pattern: /^\d+$/,
                            message: '端口必须为数字',
                          },
                        ]}
                      >
                        <Input
                          variant="filled"
                          placeholder="8080"
                          className={CONTROL_CLASS_NAME}
                        />
                      </Form.Item>

                      <Button
                        type="text"
                        danger
                        icon={<DeleteOutlined />}
                        disabled={fields.length <= 1}
                        className="!h-9 !w-8 !px-0"
                        onClick={() => remove(field.name)}
                      />

                      <Form.Item
                        name={[field.name, 'role']}
                        hidden
                      >
                        <Input />
                      </Form.Item>

                      <Form.Item
                        name={[field.name, 'priority']}
                        hidden
                      >
                        <Input />
                      </Form.Item>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Form.List>
        ) : (
          <Row gutter={16}>
            <Col xs={24} md={16}>
              <Form.Item
                name="clientAddress"
                label="客户端地址"
                rules={[
                  {
                    required: true,
                    whitespace: true,
                    message: '请输入客户端地址',
                  },
                ]}
              >
                <Input
                  variant="filled"
                  placeholder="例如：192.168.1.10"
                  className={CONTROL_CLASS_NAME}
                />
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item
                name="clientPort"
                label="端口"
                rules={[
                  {
                    required: true,
                    message: '请输入端口',
                  },
                  {
                    pattern: /^\d+$/,
                    message: '端口必须为数字',
                  },
                ]}
              >
                <Input
                  variant="filled"
                  placeholder="8080"
                  className={CONTROL_CLASS_NAME}
                />
              </Form.Item>
            </Col>
          </Row>
        )}

        <Form.Item
          name="authEnabled"
          label="Basic Auth"
          valuePropName="checked"
        >
          <Switch
            checkedChildren="开启"
            unCheckedChildren="关闭"
          />
        </Form.Item>

        {authEnabled ? (
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                name="username"
                label="用户名"
                rules={[
                  {
                    required: true,
                    whitespace: true,
                    message: '请输入用户名',
                  },
                ]}
              >
                <Input
                  variant="filled"
                  placeholder="admin"
                  className={CONTROL_CLASS_NAME}
                />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item
                name="password"
                label="密码"
                rules={[
                  {
                    required: true,
                    message: '请输入密码',
                  },
                ]}
              >
                <Input.Password
                  variant="filled"
                  placeholder="请输入密码"
                  className={CONTROL_CLASS_NAME}
                />
              </Form.Item>
            </Col>
          </Row>
        ) : null}

        <Form.Item name="remark" label="备注" className="!mb-0">
          <TextArea
            variant="filled"
            placeholder="补充客户端用途、运行环境等信息"
            autoSize={{
              minRows: 3,
              maxRows: 5,
            }}
          />
        </Form.Item>
      </Form>
    </Drawer>
  );
};

export default AddClientDrawer;
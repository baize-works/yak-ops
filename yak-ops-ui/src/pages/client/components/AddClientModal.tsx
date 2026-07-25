import ZetaIcon from "@/pages/batch-link-up/workflow/sider/icon/ZetaIcon";
import {ApiOutlined, ClusterOutlined, DeleteOutlined, PlusOutlined, SmileOutlined,} from "@ant-design/icons";
import {Button, Col, Form, Input, Modal, Row, Segmented, Select, Switch,} from "antd";
import React, {useEffect, useRef} from "react";
import "./index.less";

const {TextArea} = Input;

export type SeaTunnelClientDeployMode = "SINGLE" | "SEPARATED_CLUSTER";
export type SeaTunnelClientProtocol = "http" | "https";

export interface SeaTunnelClientEndpointDTO {
  host?: string;
  hostname?: string;
  port?: string | number;
  role?: "MASTER" | "WORKER";
  priority?: number;
}

export interface SeaTunnelClientFormValues {
  id?: number;
  clientName: string;
  engineType: string;

  deployMode?: SeaTunnelClientDeployMode;
  protocol?: SeaTunnelClientProtocol;

  contextPath: string;

  clientAddress: string;
  clientHostname: string;
  clientPort: string | number;

  masterEndpoints?: SeaTunnelClientEndpointDTO[];

  remark?: string;
  authEnabled?: boolean;
  username?: string;
  password?: string;
}

interface AddClientModalProps {
  open: boolean;
  form: any;
  confirmLoading?: boolean;
  mode?: "create" | "edit";
  initialValues?: Partial<SeaTunnelClientFormValues>;
  onCancel: () => void;
  onSubmit: () => void;
}

const inputStyle: React.CSSProperties = {
  height: 34,
  borderRadius: 16,
};

const engineOptions = [
  {
    label: (
      <div className="flex items-center gap-2">
        <ZetaIcon height="20" width="20"/>
        <span>ZETA</span>
      </div>
    ),
    value: "ZETA",
  },
];

const protocolOptions = [
  {label: "HTTP", value: "http"},
  {label: "HTTPS", value: "https"},
];

const deployModeOptions = [
  {
    label: (
      <div className="deploy-mode-option">
        <ApiOutlined/>
        <span>单节点 / 单入口</span>
      </div>
    ),
    value: "SINGLE",
  },
  {
    label: (
      <div className="deploy-mode-option">
        <ClusterOutlined/>
        <span>分离模式集群</span>
      </div>
    ),
    value: "SEPARATED_CLUSTER",
  },
];

const remarkPresets = [
  "客户端已就绪，今天也要稳定发挥呀。",
  "已完成基础连接配置，可用于后续任务绑定与调度。",
  "新的客户端已接入，期待它接下来的表现。",
  "连接成功只是开始，真正的表现还在后面。",
];

const clientNamePresets = [
  "九阴真经",
  "九阳神功",
  "太玄经",
  "易筋经",
  "北冥神功",
  "凌波微步",
  "乾坤大挪移",
  "降龙十八掌",
  "独孤九剑",
  "六脉神剑",
  "黯然销魂掌",
  "龙象般若功",
  "吸星大法",
  "三分归元气",
  "一阳指",
  "乾坤大挪移",
  "葵花宝典",
  "辟邪剑谱",
  "蛤蟆功",
  "小无相功",
  "玄冥神掌",
  "七伤拳",
  "睡梦罗汉拳",
  "天山折梅手"
];

const createDefaultMasterEndpoint = (
  priority = 1
): SeaTunnelClientEndpointDTO => ({
  host: "",
  hostname: "",
  port: 8080,
  role: "MASTER",
  priority,
});

const getRandomItem = (list: string[], lastValue?: string) => {
  if (!list.length) return "";
  if (list.length === 1) return list[0];

  let next = list[Math.floor(Math.random() * list.length)];
  while (next === lastValue) {
    next = list[Math.floor(Math.random() * list.length)];
  }

  return next;
};

const getRandomRemark = (lastValue?: string) => {
  return getRandomItem(remarkPresets, lastValue);
};

const getRandomClientName = (lastValue?: string) => {
  return `ZETA-${getRandomItem(clientNamePresets, lastValue)}`;
};

const AddClientModal: React.FC<AddClientModalProps> = ({
                                                         open,
                                                         form,
                                                         confirmLoading = false,
                                                         mode = "create",
                                                         initialValues,
                                                         onCancel,
                                                         onSubmit,
                                                       }) => {
  const lastRemarkRef = useRef<string>();
  const lastClientNameRef = useRef<string>();

  const isEdit = mode === "edit";

  useEffect(() => {
    if (!open) return;

    if (isEdit) {
      const deployMode: SeaTunnelClientDeployMode =
        initialValues?.deployMode ||
        (initialValues?.masterEndpoints?.length
          ? "SEPARATED_CLUSTER"
          : "SINGLE");

      form.setFieldsValue({
        id: initialValues?.id,
        clientName: initialValues?.clientName,
        engineType: initialValues?.engineType || "ZETA",

        deployMode,
        protocol: initialValues?.protocol || "http",

        contextPath: initialValues?.contextPath,

        clientAddress: initialValues?.clientAddress,
        clientHostname: initialValues?.masterEndpoints?.[0]?.hostname,
        clientPort: initialValues?.clientPort || 8080,

        masterEndpoints: initialValues?.masterEndpoints?.length
          ? initialValues.masterEndpoints
          : [createDefaultMasterEndpoint()],

        authEnabled: Boolean(initialValues?.authEnabled),
        username: initialValues?.username,
        password: initialValues?.password,

        remark: initialValues?.remark,
      });

      return;
    }

    const nextRemark = getRandomRemark(lastRemarkRef.current);
    const nextClientName = getRandomClientName(
      lastClientNameRef.current?.replace(/^ZETA-/, "")
    );

    lastRemarkRef.current = nextRemark;
    lastClientNameRef.current = nextClientName;

    form.resetFields();
    form.setFieldsValue({
      clientName: nextClientName,
      engineType: "ZETA",
      deployMode: "SINGLE",
      protocol: "http",
      contextPath: null,
      clientPort: 8080,
      masterEndpoints: [createDefaultMasterEndpoint()],
      authEnabled: false,
      remark: nextRemark,
    });
  }, [open, isEdit, initialValues, form]);

  return (
    <Modal
      width={820}
      open={open}
      centered
      maskClosable={false}
      destroyOnClose
      onCancel={onCancel}
      title={
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#EEF4FF]">
            <SmileOutlined style={{color: "#3B82F6", fontSize: 18}}/>
          </div>

          <div>
            <div className="text-[18px] font-semibold text-[#101828]">
              {isEdit ? "编辑 Client" : "新增 Client"}
            </div>
            <div className="mt-0.5 text-[13px] text-[#667085]">
              配置 SeaTunnel Zeta REST 连接信息。
            </div>
          </div>
        </div>
      }
      styles={{
        content: {
          borderRadius: 18,
          overflow: "hidden",
        },
        header: {
          padding: "20px 24px 14px",
          marginBottom: 0,
          borderBottom: "1px solid #EEF2F6",
        },
        body: {
          padding: "20px 24px 8px",
          background: "#F8FAFC",
        },
        footer: {
          padding: "14px 24px 18px",
          marginTop: 0,
          borderTop: "1px solid #EEF2F6",
          background: "#FFFFFF",
        },
      }}
      footer={
        <div className="flex justify-end gap-2">
          <Button onClick={onCancel} style={{height: 34, borderRadius: 16}}>
            取消
          </Button>

          <Button
            type="primary"
            loading={confirmLoading}
            onClick={onSubmit}
            style={{height: 34, borderRadius: 16, paddingInline: 18}}
          >
            {isEdit ? "保存修改" : "创建 Client"}
          </Button>
        </div>
      }
    >
      <div className="rounded-2xl border border-[#EAF0F6] bg-white p-5">
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            engineType: "ZETA",
            deployMode: "SINGLE",
            protocol: "http",
            contextPath: null,
            clientPort: 8080,
            masterEndpoints: [createDefaultMasterEndpoint()],
            authEnabled: false,
          }}
        >
          <Form.Item name="id" hidden>
            <Input/>
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="clientName"
                label="客户端名称"
                rules={[{required: true, message: "请输入客户端名称"}]}
              >
                <Input placeholder="例如：ZETA-独孤九剑" style={inputStyle}/>
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item
                name="engineType"
                label="引擎类型"
                rules={[{required: true, message: "请选择引擎类型"}]}
              >
                <Select options={engineOptions}/>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={24}>
              <Form.Item
                name="deployMode"
                label="部署模式"
                rules={[{required: true, message: "请选择部署模式"}]}
              >
                <Segmented
                  className="deploy-mode-segmented"
                  block
                  options={deployModeOptions}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="protocol"
                label="协议"
                rules={[{required: true, message: "请选择协议"}]}
              >
                <Select options={protocolOptions}/>
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item
                name="contextPath"
                label="上下文路径"
                rules={[{required: false, message: "请输入上下文路径"}]}
              >
                <Input placeholder="例如：/" style={inputStyle}/>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item noStyle shouldUpdate>
            {({getFieldValue}) => {
              const deployMode = getFieldValue(
                "deployMode"
              ) as SeaTunnelClientDeployMode;

              if (deployMode === "SEPARATED_CLUSTER") {
                return (
                  <div className="mb-4">
                    <Form.List name="masterEndpoints">
                      {(fields, {add, remove}) => (
                        <>
                          <div className="mb-2 flex items-center justify-between">
                            <div className="text-[13px] font-medium text-[#667085]">
                              Master REST 地址
                            </div>

                            <button
                              type="button"
                              className="inline-flex h-[30px] w-[30px] cursor-pointer items-center justify-center rounded-[10px] border border-[#e6ebf5] bg-white text-[#667085] transition-all duration-200 ease-in-out hover:border-[#93c5fd] hover:bg-[#f8fbff] hover:text-[#3b82f6]"
                              onClick={() =>
                                add(
                                  createDefaultMasterEndpoint(fields.length + 1)
                                )
                              }
                            >
                              <PlusOutlined/>
                            </button>
                          </div>

                          <div className="space-y-2">
                            {fields.map((field, index) => (
                              <div
                                key={field.key}
                                className="grid items-start gap-2"
                                style={{
                                  gridTemplateColumns:
                                    "minmax(0, 1fr) 120px 32px",
                                }}
                              >
                                <Form.Item
                                  name={[field.name, "host"]}
                                  rules={[
                                    {
                                      required: true,
                                      message: "请输入 Master 地址: 127.0.0.1",
                                    },
                                  ]}
                                  style={{marginBottom: 0}}
                                >
                                  <Input
                                    placeholder={`Master ${index + 1} 地址`}
                                    style={inputStyle}
                                  />
                                </Form.Item>

                                <Form.Item
                                  name={[field.name, "port"]}
                                  rules={[
                                    {
                                      required: true,
                                      message: "请输入端口",
                                    },
                                    {
                                      pattern: /^\d+$/,
                                      message: "端口必须为数字",
                                    },
                                  ]}
                                  style={{marginBottom: 0}}
                                >
                                  <Input
                                    placeholder="8080"
                                    style={inputStyle}
                                  />
                                </Form.Item>

                                <Button
                                  type="text"
                                  danger
                                  icon={<DeleteOutlined/>}
                                  disabled={fields.length <= 1}
                                  onClick={() => remove(field.name)}
                                  style={{
                                    width: 32,
                                    height: 34,
                                    borderRadius: 16,
                                    padding: 0,
                                  }}
                                />

                                <Form.Item
                                  name={[field.name, "role"]}
                                  initialValue="MASTER"
                                  hidden
                                >
                                  <Input/>
                                </Form.Item>

                                <Form.Item
                                  name={[field.name, "priority"]}
                                  initialValue={index + 1}
                                  hidden
                                >
                                  <Input/>
                                </Form.Item>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </Form.List>
                  </div>
                );
              }

              return (
                <Row gutter={24}>
                  <Col span={12}>
                    <Form.Item
                      name="clientAddress"
                      label="客户端地址"
                      rules={[
                        {
                          required: true,
                          message: "请输入客户端地址",
                        },
                      ]}
                    >
                      <Input
                        placeholder="例如：192.168.1.10"
                        style={inputStyle}
                      />
                    </Form.Item>
                  </Col>

                  <Col span={12}>
                    <Form.Item
                      name="clientPort"
                      label="客户端端口"
                      rules={[
                        {
                          required: true,
                          message: "请输入端口",
                        },
                        {
                          pattern: /^\d+$/,
                          message: "端口必须为数字",
                        },
                      ]}
                    >
                      <Input placeholder="8080" style={inputStyle}/>
                    </Form.Item>
                  </Col>
                </Row>
              );
            }}
          </Form.Item>

          <div className="mb-4 flex items-center gap-3">
            <Form.Item
              name="authEnabled"
              valuePropName="checked"
              style={{marginBottom: 0}}
            >
              <Switch/>
            </Form.Item>

            <span className="text-[13px] text-[#344054]">开启 Basic Auth</span>
          </div>

          <Form.Item noStyle shouldUpdate>
            {({getFieldValue}) =>
              getFieldValue("authEnabled") ? (
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      name="username"
                      label="用户名"
                      rules={[{required: true, message: "请输入用户名"}]}
                    >
                      <Input placeholder="admin" style={inputStyle}/>
                    </Form.Item>
                  </Col>

                  <Col span={12}>
                    <Form.Item
                      name="password"
                      label="密码"
                      rules={[{required: true, message: "请输入密码"}]}
                    >
                      <Input.Password
                        placeholder="请输入密码"
                        style={inputStyle}
                      />
                    </Form.Item>
                  </Col>
                </Row>
              ) : null
            }
          </Form.Item>

          <Form.Item name="remark" label="备注">
            <TextArea
              placeholder="补充说明这个 Client 的用途、环境或备注信息"
              autoSize={{minRows: 3, maxRows: 4}}
              style={{borderRadius: 10}}
            />
          </Form.Item>
        </Form>
      </div>
    </Modal>
  );
};

export default AddClientModal;

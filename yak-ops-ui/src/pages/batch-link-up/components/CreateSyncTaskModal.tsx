import {
  ArrowRightOutlined,
  DatabaseOutlined,
  TableOutlined,
} from "@ant-design/icons";
import {
  Button,
  ConfigProvider,
  Drawer,
  Form,
  Input,
  Radio,
  Select,
  message,
} from "antd";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

import {
  BRAND_COLOR,
  BRAND_COLOR_BORDER,
  BRAND_COLOR_SOFT,
  BRAND_COLOR_SOFT_HOVER,
  BRAND_THEME,
} from "@/styles/brand";

import { linkupJobDefinitionApi } from "../api";
import { generateDataSourceOptions } from "../DataSourceSelect";
import {
  buildCreatePayload,
  extractGeneratedId,
  extractSavedId,
  isApiSuccess,
  responseMessage,
  type CreateSyncTaskValues,
  type SyncMode,
} from "../detail/model";
import { connectorIdForDataSourceType } from "../detail/form-schema/valueAdapter";

interface CreateSyncTaskDrawerProps {
  open: boolean;
  onCancel: () => void;
  onCreated: (taskId: string, mode: SyncMode) => void;
}

interface CreateSyncTaskFormValues extends CreateSyncTaskValues {
  sourceDbType: string;
  targetDbType: string;
}

interface ConnectorOption {
  value: string;
  label: ReactNode;
  connectorType?: string;
  pluginName?: string;
}

interface CreateSyncEndpoint {
  dbType: string;
  connectorId: string;
  connectorType: string;
  pluginName: string;
}

const DEFAULT_DB_TYPE = "MYSQL";

const modeOptions: Array<{
  value: SyncMode;
  title: string;
  description: string;
  icon: ReactNode;
}> = [
  {
    value: "GUIDE_SINGLE",
    title: "单表同步",
    description: "配置一张来源表到一张目标表的离线同步任务",
    icon: <TableOutlined />,
  },
  {
    value: "GUIDE_MULTI",
    title: "多表同步",
    description: "批量选择多张来源表，并按规则写入目标端",
    icon: <DatabaseOutlined />,
  },
];

const brandCssVariables = {
  "--yak-brand-color": BRAND_COLOR,
  "--yak-brand-color-border": BRAND_COLOR_BORDER,
  "--yak-brand-color-soft": BRAND_COLOR_SOFT,
  "--yak-brand-color-soft-hover": BRAND_COLOR_SOFT_HOVER,
} as CSSProperties;

const buildDefaultJobName = (sourceDbType: string, targetDbType: string) =>
  `${sourceDbType} → ${targetDbType} 离线同步`.slice(0, 64);

const resolveEndpoint = (
  dbType: string,
  options: ConnectorOption[]
): CreateSyncEndpoint => {
  const option = options.find((item) => item.value === dbType);
  const connectorId = connectorIdForDataSourceType(dbType);

  return {
    dbType,
    connectorId,
    connectorType: connectorId,
    pluginName: option?.pluginName || dbType,
  };
};

const applyConnectorSelection = (
  payload: any,
  source: CreateSyncEndpoint,
  target: CreateSyncEndpoint
) => {
  const patchNode = (
    node: any,
    kind: "source" | "sink",
    endpoint: CreateSyncEndpoint
  ) => {
    const nodeKind = node?.data?.nodeType || node?.type;

    if (nodeKind !== kind) return node;

    return {
      ...node,
      data: {
        ...(node?.data || {}),
        dbType: endpoint.dbType,
        connectorId: endpoint.connectorId,
        connectorType: endpoint.connectorType,
        pluginName: endpoint.pluginName,
        config: {
          ...(node?.data?.config || {}),
          dbType: endpoint.dbType,
          connectorId: endpoint.connectorId,
          connectorType: endpoint.connectorType,
          pluginName: endpoint.pluginName,
        },
      },
    };
  };

  return {
    ...payload,
    basic: {
      ...(payload?.basic || {}),
      sourceType: source.dbType,
      targetType: target.dbType,
    },
    workflow: {
      ...(payload?.workflow || {}),
      sourceType: source,
      targetType: target,
      nodes: Array.isArray(payload?.workflow?.nodes)
        ? payload.workflow.nodes.map((node: any) => {
            const sourceNode = patchNode(node, "source", source);
            return patchNode(sourceNode, "sink", target);
          })
        : [],
    },
  };
};

export default function CreateSyncTaskDrawer({
  open,
  onCancel,
  onCreated,
}: CreateSyncTaskDrawerProps) {
  const [form] = Form.useForm<CreateSyncTaskFormValues>();
  const [submitting, setSubmitting] = useState(false);
  const autoJobNameRef = useRef("");

  const connectorOptions = useMemo(
    () => generateDataSourceOptions() as ConnectorOption[],
    []
  );

  const sourceDbType = Form.useWatch("sourceDbType", form);
  const targetDbType = Form.useWatch("targetDbType", form);

  useEffect(() => {
    if (!open) return;

    const defaultDbType =
      connectorOptions.find((item) => item.value === DEFAULT_DB_TYPE)?.value ||
      connectorOptions[0]?.value ||
      "";

    const defaultJobName = buildDefaultJobName(defaultDbType, defaultDbType);

    autoJobNameRef.current = defaultJobName;

    form.setFieldsValue({
      sourceDbType: defaultDbType,
      targetDbType: defaultDbType,
      jobName: defaultJobName,
      jobDesc: undefined,
      mode: "GUIDE_SINGLE",
    });
  }, [connectorOptions, form, open]);

  const updateAutoJobName = (side: "source" | "target", value: string) => {
    const nextSourceDbType =
      side === "source" ? value : form.getFieldValue("sourceDbType") || "";

    const nextTargetDbType =
      side === "target" ? value : form.getFieldValue("targetDbType") || "";

    if (!nextSourceDbType || !nextTargetDbType) return;

    const currentJobName = form.getFieldValue("jobName")?.trim() || "";
    const nextJobName = buildDefaultJobName(nextSourceDbType, nextTargetDbType);

    if (!currentJobName || currentJobName === autoJobNameRef.current) {
      form.setFieldValue("jobName", nextJobName);
    }

    autoJobNameRef.current = nextJobName;
  };

  const handleCancel = () => {
    if (submitting) return;

    form.resetFields();
    autoJobNameRef.current = "";
    onCancel();
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      const normalizedValues: CreateSyncTaskValues = {
        jobName: values.jobName.trim(),
        jobDesc: values.jobDesc?.trim(),
        mode: values.mode,
      };

      const source = resolveEndpoint(values.sourceDbType, connectorOptions);
      const target = resolveEndpoint(values.targetDbType, connectorOptions);

      setSubmitting(true);

      const idResponse = await linkupJobDefinitionApi.getUniqueId();

      if (!isApiSuccess(idResponse)) {
        message.error(responseMessage(idResponse, "生成任务 ID 失败"));
        return;
      }

      const taskId = extractGeneratedId(idResponse);

      if (!taskId) {
        message.error("生成任务 ID 失败");
        return;
      }

      const payload = applyConnectorSelection(
        buildCreatePayload(taskId, normalizedValues),
        source,
        target
      );

      const saveResponse = await linkupJobDefinitionApi.createDraft(payload);

      if (!isApiSuccess(saveResponse)) {
        message.error(responseMessage(saveResponse, "创建同步任务失败"));
        return;
      }

      const createdId = extractSavedId(saveResponse, taskId);

      form.resetFields();
      autoJobNameRef.current = "";
      message.success("任务草稿已创建，请继续配置数据源和同步表");
      onCreated(createdId, normalizedValues.mode);
    } catch (error: any) {
      if (error?.errorFields) return;

      message.error(error?.message || "创建同步任务失败");
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
              disabled={!sourceDbType || !targetDbType}
              onClick={handleSubmit}
              className="!h-9 !rounded-lg !px-5 !font-medium !text-white"
            >
              创建并配置
            </Button>
          </div>
        }
        styles={{
          header: {
            padding: "18px 24px",
            borderBottom: "1px solid #eaecf0",
          },
          body: {
            padding: "24px",
          },
        }}
      >
        <Form<CreateSyncTaskFormValues>
          form={form}
          layout="vertical"
          requiredMark="optional"
        >
          <div className="mb-6">
            <div className="grid grid-cols-[minmax(0,1fr)_32px_minmax(0,1fr)] items-end gap-3">
              <Form.Item
                name="sourceDbType"
                label="来源类型"
                className="!mb-0"
                rules={[{ required: true, message: "请选择来源类型" }]}
              >
                <Select
                  showSearch
                  variant="filled"
                  options={connectorOptions}
                  placeholder="请选择来源类型"
                  optionFilterProp="value"
                  filterOption={(input, option) =>
                    String(option?.value || "")
                      .toLowerCase()
                      .includes(input.toLowerCase())
                  }
                  onChange={(value) => updateAutoJobName("source", value)}
                />
              </Form.Item>

              <div className="flex h-8 items-center justify-center text-[#98a2b3]">
                <ArrowRightOutlined />
              </div>

              <Form.Item
                name="targetDbType"
                label="目标类型"
                className="!mb-0"
                rules={[{ required: true, message: "请选择目标类型" }]}
              >
                <Select
                  showSearch
                  variant="filled"
                  options={connectorOptions}
                  placeholder="请选择目标类型"
                  optionFilterProp="value"
                  filterOption={(input, option) =>
                    String(option?.value || "")
                      .toLowerCase()
                      .includes(input.toLowerCase())
                  }
                  onChange={(value) => updateAutoJobName("target", value)}
                />
              </Form.Item>
            </div>
          </div>

          <Form.Item
            name="jobName"
            label="任务名称"
            rules={[
              { required: true, message: "请输入任务名称" },
              { max: 64, message: "任务名称不能超过 64 个字符" },
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
            rules={[{ max: 200, message: "任务描述不能超过 200 个字符" }]}
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
            rules={[{ required: true, message: "请选择同步类型" }]}
          >
            <Radio.Group className="grid w-full grid-cols-2 gap-3">
              {modeOptions.map((option) => (
                <Radio.Button
                  key={option.value}
                  value={option.value}
                  className={[
                    "!h-auto",
                    "!rounded-lg",
                    "!border",
                    "!border-[#e4e7ec]",
                    "!px-4",
                    "!py-4",
                    "!shadow-none",
                    "hover:!border-[var(--yak-brand-color-border)]",
                    "hover:!bg-[var(--yak-brand-color-soft-hover)]",
                    "[&.ant-radio-button-wrapper-checked]:!border-[var(--yak-brand-color)]",
                    "[&.ant-radio-button-wrapper-checked]:!bg-[var(--yak-brand-color-soft)]",
                    "[&.ant-radio-button-wrapper-checked]:!text-inherit",
                    "before:!hidden",
                  ].join(" ")}
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

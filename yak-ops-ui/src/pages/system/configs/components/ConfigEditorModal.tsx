import { CodeOutlined } from '@ant-design/icons';
import {
  Alert,
  AutoComplete,
  Button,
  Form,
  Input,
  Modal,
  Select,
  message,
} from 'antd';
import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';

import {
  type ConfigInput,
  type ConfigStatus,
  type SystemConfig,
  createConfig,
  formatConfigValue,
  getConfig,
  updateConfig,
} from '@/services/security/configs';

const CONFIG_STATUS_ENABLED: ConfigStatus = 1;
const CONFIG_STATUS_DISABLED: ConfigStatus = 2;

export interface ConfigEditorModalRef {
  openCreate: () => void;
  openEdit: (config: SystemConfig) => void;
}

interface ConfigEditorModalProps {
  groups: string[];
  onSuccess: () => void;
}

const defaultValues: ConfigInput = {
  valueGroup: '',
  valueName: '',
  value: '',
  status: CONFIG_STATUS_ENABLED,
  memo: '',
};

const errorText = (error: unknown, fallback: string): string =>
  error instanceof Error && error.message
    ? error.message
    : fallback;

const ConfigEditorModal = forwardRef<
  ConfigEditorModalRef,
  ConfigEditorModalProps
>(({ groups, onSuccess }, ref) => {
  const [form] = Form.useForm<ConfigInput>();
  const requestSequenceRef = useRef(0);

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number>();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const resetAndClose = useCallback(() => {
    requestSequenceRef.current += 1;
    setOpen(false);
    setEditingId(undefined);
    setLoading(false);
    form.resetFields();
  }, [form]);

  const openCreate = useCallback(() => {
    requestSequenceRef.current += 1;
    setEditingId(undefined);
    setLoading(false);
    form.setFieldsValue(defaultValues);
    setOpen(true);
  }, [form]);

  const openEdit = useCallback(
    (config: SystemConfig) => {
      const sequence = ++requestSequenceRef.current;
      setEditingId(config.id);
      setOpen(true);
      setLoading(true);
      form.setFieldsValue({
        valueGroup: config.valueGroup ?? '',
        valueName: config.valueName ?? '',
        value: config.value ?? '',
        status: config.status ?? CONFIG_STATUS_ENABLED,
        memo: config.memo ?? '',
      });

      void getConfig(config.id)
        .then((detail) => {
          if (sequence !== requestSequenceRef.current) return;
          form.setFieldsValue({
            valueGroup: detail.valueGroup ?? '',
            valueName: detail.valueName ?? '',
            value: detail.value ?? '',
            status: detail.status ?? CONFIG_STATUS_ENABLED,
            memo: detail.memo ?? '',
          });
        })
        .catch((error) => {
          if (sequence !== requestSequenceRef.current) return;
          message.error(errorText(error, '配置详情加载失败'));
        })
        .finally(() => {
          if (sequence === requestSequenceRef.current) {
            setLoading(false);
          }
        });
    },
    [form],
  );

  useImperativeHandle(
    ref,
    () => ({ openCreate, openEdit }),
    [openCreate, openEdit],
  );

  const close = () => {
    if (!saving) resetAndClose();
  };

  const formatValue = () => {
    const value = form.getFieldValue('value') ?? '';
    const formatted = formatConfigValue(value);

    if (formatted === value) {
      message.info('当前配置值不是可格式化的 JSON，已保持原内容');
      return;
    }

    form.setFieldValue('value', formatted);
  };

  const save = async (values: ConfigInput) => {
    if (saving) return;
    setSaving(true);

    const currentEditingId = editingId;
    const body: ConfigInput = {
      valueGroup: values.valueGroup.trim(),
      valueName: values.valueName.trim(),
      value: values.value ?? '',
      status: values.status,
      memo: values.memo?.trim() ?? '',
    };

    try {
      if (currentEditingId !== undefined) {
        await updateConfig(currentEditingId, body);
      } else {
        await createConfig(body);
      }

      message.success(
        currentEditingId !== undefined
          ? '配置已更新'
          : '配置已创建',
      );
      resetAndClose();
      onSuccess();
    } catch (error) {
      message.error(
        errorText(
          error,
          currentEditingId !== undefined
            ? '配置更新失败'
            : '配置创建失败',
        ),
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      title={editingId !== undefined ? '编辑配置' : '新增配置'}
      width={620}
      destroyOnClose
      maskClosable={false}
      keyboard={!saving}
      closable={!saving}
      confirmLoading={saving || loading}
      okText="保存"
      cancelText="取消"
      onCancel={close}
      onOk={() => form.submit()}
    >
      <Alert
        showIcon
        type="info"
        className="mb-5"
        message="配置分组与配置名称共同组成唯一配置项"
        description="修改名称或分组后，读取配置的调用方也需要同步调整。配置值允许为空字符串。"
      />

      <Form<ConfigInput>
        form={form}
        layout="vertical"
        initialValues={defaultValues}
        preserve={false}
        disabled={loading || saving}
        onFinish={(values) => void save(values)}
      >
        <Form.Item
          name="valueGroup"
          label="配置分组"
          rules={[
            {
              required: true,
              whitespace: true,
              message: '请输入配置分组',
            },
          ]}
        >
          <AutoComplete
            options={groups.map((group) => ({
              value: group,
              label: group,
            }))}
            filterOption={(input, option) =>
              String(option?.value ?? '')
                .toLocaleLowerCase()
                .includes(input.toLocaleLowerCase())
            }
            placeholder="请选择或输入配置分组"
          />
        </Form.Item>

        <Form.Item
          name="valueName"
          label="配置名称"
          rules={[
            {
              required: true,
              whitespace: true,
              message: '请输入配置名称',
            },
          ]}
        >
          <Input
            placeholder="请输入配置名称"
            maxLength={128}
            showCount
          />
        </Form.Item>

        <Form.Item
          name="value"
          label={
            <div className="flex items-center gap-3">
              <span>配置值</span>
              <Button
                type="link"
                size="small"
                icon={<CodeOutlined />}
                className="!h-auto !p-0"
                onClick={formatValue}
              >
                格式化 JSON
              </Button>
            </div>
          }
        >
          <Input.TextArea
            autoSize={{ minRows: 5, maxRows: 12 }}
            placeholder="请输入配置值，允许为空字符串"
          />
        </Form.Item>

        <Form.Item
          name="status"
          label="配置状态"
          className="w-[180px]"
          rules={[{ required: true, message: '请选择配置状态' }]}
        >
          <Select
            options={[
              {
                value: CONFIG_STATUS_ENABLED,
                label: '启用',
              },
              {
                value: CONFIG_STATUS_DISABLED,
                label: '停用',
              },
            ]}
          />
        </Form.Item>

        <Form.Item name="memo" label="备注">
          <Input.TextArea
            autoSize={{ minRows: 3, maxRows: 6 }}
            maxLength={500}
            showCount
            placeholder="请输入配置用途、影响范围或修改注意事项"
          />
        </Form.Item>
      </Form>
    </Modal>
  );
});

ConfigEditorModal.displayName = 'ConfigEditorModal';

export default ConfigEditorModal;

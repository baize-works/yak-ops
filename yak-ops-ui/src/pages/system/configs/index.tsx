import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { Button, Form, Input, Modal, message, Select, Space, Switch, Tag } from 'antd';
import { useEffect, useRef, useState } from 'react';
import { PermissionGuard, SecurityQueryTable } from '@/components/security';
import {
  type ConfigInput,
  type ConfigStatus,
  type ConfigValueType,
  checkConfigDeletion,
  createConfig,
  deleteConfig,
  listConfigGroups,
  pageConfigs,
  type SystemConfig,
  sanitizeConfigInput,
  toggleConfig,
  updateConfig,
} from '@/services/security/configs';

const permission = (action: string) => `system:config:${action}`;
const initialValues: ConfigInput = {
  configKey: '',
  configName: '',
  groupCode: '',
  valueType: 'STRING',
  status: 'ENABLED',
  sensitive: false,
};

export default function ConfigsPage() {
  const actionRef = useRef<ActionType>();
  const [form] = Form.useForm<ConfigInput>();
  const [groups, setGroups] = useState<string[]>([]);
  const [editing, setEditing] = useState<SystemConfig>();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    listConfigGroups()
      .then(setGroups)
      .catch(() => setGroups([]));
  }, []);
  const reload = () => actionRef.current?.reload();
  const showForm = (row?: SystemConfig) => {
    setEditing(row);
    setOpen(true);
    form.setFieldsValue(row ? { ...row, configValue: undefined } : initialValues);
  };
  const remove = async (row: SystemConfig) => {
    const check = await checkConfigDeletion(row.id);
    Modal.confirm({
      title: `删除配置“${row.configName}”？`,
      content: check.deletable
        ? '引用检查通过，删除后无法恢复。'
        : (check.reason ?? (check.systemBuiltIn ? '系统内置配置不能删除。' : '配置仍被引用，不能删除。')),
      okButtonProps: { danger: true, disabled: !check.deletable },
      onOk: async () => {
        await deleteConfig(row.id);
        message.success('配置已删除');
        reload();
      },
    });
  };
  const columns: ProColumns<SystemConfig>[] = [
    { title: '配置 Key', dataIndex: 'configKey' },
    { title: '名称', dataIndex: 'configName' },
    {
      title: '分组',
      dataIndex: 'groupCode',
      valueType: 'select',
      fieldProps: { options: groups.map((value) => ({ value, label: value })) },
    },
    { title: '类型', dataIndex: 'valueType', search: false },
    {
      title: '敏感',
      dataIndex: 'sensitive',
      search: false,
      render: (_, row) => (row.sensitive ? <Tag color="orange">敏感</Tag> : '-'),
    },
    {
      title: '状态',
      dataIndex: 'status',
      valueType: 'select',
      valueEnum: { ENABLED: { text: '启用', status: 'Success' }, DISABLED: { text: '停用', status: 'Default' } },
      render: (_, row) => (
        <PermissionGuard mode="one" permission={permission('toggle')} behavior="disable">
          <Switch
            checked={row.status === 'ENABLED'}
            onChange={async (checked) => {
              await toggleConfig(row.id, checked ? 'ENABLED' : 'DISABLED');
              message.success('状态已更新');
              reload();
            }}
          />
        </PermissionGuard>
      ),
    },
    { title: '更新时间', dataIndex: 'updateTime', valueType: 'dateTime', search: false },
    {
      title: '操作',
      valueType: 'option',
      render: (_, row) => (
        <Space>
          <PermissionGuard mode="one" permission={permission('update')}>
            <Button type="link" onClick={() => showForm(row)}>
              编辑
            </Button>
          </PermissionGuard>
          <PermissionGuard mode="one" permission={permission('delete')}>
            <Button type="link" danger onClick={() => remove(row)}>
              删除
            </Button>
          </PermissionGuard>
        </Space>
      ),
    },
  ];
  return (
    <section className="p-6">
      <SecurityQueryTable<SystemConfig>
        actionRef={actionRef}
        columns={columns}
        request={async (params) => {
          const result = await pageConfigs({
            pageNum: params.current ?? 1,
            pageSize: params.pageSize ?? 10,
            configKey: params.configKey as string,
            configName: params.configName as string,
            groupCode: params.groupCode as string,
            status: params.status as ConfigStatus,
          });
          return { data: result.records, total: result.total, success: true };
        }}
        toolBarRender={() => [
          <PermissionGuard key="create" mode="one" permission={permission('create')}>
            <Button type="primary" onClick={() => showForm()}>
              新增配置
            </Button>
          </PermissionGuard>,
        ]}
      />
      <Modal
        open={open}
        title={editing ? '编辑配置' : '新增配置'}
        destroyOnClose
        onCancel={() => setOpen(false)}
        onOk={() => form.submit()}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={initialValues}
          onFinish={async (values) => {
            const body = sanitizeConfigInput(values, Boolean(editing?.sensitive));
            editing ? await updateConfig(editing.id, body) : await createConfig(body);
            message.success('保存成功');
            setOpen(false);
            form.resetFields();
            reload();
          }}
        >
          <Form.Item name="configKey" label="配置 Key" rules={[{ required: true }]}>
            <Input disabled={Boolean(editing)} />
          </Form.Item>
          <Form.Item name="configName" label="名称" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="groupCode" label="分组" rules={[{ required: true }]}>
            <Select showSearch options={groups.map((value) => ({ value, label: value }))} />
          </Form.Item>
          <Form.Item name="valueType" label="类型" rules={[{ required: true }]}>
            <Select
              options={
                ['STRING', 'NUMBER', 'BOOLEAN', 'JSON'].map((value) => ({ value, label: value })) as Array<{
                  value: ConfigValueType;
                  label: string;
                }>
              }
            />
          </Form.Item>
          <Form.Item name="status" label="状态">
            <Select
              options={[
                { value: 'ENABLED', label: '启用' },
                { value: 'DISABLED', label: '停用' },
              ]}
            />
          </Form.Item>
          <Form.Item name="sensitive" label="敏感配置" valuePropName="checked">
            <Switch disabled={Boolean(editing)} />
          </Form.Item>
          <Form.Item
            name="configValue"
            label="配置值"
            extra={editing?.sensitive ? '敏感值不会回显；留空表示不修改。' : undefined}
          >
            <Input.Password
              autoComplete="new-password"
              placeholder={editing?.sensitive ? '留空表示不修改' : '请输入配置值'}
            />
          </Form.Item>
        </Form>
      </Modal>
    </section>
  );
}

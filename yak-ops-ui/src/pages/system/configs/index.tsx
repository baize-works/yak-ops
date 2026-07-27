import type {
  ActionType,
  ProColumns,
} from '@ant-design/pro-components';
import {
  AutoComplete,
  Button,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Switch,
  message,
} from 'antd';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  PermissionGuard,
  SecurityQueryTable,
} from '@/components/security';
import {
  type ConfigInput,
  type ConfigStatus,
  createConfig,
  deleteConfig,
  listConfigGroups,
  pageConfigs,
  type SystemConfig,
  toggleConfig,
  updateConfig,
} from '@/services/security/configs';

/**
 * 系统配置权限编码。
 */
const permission = (
  action: string,
): string => `security:config:${action}`;

/**
 * 后端配置状态：
 *
 * 1：正常
 * 2：禁用
 */
const CONFIG_STATUS_ENABLED: ConfigStatus = 1;
const CONFIG_STATUS_DISABLED: ConfigStatus = 2;

/**
 * 新增配置默认值。
 */
const initialValues: ConfigInput = {
  valueGroup: '',
  valueName: '',
  value: '',
  status: CONFIG_STATUS_ENABLED,
  memo: '',
};

/**
 * 将表格搜索参数中的状态转换为后端需要的数字状态。
 */
const normalizeStatus = (
  value: unknown,
): ConfigStatus | undefined => {
  const status = Number(value);

  if (
    status === CONFIG_STATUS_ENABLED ||
    status === CONFIG_STATUS_DISABLED
  ) {
    return status as ConfigStatus;
  }

  return undefined;
};

export default function ConfigsPage() {
  const actionRef = useRef<ActionType>();
  const [form] = Form.useForm<ConfigInput>();

  const [groups, setGroups] =
    useState<string[]>([]);
  const [editing, setEditing] =
    useState<SystemConfig>();
  const [open, setOpen] =
    useState(false);
  const [saving, setSaving] =
    useState(false);

  /**
   * 查询配置分组。
   */
  const loadGroups = useCallback(async () => {
    try {
      const data =
        await listConfigGroups();

      const normalizedGroups =
        Array.isArray(data)
          ? data
              .filter(
                (
                  value,
                ): value is string =>
                  typeof value ===
                    'string' &&
                  value.trim().length >
                    0,
              )
              .map((value) =>
                value.trim(),
              )
          : [];

      setGroups([
        ...new Set(
          normalizedGroups,
        ),
      ]);
    } catch {
      setGroups([]);
    }
  }, []);

  useEffect(() => {
    void loadGroups();
  }, [loadGroups]);

  /**
   * 分组下拉选项。
   */
  const groupOptions = useMemo(
    () =>
      (
        Array.isArray(groups)
          ? groups
          : []
      ).map((value) => ({
        value,
        label: value,
      })),
    [groups],
  );

  /**
   * 刷新分页表格。
   */
  const reload = useCallback(() => {
    actionRef.current?.reload();
  }, []);

  /**
   * 关闭编辑弹窗。
   */
  const closeForm = () => {
    setOpen(false);
    setEditing(undefined);
    form.resetFields();
  };

  /**
   * 打开新增或编辑弹窗。
   */
  const showForm = (
    row?: SystemConfig,
  ) => {
    setEditing(row);

    if (row) {
      form.setFieldsValue({
        valueGroup:
          row.valueGroup ?? '',
        valueName:
          row.valueName ?? '',
        value: row.value ?? '',
        status:
          row.status ??
          CONFIG_STATUS_ENABLED,
        memo: row.memo ?? '',
      });
    } else {
      form.setFieldsValue(
        initialValues,
      );
    }

    setOpen(true);
  };

  /**
   * 删除配置。
   */
  const remove = (
    row: SystemConfig,
  ) => {
    Modal.confirm({
      title: `删除配置“${row.valueName}”？`,
      content:
        '删除后无法恢复，请确认该配置已经不再使用。',
      okText: '删除',
      cancelText: '取消',
      okButtonProps: {
        danger: true,
      },
      onOk: async () => {
        try {
          await deleteConfig(
            row.id,
          );

          message.success(
            '配置已删除',
          );

          reload();
          await loadGroups();
        } catch (error) {
          Modal.error({
            title: '删除配置失败',
            content:
              error instanceof Error
                ? error.message
                : '删除配置时发生异常，请稍后重试。',
          });

          throw error;
        }
      },
    });
  };

  /**
   * 配置表格列。
   */
  const columns: ProColumns<SystemConfig>[] =
    [
      {
        title: '配置分组',
        dataIndex: 'valueGroup',
        valueType: 'select',
        fieldProps: {
          options: groupOptions,
          showSearch: true,
          allowClear: true,
          optionFilterProp:
            'label',
        },
      },
      {
        title: '配置名称',
        dataIndex: 'valueName',
      },
      {
        title: '配置值',
        dataIndex: 'value',
        search: false,
        ellipsis: true,
        copyable: true,
      },
      {
        title: '备注',
        dataIndex: 'memo',
        search: false,
        ellipsis: true,
        renderText: (
          value,
        ) => value || '-',
      },
      {
        title: '状态',
        dataIndex: 'status',
        valueType: 'select',
        valueEnum: {
          1: {
            text: '启用',
            status: 'Success',
          },
          2: {
            text: '停用',
            status: 'Default',
          },
        },
        render: (_, row) => (
          <PermissionGuard
            mode="one"
            permission={permission(
              'toggle',
            )}
            behavior="disable"
          >
            <Switch
              checked={
                row.status ===
                CONFIG_STATUS_ENABLED
              }
              checkedChildren="启用"
              unCheckedChildren="停用"
              onChange={async (
                checked,
              ) => {
                try {
                  await toggleConfig(
                    row.id,
                    checked
                      ? CONFIG_STATUS_ENABLED
                      : CONFIG_STATUS_DISABLED,
                  );

                  message.success(
                    '配置状态已更新',
                  );

                  reload();
                } catch {
                  message.error(
                    '配置状态更新失败',
                  );
                }
              }}
            />
          </PermissionGuard>
        ),
      },
      {
        title: '操作人',
        dataIndex: 'operator',
        search: false,
        renderText: (
          value,
        ) => value || '-',
      },
      {
        title: '创建时间',
        dataIndex: 'createTime',
        valueType: 'dateTime',
        search: false,
      },
      {
        title: '更新时间',
        dataIndex: 'updateTime',
        valueType: 'dateTime',
        search: false,
      },
      {
        title: '操作',
        valueType: 'option',
        fixed: 'right',
        width: 140,
        render: (_, row) => (
          <Space size={0}>
            <PermissionGuard
              mode="one"
              permission={permission(
                'update',
              )}
            >
              <Button
                type="link"
                onClick={() =>
                  showForm(row)
                }
              >
                编辑
              </Button>
            </PermissionGuard>

            <PermissionGuard
              mode="one"
              permission={permission(
                'delete',
              )}
            >
              <Button
                type="link"
                danger
                onClick={() =>
                  remove(row)
                }
              >
                删除
              </Button>
            </PermissionGuard>
          </Space>
        ),
      },
    ];

  /**
   * 保存配置。
   */
  const handleSave = async (
    values: ConfigInput,
  ) => {
    setSaving(true);

    try {
      const body: ConfigInput = {
        valueGroup:
          values.valueGroup.trim(),
        valueName:
          values.valueName.trim(),
        value: values.value,
        status:
          values.status,
        memo:
          values.memo?.trim() ??
          '',
      };

      if (editing) {
        await updateConfig(
          editing.id,
          body,
        );
      } else {
        await createConfig(body);
      }

      message.success(
        editing
          ? '配置已更新'
          : '配置已创建',
      );

      closeForm();
      reload();
      await loadGroups();
    } catch {
      message.error(
        editing
          ? '配置更新失败'
          : '配置创建失败',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="p-6">
      <SecurityQueryTable<SystemConfig>
        actionRef={actionRef}
        rowKey="id"
        columns={columns}
        scroll={{
          x: 1100,
        }}
        request={async (
          params,
        ) => {
          try {
            const result =
              await pageConfigs({
                pageNum:
                  params.current ??
                  1,
                pageSize:
                  params.pageSize ??
                  10,
                valueGroup:
                  typeof params.valueGroup ===
                  'string'
                    ? params.valueGroup
                    : undefined,
                valueName:
                  typeof params.valueName ===
                  'string'
                    ? params.valueName
                    : undefined,
                status:
                  normalizeStatus(
                    params.status,
                  ),
              });

            return {
              data:
                Array.isArray(
                  result.records,
                )
                  ? result.records
                  : [],
              total: Number(
                result.total ?? 0,
              ),
              success: true,
            };
          } catch {
            return {
              data: [],
              total: 0,
              success: false,
            };
          }
        }}
        toolBarRender={() => [
          <PermissionGuard
            key="create"
            mode="one"
            permission={permission(
              'create',
            )}
          >
            <Button
              type="primary"
              onClick={() =>
                showForm()
              }
            >
              新增配置
            </Button>
          </PermissionGuard>,
        ]}
      />

      <Modal
        open={open}
        title={
          editing
            ? '编辑配置'
            : '新增配置'
        }
        destroyOnClose
        maskClosable={false}
        confirmLoading={saving}
        okText="保存"
        cancelText="取消"
        onCancel={closeForm}
        onOk={() =>
          form.submit()
        }
      >
        <Form<ConfigInput>
          form={form}
          layout="vertical"
          initialValues={
            initialValues
          }
          preserve={false}
          onFinish={
            handleSave
          }
        >
          <Form.Item
            name="valueGroup"
            label="配置分组"
            rules={[
              {
                required: true,
                message:
                  '请输入配置分组',
              },
              {
                whitespace: true,
                message:
                  '配置分组不能为空',
              },
            ]}
          >
            <AutoComplete
              options={
                groupOptions
              }
              filterOption={(
                inputValue,
                option,
              ) =>
                String(
                  option?.value ??
                    '',
                )
                  .toLowerCase()
                  .includes(
                    inputValue.toLowerCase(),
                  )
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
                message:
                  '请输入配置名称',
              },
              {
                whitespace: true,
                message:
                  '配置名称不能为空',
              },
            ]}
          >
            <Input
              placeholder="请输入配置名称"
              maxLength={128}
            />
          </Form.Item>

          <Form.Item
            name="value"
            label="配置值"
            rules={[
              {
                required: true,
                message:
                  '请输入配置值',
              },
            ]}
          >
            <Input.TextArea
              rows={4}
              placeholder="请输入配置值"
            />
          </Form.Item>

          <Form.Item
            name="status"
            label="状态"
            rules={[
              {
                required: true,
                message:
                  '请选择配置状态',
              },
            ]}
          >
            <Select
              options={[
                {
                  value:
                    CONFIG_STATUS_ENABLED,
                  label: '启用',
                },
                {
                  value:
                    CONFIG_STATUS_DISABLED,
                  label: '停用',
                },
              ]}
            />
          </Form.Item>

          <Form.Item
            name="memo"
            label="备注"
          >
            <Input.TextArea
              rows={3}
              maxLength={500}
              showCount
              placeholder="请输入备注"
            />
          </Form.Item>
        </Form>
      </Modal>
    </section>
  );
}
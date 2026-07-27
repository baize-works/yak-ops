import { ApartmentOutlined } from '@ant-design/icons';
import {
  Alert,
  Button,
  Drawer,
  Form,
  Input,
  Space,
  TreeSelect,
  message,
} from 'antd';
import { useEffect, useMemo, useState } from 'react';

import {
  type DepartmentInput,
  type DepartmentVO,
  createDepartment,
  updateDepartment,
} from '@/services/security/departments';

import {
  collectDepartmentIds,
  getDepartmentForest,
  getDirectChildren,
} from './tree';

interface DepartmentEditorDrawerProps {
  open: boolean;
  root?: DepartmentVO;
  department?: DepartmentVO;
  defaultParentId?: number;
  onClose: () => void;
  onSuccess: () => void;
}

interface DepartmentFormValues {
  deptName: string;
  description?: string;
  parentId: number;
}

interface ParentTreeNode {
  value: number;
  title: string;
  children?: ParentTreeNode[];
}

const errorText = (error: unknown, fallback: string): string =>
  error instanceof Error && error.message
    ? error.message
    : fallback;

const departmentName = (department?: DepartmentVO): string =>
  department?.deptName || '未命名部门';

const toParentTreeData = (
  departments: DepartmentVO[],
  blockedIds: Set<number>,
  path = new Set<string>(),
): ParentTreeNode[] =>
  departments.flatMap((department) => {
    const key = String(department.id);
    if (path.has(key) || blockedIds.has(department.id)) {
      return [];
    }

    const nextPath = new Set(path);
    nextPath.add(key);
    const children = toParentTreeData(
      getDirectChildren(department),
      blockedIds,
      nextPath,
    );

    return [
      {
        value: department.id,
        title: departmentName(department),
        ...(children.length > 0 ? { children } : {}),
      },
    ];
  });

export default function DepartmentEditorDrawer({
  open,
  root,
  department,
  defaultParentId,
  onClose,
  onSuccess,
}: DepartmentEditorDrawerProps) {
  const [form] = Form.useForm<DepartmentFormValues>();
  const [saving, setSaving] = useState(false);
  const editing = Boolean(department);

  const blockedIds = useMemo(() => {
    if (!department) return new Set<number>();

    return new Set([
      department.id,
      ...collectDepartmentIds(getDirectChildren(department)),
    ]);
  }, [department]);

  const parentTreeData = useMemo<ParentTreeNode[]>(
    () => [
      {
        value: 0,
        title: '根部门',
        children: toParentTreeData(
          getDepartmentForest(root),
          blockedIds,
        ),
      },
    ],
    [blockedIds, root],
  );

  useEffect(() => {
    if (!open) return;

    form.resetFields();
    form.setFieldsValue({
      deptName: department?.deptName ?? '',
      description: department?.description ?? '',
      parentId:
        department?.parentId ?? defaultParentId ?? 0,
    });
  }, [defaultParentId, department, form, open]);

  const close = () => {
    if (!saving) onClose();
  };

  const save = async (values: DepartmentFormValues) => {
    if (saving) return;
    setSaving(true);

    try {
      const body: DepartmentInput = {
        deptName: values.deptName.trim(),
        description: values.description?.trim() ?? '',
        parentId: Number(values.parentId ?? 0),
      };

      if (department) {
        await updateDepartment({
          ...body,
          id: department.id,
        });
      } else {
        await createDepartment(body);
      }

      message.success(editing ? '部门已更新' : '部门已创建');
      onClose();
      onSuccess();
    } catch (error) {
      message.error(
        errorText(
          error,
          editing ? '部门更新失败' : '部门创建失败',
        ),
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer
      open={open}
      title={editing ? '编辑部门' : '新增部门'}
      width={520}
      forceRender
      maskClosable={false}
      keyboard={!saving}
      closable={!saving}
      onClose={close}
      extra={
        <Space>
          <Button disabled={saving} onClick={close}>
            取消
          </Button>
          <Button
            type="primary"
            loading={saving}
            onClick={() => form.submit()}
          >
            {editing ? '更新' : '保存'}
          </Button>
        </Space>
      }
    >
      <Alert
        showIcon
        type="info"
        className="mb-5"
        icon={<ApartmentOutlined />}
        message={
          editing
            ? '修改上级部门时，后端会同步更新当前部门及全部下级部门的层级。'
            : '可创建根部门，也可以在当前选中部门下新增子部门。'
        }
      />

      <Form<DepartmentFormValues>
        form={form}
        layout="vertical"
        preserve={false}
        disabled={saving}
        onFinish={(values) => void save(values)}
      >
        <Form.Item
          name="deptName"
          label="部门名称"
          rules={[
            {
              required: true,
              whitespace: true,
              message: '请输入部门名称',
            },
          ]}
        >
          <Input
            placeholder="请输入部门名称"
            maxLength={64}
            showCount
          />
        </Form.Item>

        <Form.Item
          name="parentId"
          label="上级部门"
          rules={[{ required: true, message: '请选择上级部门' }]}
        >
          <TreeSelect
            treeData={parentTreeData}
            treeDefaultExpandAll
            showSearch
            allowClear={false}
            placeholder="请选择上级部门"
            filterTreeNode={(input, node) =>
              String(node.title ?? '')
                .toLocaleLowerCase()
                .includes(input.trim().toLocaleLowerCase())
            }
          />
        </Form.Item>

        <Form.Item name="description" label="部门描述">
          <Input.TextArea
            placeholder="请输入部门职责或适用范围"
            maxLength={500}
            showCount
            autoSize={{ minRows: 4, maxRows: 8 }}
          />
        </Form.Item>
      </Form>
    </Drawer>
  );
}

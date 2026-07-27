import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { Button, Descriptions, Drawer, Form, Input, Modal, message, Space, Switch, Tag, Typography } from 'antd';
import { useRef, useState } from 'react';
import { AssignmentDrawer, PermissionGuard, SecurityQueryTable } from '@/components/security';
import { useSecurityProject } from '@/contexts/SecurityProjectContext';
import {
  assignSecurityProjectMembers,
  assignSecurityProjectOwner,
  checkSecurityProjectDeletion,
  createSecurityProject,
  deleteSecurityProject,
  getSecurityProject,
  getSecurityProjectMemberCandidates,
  pageSecurityProjects,
  type SecurityProjectDetail,
  type SecurityProjectInput,
  type SecurityProjectStatus,
  type SecurityProjectSummary,
  type SecurityProjectUser,
  updateSecurityProject,
  updateSecurityProjectStatus,
} from '@/services/security/projects';

const permission = (action: string) => `system:project:${action}`;

export default function SecurityProjectsPage() {
  const actionRef = useRef<ActionType>();
  const [form] = Form.useForm<SecurityProjectInput>();
  const { currentProject, refreshProjects } = useSecurityProject();
  const [editing, setEditing] = useState<SecurityProjectSummary>();
  const [formOpen, setFormOpen] = useState(false);
  const [detail, setDetail] = useState<SecurityProjectDetail>();
  const [assigning, setAssigning] = useState<{ project: SecurityProjectSummary; mode: 'single' | 'multiple' }>();
  const [candidates, setCandidates] = useState<SecurityProjectUser[]>([]);

  const reload = () => actionRef.current?.reload();
  const openForm = (project?: SecurityProjectSummary) => {
    setEditing(project);
    setFormOpen(true);
    form.setFieldsValue(project ?? { projectCode: '', projectName: '' });
  };
  const openAssignment = async (project: SecurityProjectSummary, mode: 'single' | 'multiple') => {
    setAssigning({ project, mode });
    try {
      setCandidates(await getSecurityProjectMemberCandidates(project.id));
    } catch {
      setCandidates([]);
    }
  };
  const showDetail = async (project: SecurityProjectSummary) => setDetail(await getSecurityProject(project.id));
  const changeStatus = (project: SecurityProjectSummary, checked: boolean) => {
    const status: SecurityProjectStatus = checked ? 'ENABLED' : 'DISABLED';
    Modal.confirm({
      title: `确认${checked ? '启用' : '停用'}项目“${project.projectName}”？`,
      content: !checked ? '停用后该项目将不可再从项目切换器选择。' : undefined,
      onOk: async () => {
        await updateSecurityProjectStatus(project.id, status);
        if (!checked && currentProject?.id === project.id) await refreshProjects();
        message.success('状态已更新');
        reload();
      },
    });
  };
  const remove = async (project: SecurityProjectSummary) => {
    const check = await checkSecurityProjectDeletion(project.id);
    Modal.confirm({
      title: `删除项目“${project.projectName}”？`,
      okButtonProps: { danger: true, disabled: !check.deletable },
      content: (
        <>
          <p>
            {check.deletable ? '检查通过。删除后无法恢复。' : (check.reason ?? '项目仍有资源或授权引用，无法删除。')}
          </p>
          <pre>{JSON.stringify(check.references ?? {}, null, 2)}</pre>
        </>
      ),
      onOk: async () => {
        await deleteSecurityProject(project.id);
        if (currentProject?.id === project.id) await refreshProjects();
        message.success('项目已删除');
        reload();
      },
    });
  };

  const columns: ProColumns<SecurityProjectSummary>[] = [
    { title: '项目编码', dataIndex: 'projectCode' },
    { title: '项目名称', dataIndex: 'projectName' },
    { title: '负责人', dataIndex: ['owner', 'userName'], fieldProps: { placeholder: '负责人' } },
    { title: '成员数', dataIndex: 'memberCount', search: false },
    {
      title: '状态',
      dataIndex: 'status',
      valueType: 'select',
      valueEnum: { ENABLED: { text: '运行中', status: 'Success' }, DISABLED: { text: '已停用', status: 'Default' } },
      render: (_, row) => (
        <PermissionGuard mode="one" permission={permission('status')} behavior="disable">
          <Switch
            checked={row.status === 'ENABLED'}
            checkedChildren="运行"
            unCheckedChildren="停用"
            onChange={(checked) => changeStatus(row, checked)}
          />
        </PermissionGuard>
      ),
    },
    { title: '创建时间', dataIndex: 'createTime', valueType: 'dateTime', search: false },
    { title: '更新时间', dataIndex: 'updateTime', valueType: 'dateTime', search: false },
    {
      title: '操作',
      valueType: 'option',
      render: (_, row) => (
        <Space wrap>
          <Button type="link" onClick={() => showDetail(row)}>
            详情
          </Button>
          <PermissionGuard mode="one" permission={permission('update')}>
            <Button type="link" onClick={() => openForm(row)}>
              编辑
            </Button>
          </PermissionGuard>
          <PermissionGuard mode="one" permission={permission('assign')}>
            <Button type="link" onClick={() => openAssignment(row, 'single')}>
              负责人
            </Button>
            <Button type="link" onClick={() => openAssignment(row, 'multiple')}>
              成员
            </Button>
          </PermissionGuard>
          <PermissionGuard mode="one" permission={permission('delete')}>
            <Button danger type="link" onClick={() => remove(row)}>
              删除
            </Button>
          </PermissionGuard>
        </Space>
      ),
    },
  ];

  return (
    <section className="m-4 rounded-xl bg-white p-6">
      <Typography.Title level={4}>Security 授权项目</Typography.Title>
      <SecurityQueryTable<SecurityProjectSummary>
        actionRef={actionRef}
        columns={columns}
        request={async (params) => {
          const result = await pageSecurityProjects({
            pageNum: params.current ?? 1,
            pageSize: params.pageSize ?? 10,
            projectCode: params.projectCode as string,
            projectName: params.projectName as string,
            ownerName: (params.owner as string) ?? (params.ownerName as string),
            status: params.status as SecurityProjectStatus,
          });
          return { data: result.records, total: result.total, success: true };
        }}
        toolBarRender={() => [
          <PermissionGuard key="create" mode="one" permission={permission('create')}>
            <Button type="primary" onClick={() => openForm()}>
              新增项目
            </Button>
          </PermissionGuard>,
        ]}
      />
      <Modal
        open={formOpen}
        title={editing ? '编辑 Security 授权项目' : '新增 Security 授权项目'}
        onCancel={() => setFormOpen(false)}
        onOk={() => form.submit()}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={async (values) => {
            editing ? await updateSecurityProject(editing.id, values) : await createSecurityProject(values);
            message.success('保存成功');
            setFormOpen(false);
            reload();
          }}
        >
          <Form.Item
            name="projectCode"
            label="项目编码"
            rules={[{ required: true }, { pattern: /^[A-Za-z0-9_-]+$/, message: '仅支持字母、数字、下划线和连字符' }]}
          >
            <Input disabled={Boolean(editing)} maxLength={64} />
          </Form.Item>
          <Form.Item name="projectName" label="项目名称" rules={[{ required: true }]}>
            <Input maxLength={128} />
          </Form.Item>
        </Form>
      </Modal>
      <AssignmentDrawer
        open={Boolean(assigning)}
        title={assigning?.mode === 'single' ? '分配负责人' : '分配成员'}
        mode={assigning?.mode ?? 'single'}
        options={candidates.map((user) => ({
          id: user.id,
          label: user.nickName || user.userName,
          description: user.userName,
        }))}
        value={
          assigning?.mode === 'single'
            ? candidates.filter((user) => user.id === assigning.project.owner?.id).map((user) => user.id)
            : []
        }
        onClose={() => setAssigning(undefined)}
        onSubmit={async (ids) => {
          if (!assigning) return;
          assigning.mode === 'single'
            ? await assignSecurityProjectOwner(assigning.project.id, ids[0])
            : await assignSecurityProjectMembers(assigning.project.id, ids);
          message.success('分配成功');
          setAssigning(undefined);
          reload();
        }}
      />
      <Drawer open={Boolean(detail)} title="Security 授权项目详情" width={560} onClose={() => setDetail(undefined)}>
        {detail && (
          <>
            <Descriptions
              column={1}
              bordered
              items={[
                { key: 'code', label: '编码', children: detail.projectCode },
                { key: 'name', label: '名称', children: detail.projectName },
                { key: 'owner', label: '负责人', children: detail.owner?.userName ?? '-' },
                {
                  key: 'status',
                  label: '状态',
                  children: <Tag color={detail.status === 'ENABLED' ? 'green' : 'default'}>{detail.status}</Tag>,
                },
              ]}
            />
            <Typography.Title level={5}>成员</Typography.Title>
            <Space wrap>
              {detail.members.map((member) => (
                <Tag key={member.id}>{member.nickName || member.userName}</Tag>
              ))}
            </Space>
            <Typography.Title level={5}>资源统计</Typography.Title>
            <pre>{JSON.stringify(detail.resourceStatistics ?? {}, null, 2)}</pre>
          </>
        )}
      </Drawer>
    </section>
  );
}

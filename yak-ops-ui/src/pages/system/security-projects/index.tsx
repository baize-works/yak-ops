import type {
  ActionType,
  ProColumns,
} from '@ant-design/pro-components';
import {
  Alert,
  Button,
  Descriptions,
  Drawer,
  Form,
  Input,
  Modal,
  Space,
  Switch,
  Tag,
  Typography,
  message,
} from 'antd';
import { useRef, useState } from 'react';

import {
  AssignmentDrawer,
  PermissionGuard,
  SecurityQueryTable,
} from '@/components/security';
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

const permission = (action: string) =>
  `system:project:${action}`;

const errorText = (
  error: unknown,
  fallback: string,
): string =>
  error instanceof Error && error.message
    ? error.message
    : fallback;

const userDisplayName = (
  user?: SecurityProjectUser,
): string =>
  user?.realName || user?.nickName || user?.userName || '-';

interface AssignmentState {
  project: SecurityProjectSummary;
  mode: 'single' | 'multiple';
  value: number[];
}

export default function SecurityProjectsPage() {
  const actionRef = useRef<ActionType>();
  const [form] = Form.useForm<SecurityProjectInput>();
  const { currentProject, refreshProjects } =
    useSecurityProject();
  const [editing, setEditing] =
    useState<SecurityProjectSummary>();
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [detail, setDetail] =
    useState<SecurityProjectDetail>();
  const [detailLoading, setDetailLoading] =
    useState(false);
  const [assigning, setAssigning] =
    useState<AssignmentState>();
  const [candidates, setCandidates] =
    useState<SecurityProjectUser[]>([]);
  const [candidateLoading, setCandidateLoading] =
    useState(false);

  const reload = () => actionRef.current?.reload();

  const resetForm = () => {
    setFormOpen(false);
    setEditing(undefined);
    form.resetFields();
  };

  const closeForm = () => {
    if (!saving) resetForm();
  };

  const openForm = (project?: SecurityProjectSummary) => {
    setEditing(project);
    setFormOpen(true);
    form.setFieldsValue({
      projectName: project?.projectName ?? '',
      description: project?.description ?? '',
      deptId: project?.deptId ?? undefined,
    });
  };

  const showDetail = async (
    project: SecurityProjectSummary,
  ) => {
    setDetailLoading(true);
    try {
      setDetail(await getSecurityProject(project.id));
    } catch (error) {
      message.error(
        errorText(error, '项目详情加载失败'),
      );
    } finally {
      setDetailLoading(false);
    }
  };

  const openAssignment = async (
    project: SecurityProjectSummary,
    mode: 'single' | 'multiple',
  ) => {
    setCandidateLoading(true);
    try {
      const [projectDetail, userCandidates] =
        await Promise.all([
          getSecurityProject(project.id),
          getSecurityProjectMemberCandidates(project.id),
        ]);

      setCandidates(userCandidates);
      setAssigning({
        project,
        mode,
        value:
          mode === 'single'
            ? projectDetail.owners
                .slice(0, 1)
                .map((user) => user.id)
            : projectDetail.members.map(
                (user) => user.id,
              ),
      });
    } catch (error) {
      setCandidates([]);
      message.error(
        errorText(error, '用户候选列表加载失败'),
      );
    } finally {
      setCandidateLoading(false);
    }
  };

  const changeStatus = (
    project: SecurityProjectSummary,
    checked: boolean,
  ) => {
    const status: SecurityProjectStatus = checked
      ? 'ENABLED'
      : 'DISABLED';

    Modal.confirm({
      title: `确认${checked ? '启用' : '停用'}项目“${project.projectName}”？`,
      content: !checked
        ? '停用后该项目将不可再从项目切换器选择。'
        : undefined,
      onOk: async () => {
        try {
          await updateSecurityProjectStatus(
            project.id,
            status,
          );

          if (currentProject?.id === project.id) {
            await refreshProjects();
          }

          message.success('状态已更新');
          reload();
        } catch (error) {
          message.error(
            errorText(error, '项目状态更新失败'),
          );
          throw error;
        }
      },
    });
  };

  const remove = async (
    project: SecurityProjectSummary,
  ) => {
    try {
      const check =
        await checkSecurityProjectDeletion(project.id);

      Modal.confirm({
        title: `删除项目“${project.projectName}”？`,
        okButtonProps: {
          danger: true,
          disabled: !check.deletable,
        },
        content: check.deletable ? (
          <Alert
            showIcon
            type="warning"
            message="检查通过，删除后无法恢复。"
          />
        ) : (
          <div className="space-y-3">
            <Alert
              showIcon
              type="error"
              message={
                check.reason ??
                '项目仍有关联资源，无法删除。'
              }
            />
            <Space size={[4, 6]} wrap>
              {check.resourceNameList.map((name) => (
                <Tag key={name}>{name}</Tag>
              ))}
            </Space>
          </div>
        ),
        onOk: async () => {
          try {
            await deleteSecurityProject(project.id);

            if (currentProject?.id === project.id) {
              await refreshProjects();
            }

            message.success('项目已删除');
            reload();
          } catch (error) {
            message.error(
              errorText(error, '项目删除失败'),
            );
            throw error;
          }
        },
      });
    } catch (error) {
      message.error(
        errorText(error, '项目删除检查失败'),
      );
    }
  };

  const columns: ProColumns<SecurityProjectSummary>[] = [
    {
      title: '项目编码',
      dataIndex: 'projectCode',
    },
    {
      title: '项目名称',
      dataIndex: 'projectName',
    },
    {
      title: '负责人',
      dataIndex: 'ownerName',
      fieldProps: { placeholder: '用户名或姓名' },
      render: (_, row) =>
        row.owners.length > 0 ? (
          <Space size={[4, 4]} wrap>
            {row.owners.map((owner) => (
              <Tag key={owner.id}>
                {userDisplayName(owner)}
              </Tag>
            ))}
          </Space>
        ) : (
          '-'
        ),
    },
    {
      title: '成员数',
      dataIndex: 'memberCount',
      search: false,
    },
    {
      title: '状态',
      dataIndex: 'status',
      valueType: 'select',
      valueEnum: {
        ENABLED: {
          text: '运行中',
          status: 'Success',
        },
        DISABLED: {
          text: '已停用',
          status: 'Default',
        },
      },
      render: (_, row) => (
        <PermissionGuard
          mode="one"
          permission={permission('status')}
          behavior="disable"
        >
          <Switch
            checked={row.status === 'ENABLED'}
            checkedChildren="运行"
            unCheckedChildren="停用"
            onChange={(checked) =>
              changeStatus(row, checked)
            }
          />
        </PermissionGuard>
      ),
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
      render: (_, row) => (
        <Space wrap>
          <Button
            type="link"
            onClick={() => void showDetail(row)}
          >
            详情
          </Button>
          <PermissionGuard
            mode="one"
            permission={permission('update')}
          >
            <Button
              type="link"
              onClick={() => openForm(row)}
            >
              编辑
            </Button>
          </PermissionGuard>
          <PermissionGuard
            mode="one"
            permission={permission('assign')}
          >
            <Button
              type="link"
              onClick={() =>
                void openAssignment(row, 'single')
              }
            >
              负责人
            </Button>
            <Button
              type="link"
              onClick={() =>
                void openAssignment(row, 'multiple')
              }
            >
              成员
            </Button>
          </PermissionGuard>
          <PermissionGuard
            mode="one"
            permission={permission('delete')}
          >
            <Button
              danger
              type="link"
              onClick={() => void remove(row)}
            >
              删除
            </Button>
          </PermissionGuard>
        </Space>
      ),
    },
  ];

  return (
    <section className="m-4 rounded-xl bg-white p-6">
      <Typography.Title level={4}>
        Security 授权项目1
      </Typography.Title>

      <SecurityQueryTable<SecurityProjectSummary>
        actionRef={actionRef}
        columns={columns}
        request={async (params) => {
          try {
            const result = await pageSecurityProjects({
              pageNum: params.current ?? 1,
              pageSize: params.pageSize ?? 10,
              projectCode:
                params.projectCode as string,
              projectName:
                params.projectName as string,
              ownerName: params.ownerName as string,
              status:
                params.status as SecurityProjectStatus,
            });

            return {
              data: result.records,
              total: result.total,
              success: true,
            };
          } catch (error) {
            message.error(
              errorText(error, '项目列表加载失败'),
            );

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
            permission={permission('create')}
          >
            <Button
              type="primary"
              onClick={() => openForm()}
            >
              新增项目
            </Button>
          </PermissionGuard>,
        ]}
      />

      <Modal
        open={formOpen}
        title={
          editing
            ? '编辑 Security 授权项目'
            : '新增 Security 授权项目'
        }
        confirmLoading={saving}
        maskClosable={!saving}
        closable={!saving}
        destroyOnClose
        onCancel={closeForm}
        onOk={() => form.submit()}
      >
        <Form<SecurityProjectInput>
          form={form}
          layout="vertical"
          preserve={false}
          disabled={saving}
          onFinish={async (values) => {
            setSaving(true);
            try {
              if (editing) {
                await updateSecurityProject(
                  editing.id,
                  values,
                );
              } else {
                await createSecurityProject(values);
              }

              message.success('保存成功');
              resetForm();
              reload();
            } catch (error) {
              message.error(
                errorText(error, '项目保存失败'),
              );
            } finally {
              setSaving(false);
            }
          }}
        >
          <Form.Item label="项目编码">
            <Input
              disabled
              value={
                editing?.projectCode ||
                '保存后由后端自动生成'
              }
            />
          </Form.Item>
          <Form.Item
            name="projectName"
            label="项目名称"
            rules={[
              {
                required: true,
                whitespace: true,
                message: '请输入项目名称',
              },
            ]}
          >
            <Input
              maxLength={128}
              showCount
              placeholder="请输入项目名称"
            />
          </Form.Item>
          <Form.Item
            name="description"
            label="项目描述"
          >
            <Input.TextArea
              maxLength={500}
              showCount
              autoSize={{ minRows: 3, maxRows: 6 }}
              placeholder="请输入项目用途或授权范围"
            />
          </Form.Item>
        </Form>
      </Modal>

      <AssignmentDrawer
        open={Boolean(assigning)}
        title={
          assigning?.mode === 'single'
            ? '分配负责人'
            : '分配成员'
        }
        mode={assigning?.mode ?? 'single'}
        options={candidates.map((user) => ({
          id: user.id,
          label: userDisplayName(user),
          description:
            user.realName &&
            user.realName !== user.userName
              ? user.userName
              : undefined,
        }))}
        value={assigning?.value ?? []}
        loading={candidateLoading}
        allowEmpty
        onClose={() => {
          setAssigning(undefined);
          setCandidates([]);
        }}
        onSubmit={async (ids) => {
          if (!assigning) return;

          try {
            if (assigning.mode === 'single') {
              await assignSecurityProjectOwner(
                assigning.project.id,
                ids.slice(0, 1),
              );
            } else {
              await assignSecurityProjectMembers(
                assigning.project.id,
                ids,
              );
            }

            await refreshProjects();
            message.success('分配成功');
            setAssigning(undefined);
            setCandidates([]);
            reload();
          } catch (error) {
            message.error(
              errorText(error, '项目用户分配失败'),
            );
            throw error;
          }
        }}
      />

      <Drawer
        open={Boolean(detail) || detailLoading}
        title="Security 授权项目详情"
        width={600}
        loading={detailLoading}
        onClose={() => setDetail(undefined)}
      >
        {detail && (
          <div className="space-y-6">
            <Descriptions
              column={1}
              bordered
              items={[
                {
                  key: 'code',
                  label: '编码',
                  children: detail.projectCode || '-',
                },
                {
                  key: 'name',
                  label: '名称',
                  children: detail.projectName,
                },
                {
                  key: 'dept',
                  label: '所属部门',
                  children:
                    detail.deptPath?.join(' / ') || '-',
                },
                {
                  key: 'description',
                  label: '描述',
                  children: detail.description || '-',
                },
                {
                  key: 'status',
                  label: '状态',
                  children: (
                    <Tag
                      color={
                        detail.status === 'ENABLED'
                          ? 'success'
                          : 'default'
                      }
                    >
                      {detail.status === 'ENABLED'
                        ? '运行中'
                        : '已停用'}
                    </Tag>
                  ),
                },
              ]}
            />

            <div>
              <Typography.Title level={5}>
                负责人
              </Typography.Title>
              <Space wrap>
                {detail.owners.length > 0 ? (
                  detail.owners.map((owner) => (
                    <Tag key={owner.id}>
                      {userDisplayName(owner)}
                    </Tag>
                  ))
                ) : (
                  <Typography.Text type="secondary">
                    暂未分配负责人
                  </Typography.Text>
                )}
              </Space>
            </div>

            <div>
              <Typography.Title level={5}>
                成员
              </Typography.Title>
              <Space wrap>
                {detail.members.length > 0 ? (
                  detail.members.map((member) => (
                    <Tag key={member.id}>
                      {userDisplayName(member)}
                    </Tag>
                  ))
                ) : (
                  <Typography.Text type="secondary">
                    暂未分配成员
                  </Typography.Text>
                )}
              </Space>
            </div>
          </div>
        )}
      </Drawer>
    </section>
  );
}

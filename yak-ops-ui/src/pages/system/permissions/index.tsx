import { DeleteOutlined, ImportOutlined, ReloadOutlined } from '@ant-design/icons';
import { Button, Card, Descriptions, Form, Input, Modal, message, Select, Space, Tag, Typography } from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { PermissionGuard, TreeSearch } from '@/components/security';
import {
  deletePermission,
  getPermissionDetail,
  getPermissionTree,
  type PermissionSearchParams,
  type PermissionVO,
  searchPermissions,
  type TreeId,
} from '@/services/security/permissions';
import ImportModal from './ImportModal';
import { permissionTreeNodes, retainMatchedAncestors } from './tree';

const labels: Record<string, string> = {
  name: '名称',
  code: '编码',
  type: '类型',
  parentId: '父级 ID',
  resource: '接口 / 资源描述',
  description: '描述',
  sort: '排序',
  status: '状态',
};
const fields = Object.keys(labels);

export default function PermissionsPage() {
  const [tree, setTree] = useState<PermissionVO[]>([]);
  const [visibleTree, setVisibleTree] = useState<PermissionVO[]>([]);
  const [selectedId, setSelectedId] = useState<TreeId>();
  const [detail, setDetail] = useState<PermissionVO>();
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [importOpen, setImportOpen] = useState(false);
  const [form] = Form.useForm<PermissionSearchParams>();
  const loadTree = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getPermissionTree();
      setTree(data ?? []);
      setVisibleTree(data ?? []);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void loadTree();
  }, [loadTree]);
  const select = async (id: TreeId) => {
    setSelectedId(id);
    setDetailLoading(true);
    try {
      setDetail(await getPermissionDetail(id));
    } finally {
      setDetailLoading(false);
    }
  };
  const search = async (values: PermissionSearchParams) => {
    const hasQuery = Object.values(values).some((value) => value?.trim());
    if (!hasQuery) {
      setVisibleTree(tree);
      return;
    }
    setLoading(true);
    try {
      setVisibleTree(retainMatchedAncestors(tree, await searchPermissions(values)));
    } finally {
      setLoading(false);
    }
  };
  const remove = () =>
    detail &&
    Modal.confirm({
      title: `删除权限“${detail.name}”？`,
      content: '服务端会检查子节点和角色引用；存在引用时不会删除。',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await deletePermission(detail.id);
          message.success('删除成功');
          setDetail(undefined);
          setSelectedId(undefined);
          await loadTree();
        } catch (error) {
          Modal.error({
            title: '无法删除权限',
            content: error instanceof Error ? error.message : '权限存在子节点或角色引用，请解除冲突后重试。',
          });
          throw error;
        }
      },
    });
  const nodes = useMemo(() => permissionTreeNodes(visibleTree), [visibleTree]);
  return (
    <section className="m-4 min-h-[calc(100vh-80px)]" aria-labelledby="permission-title">
      <Card>
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <Typography.Title id="permission-title" level={4} className="!mb-1">
              权限管理
            </Typography.Title>
            <Typography.Text type="secondary">查询权限树、查看真实详情，或从服务端模板导入权限。</Typography.Text>
          </div>
          <Space>
            <Button icon={<ReloadOutlined />} onClick={() => void loadTree()}>
              刷新
            </Button>
            <PermissionGuard mode="one" permission="system:permission:import">
              <Button type="primary" icon={<ImportOutlined />} onClick={() => setImportOpen(true)}>
                导入
              </Button>
            </PermissionGuard>
          </Space>
        </div>
        <Form form={form} layout="inline" onFinish={search} className="mb-5 gap-y-2">
          <Form.Item name="name" label="名称">
            <Input allowClear />
          </Form.Item>
          <Form.Item name="code" label="编码">
            <Input allowClear />
          </Form.Item>
          <Form.Item name="type" label="类型">
            <Select
              allowClear
              className="w-32"
              options={[
                { value: 'MENU', label: 'MENU' },
                { value: 'API', label: 'API' },
                { value: 'BUTTON', label: 'BUTTON' },
              ]}
            />
          </Form.Item>
          <Button htmlType="submit" type="primary">
            查询
          </Button>
          <Button
            onClick={() => {
              form.resetFields();
              setVisibleTree(tree);
            }}
          >
            重置
          </Button>
        </Form>
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[360px_1fr]">
          <Card size="small" title="权限树">
            <TreeSearch
              nodes={nodes}
              loading={loading}
              keyword={keyword}
              onKeywordChange={setKeyword}
              selectedKey={selectedId}
              onSelect={(id) => void select(id)}
              placeholder="在结果中按名称、编码、类型筛选"
            />
          </Card>
          <Card
            size="small"
            title="权限详情"
            loading={detailLoading}
            extra={
              detail && (
                <PermissionGuard mode="one" permission="system:permission:delete">
                  <Button danger icon={<DeleteOutlined />} onClick={remove}>
                    删除
                  </Button>
                </PermissionGuard>
              )
            }
          >
            {detail ? (
              <Descriptions bordered column={1}>
                {fields
                  .filter((field) => field in detail)
                  .map((field) => (
                    <Descriptions.Item key={field} label={labels[field]}>
                      {field === 'status' ? (
                        <Tag>{String(detail[field as keyof PermissionVO] ?? '-')}</Tag>
                      ) : (
                        String(detail[field as keyof PermissionVO] ?? '-')
                      )}
                    </Descriptions.Item>
                  ))}
              </Descriptions>
            ) : (
              <Typography.Text type="secondary">请从左侧选择一个权限节点。</Typography.Text>
            )}
          </Card>
        </div>
      </Card>
      <ImportModal open={importOpen} onClose={() => setImportOpen(false)} onImported={() => void loadTree()} />
    </section>
  );
}

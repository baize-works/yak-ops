import { ImportOutlined, ReloadOutlined } from '@ant-design/icons';
import { Button, Card, Form, Input, Space, Typography } from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { JsonDetailDrawer, PermissionGuard, TreeSearch } from '@/components/security';
import {
  type DepartmentVO,
  getDepartmentDetail,
  getDepartmentTree,
  searchDepartments,
} from '@/services/security/departments';
import type { TreeId } from '@/services/security/permissions';
import { retainMatchedAncestors } from '../permissions/tree';
import ImportModal from './ImportModal';
import { departmentTreeNodes } from './tree';

const labels = { id: 'ID', name: '名称', code: '编码', parentId: '父部门 ID', leader: '负责人' };

export default function DepartmentsPage() {
  const [tree, setTree] = useState<DepartmentVO[]>([]);
  const [visibleTree, setVisibleTree] = useState<DepartmentVO[]>([]);
  const [selectedId, setSelectedId] = useState<TreeId>();
  const [detail, setDetail] = useState<DepartmentVO>();
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [form] = Form.useForm<{ name?: string; code?: string }>();
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getDepartmentTree();
      setTree(result ?? []);
      setVisibleTree(result ?? []);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  const select = async (id: TreeId) => {
    setSelectedId(id);
    setDrawerOpen(true);
    setDetailLoading(true);
    try {
      setDetail(await getDepartmentDetail(id));
    } finally {
      setDetailLoading(false);
    }
  };
  const search = async (values: { name?: string; code?: string }) => {
    if (!values.name?.trim() && !values.code?.trim()) {
      setVisibleTree(tree);
      return;
    }
    setLoading(true);
    try {
      setVisibleTree(retainMatchedAncestors(tree, await searchDepartments(values)));
    } finally {
      setLoading(false);
    }
  };
  const nodes = useMemo(() => departmentTreeNodes(visibleTree), [visibleTree]);
  return (
    <section className="m-4 min-h-[calc(100vh-80px)]" aria-labelledby="department-title">
      <Card>
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <Typography.Title id="department-title" level={4} className="!mb-1">
              部门管理
            </Typography.Title>
            <Typography.Text type="secondary">
              搜索部门树并查看部门详情；本页不提供后端未开放的编辑或删除操作。
            </Typography.Text>
          </div>
          <Space>
            <Button icon={<ReloadOutlined />} onClick={() => void load()}>
              刷新
            </Button>
            <PermissionGuard mode="one" permission="system:department:import">
              <Button type="primary" icon={<ImportOutlined />} onClick={() => setImportOpen(true)}>
                导入
              </Button>
            </PermissionGuard>
          </Space>
        </div>
        <Form form={form} layout="inline" className="mb-5 gap-y-2" onFinish={search}>
          <Form.Item name="name" label="名称">
            <Input allowClear />
          </Form.Item>
          <Form.Item name="code" label="编码">
            <Input allowClear />
          </Form.Item>
          <Button type="primary" htmlType="submit">
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
        <Card size="small" title="部门树">
          <TreeSearch
            nodes={nodes}
            loading={loading}
            keyword={keyword}
            onKeywordChange={setKeyword}
            selectedKey={selectedId}
            onSelect={(id) => void select(id)}
            placeholder="在结果中按名称或编码筛选"
          />
        </Card>
      </Card>
      <JsonDetailDrawer
        title="部门详情"
        open={drawerOpen}
        loading={detailLoading}
        data={detail as unknown as Record<string, unknown>}
        fields={Object.keys(labels)}
        labels={labels}
        onClose={() => setDrawerOpen(false)}
      />
      <ImportModal open={importOpen} onClose={() => setImportOpen(false)} onImported={() => void load()} />
    </section>
  );
}

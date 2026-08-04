import RouteAccessBoundary from '@/components/security/RouteAccessBoundary';
import type { NavigationRoute } from '@/config/navigation';
import { BRAND_THEME } from '@/styles/brand';
import { history } from '@umijs/max';
import {
  Alert,
  Button,
  ConfigProvider,
  Drawer,
  Form,
  Input,
  Popconfirm,
  Select,
  Space,
  Spin,
  Switch,
  Table,
  Tabs,
  Tag,
  Typography,
  message,
  type TableColumnsType,
} from 'antd';
import {
  Activity,
  ArrowLeft,
  Boxes,
  CheckCircle2,
  Database,
  FileJson2,
  KeyRound,
  Plus,
  RefreshCw,
  ServerCog,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  platformRepository,
  type AuditEntry,
  type EngineEndpoint,
  type EnvironmentType,
  type ParameterTemplate,
  type PlatformSnapshot,
  type ProbeType,
  type RuntimeEnvironment,
  type SecretMetadata,
} from './platform.repository';

const { Text } = Typography;

const PLATFORM_ROUTE = {
  id: 'data-development-platform',
  mode: 'any',
  permissions: ['task:batch:read', 'task:realtime:read'],
  path: '/data-development/platform',
  title: '平台能力',
  component: './data-development/platform',
  hidden: true,
} satisfies NavigationRoute;

type EditorKind = 'environment' | 'secret' | 'template' | 'engine';

const parseJsonObject = (value: unknown, label: string) => {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(String(value || '{}'));
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error(`${label}必须是 JSON 对象`);
    }
    return parsed as Record<string, unknown>;
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : `${label}格式错误`);
  }
};

const formatDate = (value?: string) =>
  value
    ? new Intl.DateTimeFormat('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      }).format(new Date(value))
    : '-';

const environmentLabel: Record<EnvironmentType, string> = {
  DEVELOPMENT: '开发',
  TESTING: '测试',
  STAGING: '预发布',
  PRODUCTION: '生产',
};

const healthMeta: Record<EngineEndpoint['healthStatus'], { label: string; className: string }> = {
  UNKNOWN: { label: '未检查', className: '!bg-[#f2f3f5] !text-[#667085]' },
  HEALTHY: { label: '健康', className: '!bg-[#f2f3f5] !text-[#344054]' },
  DEGRADED: { label: '降级', className: '!bg-[#fff7e6] !text-[#d46b08]' },
  UNHEALTHY: { label: '异常', className: '!bg-[#fff1f0] !text-[#ff4d4f]' },
  DISABLED: { label: '已停用', className: '!bg-[#f2f3f5] !text-[#98a2b3]' },
};

const PlatformPage = () => {
  const [snapshot, setSnapshot] = useState<PlatformSnapshot>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [editor, setEditor] = useState<{ kind: EditorKind; value?: any }>();
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(false);
  const [form] = Form.useForm();

  const load = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      setSnapshot(await platformRepository.snapshot());
    } catch (loadError) {
      const text = loadError instanceof Error ? loadError.message : '平台能力加载失败';
      setError(text);
      message.error(text);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openEditor = (kind: EditorKind, value?: any) => {
    setEditor({ kind, value });
    const common = value ?? {};
    form.setFieldsValue({
      ...common,
      variables: JSON.stringify(common.variables ?? {}, null, 2),
      parameters: JSON.stringify(common.parameters ?? {}, null, 2),
      config: JSON.stringify(common.config ?? {}, null, 2),
      secretValue: '',
      enabled: common.enabled ?? true,
      environmentId: common.environmentId || 0,
      lockVersion: common.lockVersion ?? 0,
    });
  };

  const closeEditor = () => {
    setEditor(undefined);
    form.resetFields();
  };

  const save = async () => {
    if (!editor) return;
    const values = await form.validateFields();
    setSaving(true);
    try {
      if (editor.kind === 'environment') {
        await platformRepository.saveEnvironment({
          ...values,
          id: editor.value?.id,
          variables: parseJsonObject(values.variables, '环境变量'),
        });
      } else if (editor.kind === 'secret') {
        await platformRepository.saveSecret({
          ...values,
          id: editor.value?.id,
        });
      } else if (editor.kind === 'template') {
        await platformRepository.saveTemplate({
          ...values,
          id: editor.value?.id,
          parameters: parseJsonObject(values.parameters, '模板参数'),
        });
      } else {
        await platformRepository.saveEngine({
          ...values,
          id: editor.value?.id,
          config: parseJsonObject(values.config, '端点配置'),
        });
      }
      message.success('平台配置已保存');
      closeEditor();
      await load();
    } catch (saveError) {
      message.error(saveError instanceof Error ? saveError.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (kind: EditorKind, id: number) => {
    try {
      if (kind === 'environment') await platformRepository.deleteEnvironment(id);
      if (kind === 'secret') await platformRepository.deleteSecret(id);
      if (kind === 'template') await platformRepository.deleteTemplate(id);
      if (kind === 'engine') await platformRepository.deleteEngine(id);
      message.success('已删除');
      await load();
    } catch (removeError) {
      message.error(removeError instanceof Error ? removeError.message : '删除失败');
    }
  };

  const overviewItems = useMemo(() => {
    const value = snapshot?.overview;
    return [
      ['项目', value?.projectCount ?? 0, <Boxes key="project" size={18} />],
      ['任务', value?.taskCount ?? 0, <FileJson2 key="task" size={18} />],
      ['24h 执行', value?.executionCount24h ?? 0, <Activity key="execution" size={18} />],
      ['24h 成功率', `${value?.successRate24h ?? 0}%`, <CheckCircle2 key="rate" size={18} />],
      ['运行环境', value?.environmentCount ?? 0, <Database key="env" size={18} />],
      ['平台密钥', value?.secretCount ?? 0, <KeyRound key="secret" size={18} />],
      ['参数模板', value?.templateCount ?? 0, <FileJson2 key="template" size={18} />],
      ['异常引擎', value?.unhealthyEngineCount ?? 0, <ServerCog key="engine" size={18} />],
    ] as const;
  }, [snapshot]);

  const operationColumn = <T extends { id: number }>(
    kind: EditorKind,
  ): TableColumnsType<T>[number] => ({
    title: '操作',
    key: 'action',
    width: 150,
    fixed: 'right',
    render: (_, record) => (
      <Space size={4}>
        <Button type="link" size="small" onClick={() => openEditor(kind, record)}>
          编辑
        </Button>
        <Popconfirm title="确认删除这条配置？" onConfirm={() => void remove(kind, record.id)}>
          <Button type="link" danger size="small" icon={<Trash2 size={13} />}>
            删除
          </Button>
        </Popconfirm>
      </Space>
    ),
  });

  const environmentColumns: TableColumnsType<RuntimeEnvironment> = [
    {
      title: '环境',
      dataIndex: 'name',
      render: (_, item) => (
        <div>
          <div className="font-medium text-[#161823]">{item.name}</div>
          <div className="mt-0.5 font-mono text-[11px] text-[rgba(22,24,35,.42)]">{item.code}</div>
        </div>
      ),
    },
    {
      title: '类型',
      dataIndex: 'environmentType',
      width: 110,
      render: (value: EnvironmentType) => <Tag bordered={false}>{environmentLabel[value]}</Tag>,
    },
    {
      title: '变量数',
      dataIndex: 'variables',
      width: 100,
      render: (value: Record<string, unknown>) => Object.keys(value || {}).length,
    },
    {
      title: '状态',
      dataIndex: 'enabled',
      width: 90,
      render: (enabled: boolean) => <Tag bordered={false}>{enabled ? '启用' : '停用'}</Tag>,
    },
    { title: '更新人', dataIndex: 'updatedBy', width: 120, render: (v) => v || '-' },
    { title: '更新时间', dataIndex: 'updatedAt', width: 180, render: formatDate },
    operationColumn<RuntimeEnvironment>('environment'),
  ];

  const secretColumns: TableColumnsType<SecretMetadata> = [
    {
      title: '密钥',
      dataIndex: 'secretKey',
      render: (_, item) => (
        <div>
          <div className="font-mono font-medium text-[#161823]">{item.secretKey}</div>
          <div className="mt-0.5 text-[11px] text-[rgba(22,24,35,.42)]">{item.maskedValue}</div>
        </div>
      ),
    },
    {
      title: '环境',
      dataIndex: 'environmentId',
      width: 160,
      render: (id: number) =>
        id === 0
          ? '全局'
          : snapshot?.environments.find((item) => item.id === id)?.name || `#${id}`,
    },
    { title: '说明', dataIndex: 'description', ellipsis: true, render: (v) => v || '-' },
    { title: '更新人', dataIndex: 'updatedBy', width: 120, render: (v) => v || '-' },
    { title: '更新时间', dataIndex: 'updatedAt', width: 180, render: formatDate },
    operationColumn<SecretMetadata>('secret'),
  ];

  const templateColumns: TableColumnsType<ParameterTemplate> = [
    {
      title: '参数模板',
      dataIndex: 'name',
      render: (_, item) => (
        <div>
          <div className="font-medium text-[#161823]">{item.name}</div>
          <div className="mt-0.5 font-mono text-[11px] text-[rgba(22,24,35,.42)]">{item.code}</div>
        </div>
      ),
    },
    {
      title: '参数数',
      dataIndex: 'parameters',
      width: 100,
      render: (value: Record<string, unknown>) => Object.keys(value || {}).length,
    },
    { title: '说明', dataIndex: 'description', ellipsis: true, render: (v) => v || '-' },
    {
      title: '状态',
      dataIndex: 'enabled',
      width: 90,
      render: (enabled: boolean) => <Tag bordered={false}>{enabled ? '启用' : '停用'}</Tag>,
    },
    { title: '更新时间', dataIndex: 'updatedAt', width: 180, render: formatDate },
    operationColumn<ParameterTemplate>('template'),
  ];

  const engineColumns: TableColumnsType<EngineEndpoint> = [
    {
      title: '引擎端点',
      dataIndex: 'name',
      render: (_, item) => (
        <div>
          <div className="font-medium text-[#161823]">{item.name}</div>
          <div className="mt-0.5 font-mono text-[11px] text-[rgba(22,24,35,.42)]">{item.code}</div>
        </div>
      ),
    },
    { title: '任务类型', dataIndex: 'taskType', width: 120, render: (v) => <Tag bordered={false}>{v}</Tag> },
    { title: '探测', dataIndex: 'probeType', width: 120 },
    { title: '端点', dataIndex: 'endpoint', ellipsis: true, render: (v) => v || '本地插件' },
    {
      title: '健康状态',
      dataIndex: 'healthStatus',
      width: 110,
      render: (value: EngineEndpoint['healthStatus'], item) => (
        <Tag bordered={false} title={item.healthMessage} className={healthMeta[value].className}>
          {healthMeta[value].label}
        </Tag>
      ),
    },
    { title: '检查时间', dataIndex: 'lastCheckedAt', width: 180, render: formatDate },
    {
      title: '操作',
      key: 'action',
      width: 210,
      fixed: 'right',
      render: (_, item) => (
        <Space size={4}>
          <Button
            type="link"
            size="small"
            onClick={async () => {
              try {
                await platformRepository.checkEngine(item.id);
                message.success('健康检查完成');
                await load();
              } catch (checkError) {
                message.error(checkError instanceof Error ? checkError.message : '检查失败');
              }
            }}
          >
            检查
          </Button>
          <Button type="link" size="small" onClick={() => openEditor('engine', item)}>编辑</Button>
          <Popconfirm title="确认删除这个端点？" onConfirm={() => void remove('engine', item.id)}>
            <Button type="link" danger size="small">删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const auditColumns: TableColumnsType<AuditEntry> = [
    { title: '时间', dataIndex: 'occurredAt', width: 180, render: formatDate },
    { title: '操作', dataIndex: 'action', width: 220, render: (v) => <Tag bordered={false}>{v}</Tag> },
    { title: '资源', key: 'resource', width: 180, render: (_, item) => `${item.resourceType}${item.resourceId ? ` #${item.resourceId}` : ''}` },
    { title: '操作人', dataIndex: 'operator', width: 130 },
    { title: '摘要', dataIndex: 'summary', render: (value) => <code className="text-[11px]">{JSON.stringify(value)}</code> },
  ];

  const tabItems = [
    {
      key: 'environment',
      label: `运行环境 ${snapshot?.environments.length ?? 0}`,
      children: (
        <Table rowKey="id" columns={environmentColumns} dataSource={snapshot?.environments} pagination={false} scroll={{ x: 1050 }} />
      ),
    },
    {
      key: 'secret',
      label: `密钥 ${snapshot?.secrets.length ?? 0}`,
      children: (
        <Table rowKey="id" columns={secretColumns} dataSource={snapshot?.secrets} pagination={false} scroll={{ x: 1050 }} />
      ),
    },
    {
      key: 'template',
      label: `参数模板 ${snapshot?.parameterTemplates.length ?? 0}`,
      children: (
        <Table rowKey="id" columns={templateColumns} dataSource={snapshot?.parameterTemplates} pagination={false} scroll={{ x: 1050 }} />
      ),
    },
    {
      key: 'engine',
      label: `引擎中心 ${snapshot?.engines.length ?? 0}`,
      children: (
        <Table rowKey="id" columns={engineColumns} dataSource={snapshot?.engines} pagination={false} scroll={{ x: 1200 }} />
      ),
    },
    {
      key: 'audit',
      label: '审计日志',
      children: (
        <Table rowKey="id" columns={auditColumns} dataSource={snapshot?.recentAudit} pagination={{ pageSize: 20 }} scroll={{ x: 1000 }} />
      ),
    },
  ];

  return (
    <RouteAccessBoundary route={PLATFORM_ROUTE}>
      <ConfigProvider theme={BRAND_THEME}>
      <div className="min-h-[calc(100vh-48px)] bg-white px-5 pb-6 pt-4 text-[#161823]">
        <header className="flex min-h-11 items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button type="text" icon={<ArrowLeft size={16} />} onClick={() => history.push('/data-development/workbench')} />
            <div>
              <h1 className="m-0 text-[17px] font-semibold leading-6">平台能力</h1>
              <div className="mt-0.5 text-[11px] text-[rgba(22,24,35,.42)]">统一管理运行环境、密钥、参数模板、引擎健康和审计记录</div>
            </div>
          </div>
          <Space>
            <Button loading={loading} icon={<RefreshCw size={15} />} onClick={() => void load()}>刷新</Button>
          </Space>
        </header>

        {!snapshot?.secretEncryptionConfigured && !loading && (
          <Alert
            showIcon
            type="warning"
            className="mt-3"
            message="平台密钥加密尚未启用"
            description="请配置环境变量 YAK_DATA_DEVELOPMENT_PLATFORM_MASTER_KEY。未配置前，环境与模板可以使用，但无法新增或读取密钥。"
          />
        )}
        {error && <Alert showIcon type="error" className="mt-3" message={error} />}

        <Spin spinning={loading && !snapshot}>
          <section className="mt-3 grid grid-cols-4 gap-2 max-[1100px]:grid-cols-2 max-[640px]:grid-cols-1">
            {overviewItems.map(([label, value, icon]) => (
              <div key={label} className="flex min-h-[72px] items-center gap-3 border border-[#eceef0] bg-[#fafbfc] px-4 py-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-[7px] bg-[#f2f3f5] text-[rgba(22,24,35,.58)]">{icon}</span>
                <div>
                  <Text type="secondary" className="!text-[11px]">{label}</Text>
                  <div className="mt-0.5 text-lg font-semibold">{value}</div>
                </div>
              </div>
            ))}
          </section>

          <section className="mt-3 border border-[#e4e7ec] bg-white">
            <div className="flex min-h-[54px] items-center justify-between border-b border-[#eaecf0] px-3 py-2">
              <div className="flex items-center gap-2 text-[13px] font-medium"><ShieldCheck size={16} />平台配置与治理</div>
              <Space wrap>
                <Button icon={<Plus size={14} />} onClick={() => openEditor('environment')}>运行环境</Button>
                <Button icon={<KeyRound size={14} />} disabled={!snapshot?.secretEncryptionConfigured} onClick={() => openEditor('secret')}>密钥</Button>
                <Button icon={<Plus size={14} />} onClick={() => openEditor('template')}>参数模板</Button>
                <Button icon={<ServerCog size={14} />} onClick={() => openEditor('engine')}>引擎端点</Button>
                <Button
                  loading={checking}
                  onClick={async () => {
                    setChecking(true);
                    try {
                      await platformRepository.checkAllEngines();
                      message.success('全部引擎检查完成');
                      await load();
                    } catch (checkError) {
                      message.error(checkError instanceof Error ? checkError.message : '检查失败');
                    } finally {
                      setChecking(false);
                    }
                  }}
                >
                  检查全部
                </Button>
              </Space>
            </div>
            <Tabs className="px-3" items={tabItems} />
          </section>
        </Spin>

        <Drawer
          width={520}
          open={Boolean(editor)}
          title={editor?.value ? '编辑平台配置' : '新增平台配置'}
          onClose={closeEditor}
          extra={<Button type="primary" loading={saving} onClick={() => void save()}>保存</Button>}
          destroyOnClose
        >
          <Form form={form} layout="vertical" variant="filled">
            {editor?.kind === 'environment' && (
              <>
                <Form.Item name="code" label="环境编码" rules={[{ required: true }]}><Input placeholder="dev" /></Form.Item>
                <Form.Item name="name" label="环境名称" rules={[{ required: true }]}><Input placeholder="开发环境" /></Form.Item>
                <Form.Item name="environmentType" label="环境类型" rules={[{ required: true }]}>
                  <Select options={Object.entries(environmentLabel).map(([value, label]) => ({ value, label }))} />
                </Form.Item>
                <Form.Item name="description" label="说明"><Input.TextArea rows={2} /></Form.Item>
                <Form.Item name="variables" label="环境变量 JSON" rules={[{ required: true }]}><Input.TextArea rows={10} className="font-mono" /></Form.Item>
                <Form.Item name="enabled" label="启用" valuePropName="checked"><Switch /></Form.Item>
              </>
            )}
            {editor?.kind === 'secret' && (
              <>
                <Form.Item name="environmentId" label="所属环境" rules={[{ required: true }]}>
                  <Select options={[{ value: 0, label: '全局' }, ...(snapshot?.environments.map((item) => ({ value: item.id, label: item.name })) ?? [])]} />
                </Form.Item>
                <Form.Item name="secretKey" label="密钥名称" rules={[{ required: true }]}><Input placeholder="API_TOKEN" /></Form.Item>
                <Form.Item name="description" label="说明"><Input.TextArea rows={2} /></Form.Item>
                <Form.Item name="secretValue" label="密钥值" rules={[{ required: true }]}><Input.Password autoComplete="new-password" /></Form.Item>
              </>
            )}
            {editor?.kind === 'template' && (
              <>
                <Form.Item name="code" label="模板编码" rules={[{ required: true }]}><Input placeholder="daily-default" /></Form.Item>
                <Form.Item name="name" label="模板名称" rules={[{ required: true }]}><Input placeholder="每日任务默认参数" /></Form.Item>
                <Form.Item name="description" label="说明"><Input.TextArea rows={2} /></Form.Item>
                <Form.Item name="parameters" label="参数 JSON" rules={[{ required: true }]}><Input.TextArea rows={12} className="font-mono" /></Form.Item>
                <Form.Item name="enabled" label="启用" valuePropName="checked"><Switch /></Form.Item>
              </>
            )}
            {editor?.kind === 'engine' && (
              <>
                <Form.Item name="taskType" label="任务类型" rules={[{ required: true }]}>
                  <Select options={['SQL', 'FLINK_SQL', 'PYTHON', 'NOTEBOOK', 'HTTP', 'SHELL'].map((value) => ({ value, label: value }))} />
                </Form.Item>
                <Form.Item name="code" label="端点编码" rules={[{ required: true }]}><Input placeholder="flink-gateway-prod" /></Form.Item>
                <Form.Item name="name" label="端点名称" rules={[{ required: true }]}><Input placeholder="生产 Flink SQL Gateway" /></Form.Item>
                <Form.Item name="probeType" label="探测类型" rules={[{ required: true }]}>
                  <Select options={(['LOCAL_PLUGIN', 'HTTP', 'TCP'] as ProbeType[]).map((value) => ({ value, label: value }))} />
                </Form.Item>
                <Form.Item name="endpoint" label="健康检查端点"><Input placeholder="http://flink-gateway:8083/v1/info 或 host:port" /></Form.Item>
                <Form.Item name="config" label="端点配置 JSON" rules={[{ required: true }]}><Input.TextArea rows={8} className="font-mono" /></Form.Item>
                <Form.Item name="enabled" label="启用" valuePropName="checked"><Switch /></Form.Item>
              </>
            )}
            <Form.Item name="lockVersion" hidden><Input /></Form.Item>
          </Form>
        </Drawer>
      </div>
      </ConfigProvider>
    </RouteAccessBoundary>
  );
};

export default PlatformPage;

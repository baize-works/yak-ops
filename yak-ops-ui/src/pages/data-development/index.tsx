import YakOpsEmpty from '@/components/YakOpsEmpty';
import { BRAND_COLOR, BRAND_THEME } from '@/styles/brand';
import {
  Button,
  ConfigProvider,
  Dropdown,
  Empty,
  Form,
  Input,
  message,
  Modal,
  Segmented,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  type MenuProps,
  type TableColumnsType,
} from 'antd';
import dayjs from 'dayjs';
import {
  Braces,
  CircleCheck,
  Clock3,
  Copy,
  FileCode2,
  FileText,
  MoreHorizontal,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import { useMemo, useState } from 'react';

const { Text } = Typography;

type DevelopmentTaskStatus = 'DRAFT' | 'PUBLISHED';
type DevelopmentTaskType = 'SQL' | 'PYTHON';
type StatusFilter = 'ALL' | DevelopmentTaskStatus;

interface DevelopmentTask {
  id: string;
  name: string;
  type: DevelopmentTaskType;
  engine: string;
  folder: string;
  description?: string;
  status: DevelopmentTaskStatus;
  owner: string;
  updatedAt: string;
}

interface CreateTaskValues {
  name: string;
  type: DevelopmentTaskType;
  engine: string;
  folder?: string;
  description?: string;
}

const engineOptions = [
  { label: 'Flink SQL', value: 'Flink SQL' },
  { label: 'Spark SQL', value: 'Spark SQL' },
  { label: 'Trino SQL', value: 'Trino SQL' },
  { label: 'Python', value: 'Python' },
];

const typeOptions = [
  { label: 'SQL 脚本', value: 'SQL' },
  { label: 'Python 脚本', value: 'PYTHON' },
];

const DataDevelopmentWorkbenchPage = () => {
  const [form] = Form.useForm<CreateTaskValues>();
  const [tasks, setTasks] = useState<DevelopmentTask[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [engineFilter, setEngineFilter] = useState<string>();

  const summary = useMemo(
    () => ({
      total: tasks.length,
      draft: tasks.filter((task) => task.status === 'DRAFT').length,
      published: tasks.filter((task) => task.status === 'PUBLISHED').length,
    }),
    [tasks],
  );

  const filteredTasks = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();

    return tasks.filter((task) => {
      const matchesKeyword =
        !normalizedKeyword ||
        task.name.toLowerCase().includes(normalizedKeyword) ||
        task.id.toLowerCase().includes(normalizedKeyword) ||
        task.folder.toLowerCase().includes(normalizedKeyword);
      const matchesStatus =
        statusFilter === 'ALL' || task.status === statusFilter;
      const matchesEngine = !engineFilter || task.engine === engineFilter;

      return matchesKeyword && matchesStatus && matchesEngine;
    });
  }, [engineFilter, keyword, statusFilter, tasks]);

  const openCreateModal = () => {
    form.setFieldsValue({
      type: 'SQL',
      engine: 'Flink SQL',
      folder: '默认目录',
    });
    setCreateOpen(true);
  };

  const handleCreate = (values: CreateTaskValues) => {
    const task: DevelopmentTask = {
      id: `DEV-${Date.now().toString().slice(-8)}`,
      name: values.name.trim(),
      type: values.type,
      engine: values.engine,
      folder: values.folder?.trim() || '默认目录',
      description: values.description?.trim(),
      status: 'DRAFT',
      owner: '当前用户',
      updatedAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
    };

    setTasks((current) => [task, ...current]);
    setCreateOpen(false);
    form.resetFields();
    message.success('开发任务已创建');
  };

  const duplicateTask = (task: DevelopmentTask) => {
    const copyTask: DevelopmentTask = {
      ...task,
      id: `DEV-${Date.now().toString().slice(-8)}`,
      name: `${task.name} 副本`,
      status: 'DRAFT',
      updatedAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
    };

    setTasks((current) => [copyTask, ...current]);
    message.success('任务已复制');
  };

  const deleteTask = (task: DevelopmentTask) => {
    Modal.confirm({
      centered: true,
      title: '确认删除开发任务吗？',
      content: `删除“${task.name}”后无法恢复。`,
      okText: '删除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: () => {
        setTasks((current) => current.filter((item) => item.id !== task.id));
        message.success('任务已删除');
      },
    });
  };

  const getActionItems = (task: DevelopmentTask): MenuProps['items'] => [
    {
      key: 'open',
      icon: <FileCode2 size={15} />,
      label: '打开开发任务',
    },
    {
      key: 'copy',
      icon: <Copy size={15} />,
      label: '复制任务',
    },
    { type: 'divider' },
    {
      key: 'delete',
      danger: true,
      icon: <Trash2 size={15} />,
      label: '删除',
    },
  ];

  const handleAction = (task: DevelopmentTask, key: string) => {
    switch (key) {
      case 'open':
        message.info('开发编辑器将在后续版本接入');
        break;
      case 'copy':
        duplicateTask(task);
        break;
      case 'delete':
        deleteTask(task);
        break;
      default:
        break;
    }
  };

  const columns: TableColumnsType<DevelopmentTask> = [
    {
      title: '任务名称',
      dataIndex: 'name',
      key: 'name',
      width: 320,
      render: (_, task) => (
        <button
          type="button"
          className="flex min-w-0 items-center gap-3 border-0 bg-transparent p-0 text-left"
          onClick={() => handleAction(task, 'open')}
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[7px] bg-[rgba(254,44,85,0.06)] text-[#fe2c55]">
            {task.type === 'SQL' ? (
              <Braces size={18} />
            ) : (
              <FileCode2 size={18} />
            )}
          </span>
          <span className="flex min-w-0 flex-col gap-0.5">
            <strong className="truncate text-[13px] font-medium text-[#161823]">
              {task.name}
            </strong>
            <span className="truncate text-[11px] text-[rgba(22,24,35,0.42)]">
              {task.id}
            </span>
          </span>
        </button>
      ),
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 110,
      render: (value: DevelopmentTaskType) => (
        <Tag bordered={false}>
          {value === 'SQL' ? 'SQL 脚本' : 'Python'}
        </Tag>
      ),
    },
    {
      title: '计算引擎',
      dataIndex: 'engine',
      key: 'engine',
      width: 140,
    },
    {
      title: '目录',
      dataIndex: 'folder',
      key: 'folder',
      width: 150,
      ellipsis: true,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 110,
      render: (value: DevelopmentTaskStatus) => (
        <Tag
          bordered={false}
          className={
            value === 'PUBLISHED'
              ? '!bg-[rgba(254,44,85,0.06)] !text-[#fe2c55]'
              : '!bg-[#f2f3f5] !text-[rgba(22,24,35,0.58)]'
          }
        >
          {value === 'PUBLISHED' ? '已发布' : '草稿'}
        </Tag>
      ),
    },
    {
      title: '负责人',
      dataIndex: 'owner',
      key: 'owner',
      width: 120,
    },
    {
      title: '更新时间',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: 170,
    },
    {
      title: '',
      key: 'actions',
      fixed: 'right',
      width: 60,
      align: 'center',
      render: (_, task) => (
        <Dropdown
          trigger={['click']}
          menu={{
            items: getActionItems(task),
            onClick: ({ key, domEvent }) => {
              domEvent.stopPropagation();
              handleAction(task, key);
            },
          }}
        >
          <Button
            type="text"
            size="small"
            aria-label={`操作 ${task.name}`}
            icon={<MoreHorizontal size={17} />}
          />
        </Dropdown>
      ),
    },
  ];

  return (
    <ConfigProvider theme={BRAND_THEME}>
      <div className="min-h-[calc(100vh-48px)] bg-white px-5 pb-5 pt-4 text-[#161823]">
        <header className="flex min-h-11 items-center justify-between gap-4">
          <h1 className="m-0 text-[17px] font-semibold leading-6">工作台</h1>
          <Button
            type="primary"
            icon={<Plus size={16} />}
            onClick={openCreateModal}
          >
            新建开发任务
          </Button>
        </header>

        <section className="mt-2 grid grid-cols-4 gap-2 max-[980px]:grid-cols-2">
          <div className="flex min-h-[70px] items-center gap-3 border border-[#f0f0f0] bg-[#fafbfc] px-4 py-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-[7px] bg-[rgba(254,44,85,0.06)] text-[#fe2c55]">
              <FileText size={19} />
            </span>
            <div>
              <Text type="secondary" className="!text-[11px]">
                开发任务
              </Text>
              <div className="mt-0.5 text-lg font-semibold">{summary.total}</div>
            </div>
          </div>
          <div className="flex min-h-[70px] items-center gap-3 border border-[#f0f0f0] bg-[#fafbfc] px-4 py-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-[7px] bg-[#f2f3f5] text-[rgba(22,24,35,0.58)]">
              <Clock3 size={19} />
            </span>
            <div>
              <Text type="secondary" className="!text-[11px]">
                草稿
              </Text>
              <div className="mt-0.5 text-lg font-semibold">{summary.draft}</div>
            </div>
          </div>
          <div className="flex min-h-[70px] items-center gap-3 border border-[#f0f0f0] bg-[#fafbfc] px-4 py-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-[7px] bg-[rgba(254,44,85,0.06)] text-[#fe2c55]">
              <CircleCheck size={19} />
            </span>
            <div>
              <Text type="secondary" className="!text-[11px]">
                已发布
              </Text>
              <div className="mt-0.5 text-lg font-semibold">
                {summary.published}
              </div>
            </div>
          </div>
          <div className="flex min-h-[70px] items-center gap-3 border border-[#f0f0f0] bg-[#fafbfc] px-4 py-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-[7px] bg-[#f2f3f5] text-[rgba(22,24,35,0.58)]">
              <Braces size={19} />
            </span>
            <div>
              <Text type="secondary" className="!text-[11px]">
                支持引擎
              </Text>
              <div className="mt-0.5 text-lg font-semibold">4</div>
            </div>
          </div>
        </section>

        <section className="mt-3 border border-[#e4e7ec] bg-white">
          <div className="flex min-h-[54px] items-center justify-between gap-4 border-b border-[#eaecf0] px-3 py-2 max-[900px]:flex-col max-[900px]:items-stretch">
            <Segmented
              value={statusFilter}
              options={[
                { label: '全部任务', value: 'ALL' },
                { label: '草稿', value: 'DRAFT' },
                { label: '已发布', value: 'PUBLISHED' },
              ]}
              onChange={(value) => setStatusFilter(value as StatusFilter)}
            />

            <Space size={8} wrap>
              <Input
                allowClear
                variant="filled"
                prefix={<Search size={15} />}
                placeholder="搜索任务名称、ID 或目录"
                className="w-[250px]"
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
              />
              <Select
                allowClear
                variant="filled"
                placeholder="全部引擎"
                className="w-[140px]"
                options={engineOptions}
                value={engineFilter}
                onChange={setEngineFilter}
              />
            </Space>
          </div>

          <Table<DevelopmentTask>
            rowKey="id"
            columns={columns}
            dataSource={filteredTasks}
            pagination={false}
            scroll={{ x: 1150 }}
            locale={{
              emptyText: (
                <Empty
                  image={
                    <YakOpsEmpty
                      width={220}
                      height={174}
                      primaryColor={BRAND_COLOR}
                    />
                  }
                  description={
                    keyword || statusFilter !== 'ALL' || engineFilter
                      ? '没有匹配的数据开发任务'
                      : '还没有数据开发任务'
                  }
                >
                  {!keyword && statusFilter === 'ALL' && !engineFilter && (
                    <Button
                      type="primary"
                      icon={<Plus size={15} />}
                      onClick={openCreateModal}
                    >
                      新建第一个任务
                    </Button>
                  )}
                </Empty>
              ),
            }}
          />
        </section>

        <Modal
          title="新建开发任务"
          open={createOpen}
          centered
          width={560}
          okText="创建任务"
          cancelText="取消"
          destroyOnHidden
          onCancel={() => {
            setCreateOpen(false);
            form.resetFields();
          }}
          onOk={() => form.submit()}
        >
          <Form<CreateTaskValues>
            form={form}
            layout="vertical"
            className="pt-2"
            onFinish={handleCreate}
          >
            <Form.Item
              name="name"
              label="任务名称"
              rules={[
                { required: true, message: '请输入任务名称' },
                { max: 80, message: '任务名称不能超过 80 个字符' },
              ]}
            >
              <Input variant="filled" placeholder="例如：用户订单实时汇总" />
            </Form.Item>

            <div className="grid grid-cols-2 gap-3">
              <Form.Item
                name="type"
                label="开发类型"
                rules={[{ required: true, message: '请选择开发类型' }]}
              >
                <Select variant="filled" options={typeOptions} />
              </Form.Item>
              <Form.Item
                name="engine"
                label="计算引擎"
                rules={[{ required: true, message: '请选择计算引擎' }]}
              >
                <Select variant="filled" options={engineOptions} />
              </Form.Item>
            </div>

            <Form.Item name="folder" label="所属目录">
              <Input variant="filled" placeholder="默认目录" />
            </Form.Item>

            <Form.Item name="description" label="任务描述">
              <Input.TextArea
                variant="filled"
                rows={4}
                maxLength={300}
                showCount
                placeholder="补充说明该任务的业务用途"
              />
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </ConfigProvider>
  );
};

export default DataDevelopmentWorkbenchPage;

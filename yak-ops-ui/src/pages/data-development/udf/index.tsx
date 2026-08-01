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
  MoreHorizontal,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import { useMemo, useState } from 'react';

const { Text } = Typography;

type UdfLanguage = 'JAVA' | 'SCALA' | 'PYTHON';
type UdfType = 'UDF' | 'UDTF' | 'UDAF';
type UdfStatus = 'DRAFT' | 'PUBLISHED';
type UdfStatusFilter = 'ALL' | UdfStatus;

interface UdfFunction {
  id: string;
  name: string;
  type: UdfType;
  language: UdfLanguage;
  entryClass: string;
  resourcePath: string;
  description?: string;
  status: UdfStatus;
  owner: string;
  updatedAt: string;
}

interface CreateUdfValues {
  name: string;
  type: UdfType;
  language: UdfLanguage;
  entryClass: string;
  resourcePath: string;
  description?: string;
}

const languageOptions = [
  { label: 'Java', value: 'JAVA' },
  { label: 'Scala', value: 'SCALA' },
  { label: 'Python', value: 'PYTHON' },
];

const udfTypeOptions = [
  { label: '标量函数 UDF', value: 'UDF' },
  { label: '表值函数 UDTF', value: 'UDTF' },
  { label: '聚合函数 UDAF', value: 'UDAF' },
];

const DataDevelopmentUdfPage = () => {
  const [form] = Form.useForm<CreateUdfValues>();
  const [functions, setFunctions] = useState<UdfFunction[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] =
    useState<UdfStatusFilter>('ALL');
  const [languageFilter, setLanguageFilter] = useState<UdfLanguage>();

  const summary = useMemo(
    () => ({
      total: functions.length,
      published: functions.filter((item) => item.status === 'PUBLISHED').length,
      draft: functions.filter((item) => item.status === 'DRAFT').length,
    }),
    [functions],
  );

  const filteredFunctions = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();

    return functions.filter((item) => {
      const matchesKeyword =
        !normalizedKeyword ||
        item.name.toLowerCase().includes(normalizedKeyword) ||
        item.id.toLowerCase().includes(normalizedKeyword) ||
        item.entryClass.toLowerCase().includes(normalizedKeyword);
      const matchesStatus =
        statusFilter === 'ALL' || item.status === statusFilter;
      const matchesLanguage =
        !languageFilter || item.language === languageFilter;

      return matchesKeyword && matchesStatus && matchesLanguage;
    });
  }, [functions, keyword, languageFilter, statusFilter]);

  const openCreateModal = () => {
    form.setFieldsValue({
      type: 'UDF',
      language: 'JAVA',
    });
    setCreateOpen(true);
  };

  const handleCreate = (values: CreateUdfValues) => {
    const udf: UdfFunction = {
      id: `UDF-${Date.now().toString().slice(-8)}`,
      name: values.name.trim(),
      type: values.type,
      language: values.language,
      entryClass: values.entryClass.trim(),
      resourcePath: values.resourcePath.trim(),
      description: values.description?.trim(),
      status: 'DRAFT',
      owner: '当前用户',
      updatedAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
    };

    setFunctions((current) => [udf, ...current]);
    setCreateOpen(false);
    form.resetFields();
    message.success('UDF 函数已创建');
  };

  const duplicateFunction = (udf: UdfFunction) => {
    const copyFunction: UdfFunction = {
      ...udf,
      id: `UDF-${Date.now().toString().slice(-8)}`,
      name: `${udf.name} 副本`,
      status: 'DRAFT',
      updatedAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
    };

    setFunctions((current) => [copyFunction, ...current]);
    message.success('UDF 函数已复制');
  };

  const deleteFunction = (udf: UdfFunction) => {
    Modal.confirm({
      centered: true,
      title: '确认删除 UDF 函数吗？',
      content: `删除“${udf.name}”后无法恢复。`,
      okText: '删除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: () => {
        setFunctions((current) =>
          current.filter((item) => item.id !== udf.id),
        );
        message.success('UDF 函数已删除');
      },
    });
  };

  const getActionItems = (udf: UdfFunction): MenuProps['items'] => [
    {
      key: 'detail',
      icon: <FileCode2 size={15} />,
      label: '查看函数',
    },
    {
      key: 'copy',
      icon: <Copy size={15} />,
      label: '复制函数',
    },
    { type: 'divider' },
    {
      key: 'delete',
      danger: true,
      icon: <Trash2 size={15} />,
      label: '删除',
    },
  ];

  const handleAction = (udf: UdfFunction, key: string) => {
    switch (key) {
      case 'detail':
        message.info('UDF 详情将在后续版本接入');
        break;
      case 'copy':
        duplicateFunction(udf);
        break;
      case 'delete':
        deleteFunction(udf);
        break;
      default:
        break;
    }
  };

  const columns: TableColumnsType<UdfFunction> = [
    {
      title: '函数名称',
      dataIndex: 'name',
      key: 'name',
      width: 260,
      render: (_, udf) => (
        <button
          type="button"
          className="flex min-w-0 items-center gap-3 border-0 bg-transparent p-0 text-left"
          onClick={() => handleAction(udf, 'detail')}
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[7px] bg-[rgba(254,44,85,0.06)] text-[#fe2c55]">
            <Braces size={18} />
          </span>
          <span className="min-w-0">
            <strong className="block truncate text-[13px] font-medium text-[#161823]">
              {udf.name}
            </strong>
            <small className="block truncate text-[11px] text-[rgba(22,24,35,0.42)]">
              {udf.id}
            </small>
          </span>
        </button>
      ),
    },
    {
      title: '函数类型',
      dataIndex: 'type',
      key: 'type',
      width: 110,
      render: (value: UdfType) => <Tag bordered={false}>{value}</Tag>,
    },
    {
      title: '语言',
      dataIndex: 'language',
      key: 'language',
      width: 100,
      render: (value: UdfLanguage) =>
        languageOptions.find((item) => item.value === value)?.label || value,
    },
    {
      title: '入口类 / 函数',
      dataIndex: 'entryClass',
      key: 'entryClass',
      width: 240,
      ellipsis: true,
    },
    {
      title: '资源文件',
      dataIndex: 'resourcePath',
      key: 'resourcePath',
      width: 220,
      ellipsis: true,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (value: UdfStatus) => (
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
      render: (_, udf) => (
        <Dropdown
          trigger={['click']}
          menu={{
            items: getActionItems(udf),
            onClick: ({ key, domEvent }) => {
              domEvent.stopPropagation();
              handleAction(udf, key);
            },
          }}
        >
          <Button
            type="text"
            size="small"
            aria-label={`操作 ${udf.name}`}
            icon={<MoreHorizontal size={17} />}
          />
        </Dropdown>
      ),
    },
  ];

  const hasFilters =
    Boolean(keyword) || statusFilter !== 'ALL' || Boolean(languageFilter);

  return (
    <ConfigProvider theme={BRAND_THEME}>
      <div className="min-h-[calc(100vh-48px)] bg-white px-5 pb-5 pt-4 text-[#161823]">
        <header className="flex min-h-11 items-center justify-between gap-4">
          <h1 className="m-0 text-[17px] font-semibold leading-6">UDF 函数</h1>
          <Button
            type="primary"
            icon={<Plus size={16} />}
            onClick={openCreateModal}
          >
            新建 UDF
          </Button>
        </header>

        <section className="mt-2 grid grid-cols-4 gap-2 max-[980px]:grid-cols-2">
          <div className="flex min-h-[70px] items-center gap-3 border border-[#f0f0f0] bg-[#fafbfc] px-4 py-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-[7px] bg-[rgba(254,44,85,0.06)] text-[#fe2c55]">
              <Braces size={19} />
            </span>
            <div>
              <Text type="secondary" className="!text-[11px]">函数数量</Text>
              <div className="mt-0.5 text-lg font-semibold">{summary.total}</div>
            </div>
          </div>
          <div className="flex min-h-[70px] items-center gap-3 border border-[#f0f0f0] bg-[#fafbfc] px-4 py-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-[7px] bg-[rgba(254,44,85,0.06)] text-[#fe2c55]">
              <CircleCheck size={19} />
            </span>
            <div>
              <Text type="secondary" className="!text-[11px]">已发布</Text>
              <div className="mt-0.5 text-lg font-semibold">{summary.published}</div>
            </div>
          </div>
          <div className="flex min-h-[70px] items-center gap-3 border border-[#f0f0f0] bg-[#fafbfc] px-4 py-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-[7px] bg-[#f2f3f5] text-[rgba(22,24,35,0.58)]">
              <Clock3 size={19} />
            </span>
            <div>
              <Text type="secondary" className="!text-[11px]">草稿</Text>
              <div className="mt-0.5 text-lg font-semibold">{summary.draft}</div>
            </div>
          </div>
          <div className="flex min-h-[70px] items-center gap-3 border border-[#f0f0f0] bg-[#fafbfc] px-4 py-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-[7px] bg-[#f2f3f5] text-[rgba(22,24,35,0.58)]">
              <FileCode2 size={19} />
            </span>
            <div>
              <Text type="secondary" className="!text-[11px]">函数类型</Text>
              <div className="mt-0.5 text-lg font-semibold">3</div>
            </div>
          </div>
        </section>

        <section className="mt-3 border border-[#e4e7ec] bg-white">
          <div className="flex min-h-[54px] items-center justify-between gap-4 border-b border-[#eaecf0] px-3 py-2 max-[920px]:flex-col max-[920px]:items-stretch">
            <Segmented
              value={statusFilter}
              options={[
                { label: '全部函数', value: 'ALL' },
                { label: '草稿', value: 'DRAFT' },
                { label: '已发布', value: 'PUBLISHED' },
              ]}
              onChange={(value) =>
                setStatusFilter(value as UdfStatusFilter)
              }
            />

            <Space size={8} wrap>
              <Input
                allowClear
                variant="filled"
                prefix={<Search size={15} />}
                placeholder="搜索函数名称、ID 或入口类"
                className="w-[260px]"
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
              />
              <Select<UdfLanguage>
                allowClear
                variant="filled"
                placeholder="全部语言"
                className="w-[130px]"
                options={languageOptions}
                value={languageFilter}
                onChange={setLanguageFilter}
              />
            </Space>
          </div>

          <Table<UdfFunction>
            rowKey="id"
            columns={columns}
            dataSource={filteredFunctions}
            pagination={false}
            scroll={{ x: 1350 }}
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
                    hasFilters ? '没有匹配的 UDF 函数' : '还没有 UDF 函数'
                  }
                >
                  {!hasFilters && (
                    <Button
                      type="primary"
                      icon={<Plus size={15} />}
                      onClick={openCreateModal}
                    >
                      新建第一个 UDF
                    </Button>
                  )}
                </Empty>
              ),
            }}
          />
        </section>

        <Modal
          title="新建 UDF 函数"
          open={createOpen}
          centered
          width={600}
          okText="创建函数"
          cancelText="取消"
          destroyOnHidden
          onCancel={() => {
            setCreateOpen(false);
            form.resetFields();
          }}
          onOk={() => form.submit()}
        >
          <Form<CreateUdfValues>
            form={form}
            layout="vertical"
            className="pt-2"
            onFinish={handleCreate}
          >
            <Form.Item
              name="name"
              label="函数名称"
              rules={[
                { required: true, message: '请输入函数名称' },
                { max: 80, message: '函数名称不能超过 80 个字符' },
              ]}
            >
              <Input variant="filled" placeholder="例如：mask_phone" />
            </Form.Item>

            <div className="grid grid-cols-2 gap-3">
              <Form.Item
                name="type"
                label="函数类型"
                rules={[{ required: true, message: '请选择函数类型' }]}
              >
                <Select variant="filled" options={udfTypeOptions} />
              </Form.Item>
              <Form.Item
                name="language"
                label="开发语言"
                rules={[{ required: true, message: '请选择开发语言' }]}
              >
                <Select variant="filled" options={languageOptions} />
              </Form.Item>
            </div>

            <Form.Item
              name="entryClass"
              label="入口类 / 函数"
              rules={[{ required: true, message: '请输入入口类或函数名称' }]}
            >
              <Input
                variant="filled"
                placeholder="例如：io.yak.ops.udf.MaskPhoneFunction"
              />
            </Form.Item>

            <Form.Item
              name="resourcePath"
              label="资源文件"
              rules={[{ required: true, message: '请输入资源文件路径' }]}
            >
              <Input
                variant="filled"
                placeholder="例如：/udf/yak-ops-udf.jar"
              />
            </Form.Item>

            <Form.Item name="description" label="函数说明">
              <Input.TextArea
                variant="filled"
                rows={4}
                maxLength={300}
                showCount
                placeholder="补充函数用途、输入参数和返回值说明"
              />
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </ConfigProvider>
  );
};

export default DataDevelopmentUdfPage;

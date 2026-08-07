import { API_SUCCESS_CODE } from '@/services/http/response';
import {
  BRAND_COLOR,
  BRAND_COLOR_SOFT,
  BRAND_THEME,
} from '@/styles/brand';
import {
  Button,
  ConfigProvider,
  Dropdown,
  Empty,
  Form,
  Input,
  Modal,
  Select,
  Spin,
  Table,
  Tabs,
  Tag,
  message,
} from 'antd';
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  Ellipsis,
  Folder,
  FolderPlus,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from 'lucide-react';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { dataQualityTableClassName } from '../components/tableStyle';
import { qualityTemplateApi } from '../service';
import type {
  CopyCustomTemplatePayload,
  SaveCustomTemplatePayload,
  SaveTemplateFolderPayload,
  TemplateFolderView,
  TemplateListView,
  TemplateView,
} from '../types';
import CustomTemplateDrawer from './CustomTemplateDrawer';

const DEFAULT_LEFT_WIDTH = 280;
const MIN_LEFT_WIDTH = 230;
const MAX_LEFT_WIDTH = 460;

type TemplateTabKey = 'SYSTEM' | 'CUSTOM';
type FolderSelection = 'ALL' | 'ROOT' | number;
type FolderDialogMode = 'create' | 'edit';

interface CatalogMeta {
  systemTotal: number;
  customTotal: number;
  systemDimensions: Record<string, number>;
  customDimensions: Record<string, number>;
}

const DIMENSION_DESCRIPTIONS: Record<string, string> = {
  全部:
    '汇总展示全部质量维度下的规则模板，可通过维度、模板类型和关键字快速定位。',
  完整性:
    '完整性用于衡量数据是否按照预设要求完整填充，可识别必要数据缺失。',
  唯一性:
    '唯一性用于衡量数据是否存在重复，可判断业务键或字段组合是否唯一。',
  有效性:
    '有效性用于判断数据是否符合预设格式、范围和业务定义。',
  一致性:
    '一致性用于衡量字段、数据表或系统之间的数据表达是否保持一致。',
  准确性:
    '准确性用于衡量数据是否正确反映实际业务对象。',
  及时性:
    '及时性用于衡量数据是否在规定时间内产生、更新或同步。',
  规范性:
    '规范性用于衡量数据是否符合统一的数据标准和编码规则。',
  自定义:
    '自定义维度用于承载团队自行定义的数据质量指标和检查口径。',
};

const unwrap = <T,>(response: {
  code: number;
  data: T;
  message?: string;
  msg?: string;
}) => {
  if (response.code !== API_SUCCESS_CODE) {
    throw new Error(response.message || response.msg || '请求失败');
  }
  return response.data;
};

interface FolderRow extends TemplateFolderView {
  depth: number;
}

const flattenFolders = (folders: TemplateFolderView[]) => {
  const groups = new Map<number | undefined, TemplateFolderView[]>();
  folders.forEach((folder) => {
    const values = groups.get(folder.parentId) || [];
    values.push(folder);
    groups.set(folder.parentId, values);
  });
  groups.forEach((values) =>
    values.sort(
      (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name),
    ),
  );
  const result: FolderRow[] = [];
  const walk = (parentId: number | undefined, depth: number) => {
    (groups.get(parentId) || []).forEach((folder) => {
      result.push({ ...folder, depth });
      walk(folder.id, depth + 1);
    });
  };
  walk(undefined, 0);
  return result;
};

const TemplateLibraryPage = () => {
  const [data, setData] = useState<TemplateListView>({
    records: [],
    summary: {
      total: 0,
      systemTotal: 0,
      customTotal: 0,
      dimensions: {},
    },
  });
  const [folders, setFolders] = useState<TemplateFolderView[]>([]);
  const [catalogMeta, setCatalogMeta] = useState<CatalogMeta>({
    systemTotal: 0,
    customTotal: 0,
    systemDimensions: {},
    customDimensions: {},
  });
  const [dimension, setDimension] = useState('全部');
  const [activeTab, setActiveTab] = useState<TemplateTabKey>('SYSTEM');
  const [selectedFolder, setSelectedFolder] =
    useState<FolderSelection>('ALL');
  const [keyword, setKeyword] = useState('');
  const [folderKeyword, setFolderKeyword] = useState('');
  const [loading, setLoading] = useState(false);
  const [folderLoading, setFolderLoading] = useState(false);
  const [leftWidth, setLeftWidth] = useState(DEFAULT_LEFT_WIDTH);
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<'create' | 'edit'>('create');
  const [editingTemplate, setEditingTemplate] = useState<TemplateView>();
  const [submitting, setSubmitting] = useState(false);
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [folderDialogMode, setFolderDialogMode] =
    useState<FolderDialogMode>('create');
  const [editingFolder, setEditingFolder] =
    useState<TemplateFolderView>();
  const [copyTemplate, setCopyTemplate] = useState<TemplateView>();
  const [folderForm] = Form.useForm<SaveTemplateFolderPayload>();
  const [copyForm] = Form.useForm<CopyCustomTemplatePayload>();
  const dragRef = useRef<{ x: number; width: number } | null>(null);

  const loadFolders = useCallback(() => {
    setFolderLoading(true);
    qualityTemplateApi
      .folders()
      .then((response) => setFolders(unwrap(response)))
      .catch((error) =>
        message.error(error?.message || '自定义模板目录加载失败'),
      )
      .finally(() => setFolderLoading(false));
  }, []);

  const loadCatalogMeta = useCallback(() => {
    Promise.all([
      qualityTemplateApi.list(),
      qualityTemplateApi.customList(),
    ])
      .then(([systemResponse, customResponse]) => {
        const allTemplates = unwrap(systemResponse).records;
        const systemRecords = allTemplates.filter(
          (template) => template.builtin,
        );
        const systemDimensions: Record<string, number> = {};
        systemRecords.forEach((template) => {
          systemDimensions[template.dimension] =
            (systemDimensions[template.dimension] || 0) + 1;
        });
        const customData = unwrap(customResponse);
        setCatalogMeta({
          systemTotal: systemRecords.length,
          customTotal:
            customData.summary.customTotal ?? customData.records.length,
          systemDimensions,
          customDimensions: customData.summary.dimensions || {},
        });
      })
      .catch((error) =>
        message.error(error?.message || '模板统计加载失败'),
      );
  }, []);

  const loadTemplates = useCallback(() => {
    setLoading(true);
    const folderId =
      activeTab !== 'CUSTOM' || selectedFolder === 'ALL'
        ? undefined
        : selectedFolder === 'ROOT'
          ? 0
          : selectedFolder;
    const request =
      activeTab === 'CUSTOM'
        ? qualityTemplateApi.customList({
            keyword: keyword.trim() || undefined,
            dimension: dimension === '全部' ? undefined : dimension,
            folderId,
          })
        : qualityTemplateApi.list({
            keyword: keyword.trim() || undefined,
            dimension: dimension === '全部' ? undefined : dimension,
          });
    request
      .then((response) => {
        const value = unwrap(response);
        setData({
          records:
            activeTab === 'SYSTEM'
              ? value.records.filter((template) => template.builtin)
              : value.records,
          summary: value.summary,
        });
      })
      .catch((error) =>
        message.error(error?.message || '规则模板加载失败'),
      )
      .finally(() => setLoading(false));
  }, [activeTab, dimension, keyword, selectedFolder]);

  useEffect(() => loadFolders(), [loadFolders]);
  useEffect(() => loadCatalogMeta(), [loadCatalogMeta]);
  useEffect(() => loadTemplates(), [loadTemplates]);

  const dimensions = useMemo(() => {
    const source =
      activeTab === 'SYSTEM'
        ? catalogMeta.systemDimensions
        : catalogMeta.customDimensions;
    const total =
      activeTab === 'SYSTEM'
        ? catalogMeta.systemTotal
        : catalogMeta.customTotal;
    return [
      { label: '全部', count: total },
      ...Object.entries(source).map(([label, count]) => ({
        label,
        count,
      })),
    ];
  }, [activeTab, catalogMeta]);

  const visibleFolders = useMemo(() => {
    const flattened = flattenFolders(folders);
    const normalized = folderKeyword.trim().toLowerCase();
    return normalized
      ? flattened.filter((folder) =>
          folder.name.toLowerCase().includes(normalized),
        )
      : flattened;
  }, [folderKeyword, folders]);

  const relatedRuleCount = useMemo(
    () =>
      data.records.reduce(
        (total, template) => total + Number(template.ruleCount || 0),
        0,
      ),
    [data.records],
  );

  const selectedFolderId =
    typeof selectedFolder === 'number' ? selectedFolder : undefined;

  const startResize = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    const initialWidth = collapsed ? MIN_LEFT_WIDTH : leftWidth;
    if (collapsed) setCollapsed(false);
    dragRef.current = { x: event.clientX, width: initialWidth };

    const move = (current: PointerEvent) => {
      if (!dragRef.current) return;
      setLeftWidth(
        Math.min(
          MAX_LEFT_WIDTH,
          Math.max(
            MIN_LEFT_WIDTH,
            dragRef.current.width + current.clientX - dragRef.current.x,
          ),
        ),
      );
    };

    const end = () => {
      dragRef.current = null;
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', end);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', end);
  };

  const openCreateFolder = (parentId?: number) => {
    setFolderDialogMode('create');
    setEditingFolder(undefined);
    folderForm.setFieldsValue({ name: '', parentId });
    setFolderDialogOpen(true);
  };

  const openEditFolder = (folder: TemplateFolderView) => {
    setFolderDialogMode('edit');
    setEditingFolder(folder);
    folderForm.setFieldsValue({
      name: folder.name,
      parentId: folder.parentId,
    });
    setFolderDialogOpen(true);
  };

  const saveFolder = async () => {
    const payload = await folderForm.validateFields();
    setSubmitting(true);
    try {
      if (folderDialogMode === 'edit' && editingFolder) {
        unwrap(
          await qualityTemplateApi.updateFolder(
            editingFolder.id,
            payload,
          ),
        );
        message.success('目录已更新');
      } else {
        unwrap(await qualityTemplateApi.createFolder(payload));
        message.success('目录已创建');
      }
      setFolderDialogOpen(false);
      loadFolders();
      loadCatalogMeta();
      loadTemplates();
    } catch (error: any) {
      message.error(error?.message || '目录保存失败');
    } finally {
      setSubmitting(false);
    }
  };

  const removeFolder = (folder: TemplateFolderView) => {
    Modal.confirm({
      title: `删除目录“${folder.name}”？`,
      content: '只有不包含子目录和模板的空目录可以删除。',
      okText: '删除',
      okButtonProps: { danger: true },
      onOk: async () => {
        unwrap(await qualityTemplateApi.removeFolder(folder.id));
        if (selectedFolder === folder.id) setSelectedFolder('ALL');
        message.success('目录已删除');
        loadFolders();
        loadCatalogMeta();
        loadTemplates();
      },
    });
  };

  const openCreateTemplate = () => {
    setDrawerMode('create');
    setEditingTemplate(undefined);
    setDrawerOpen(true);
  };

  const openEditTemplate = (template: TemplateView) => {
    setDrawerMode('edit');
    setEditingTemplate(template);
    setDrawerOpen(true);
  };

  const saveTemplate = async (payload: SaveCustomTemplatePayload) => {
    setSubmitting(true);
    try {
      if (drawerMode === 'edit' && editingTemplate) {
        unwrap(
          await qualityTemplateApi.updateCustom(
            editingTemplate.id,
            payload,
          ),
        );
        message.success('自定义模板已更新，已有规则不会被修改');
      } else {
        unwrap(await qualityTemplateApi.createCustom(payload));
        message.success('自定义模板已创建');
      }
      setDrawerOpen(false);
      loadFolders();
      loadCatalogMeta();
      loadTemplates();
    } catch (error: any) {
      message.error(error?.message || '自定义模板保存失败');
    } finally {
      setSubmitting(false);
    }
  };

  const removeTemplate = (template: TemplateView) => {
    Modal.confirm({
      title: `删除模板“${template.name}”？`,
      content: `该操作不会删除已引用此模板创建的 ${template.ruleCount} 条存量规则。`,
      okText: '删除',
      okButtonProps: { danger: true },
      onOk: async () => {
        unwrap(await qualityTemplateApi.removeCustom(template.id));
        message.success('自定义模板已删除');
        loadFolders();
        loadCatalogMeta();
        loadTemplates();
      },
    });
  };

  const openCopy = (template: TemplateView) => {
    setCopyTemplate(template);
    copyForm.setFieldsValue({
      name: `${template.name}-副本`,
      folderId: template.folderId,
    });
  };

  const saveCopy = async () => {
    if (!copyTemplate) return;
    const payload = await copyForm.validateFields();
    setSubmitting(true);
    try {
      unwrap(
        await qualityTemplateApi.copyCustom(copyTemplate.id, payload),
      );
      message.success('模板已复制');
      setCopyTemplate(undefined);
      loadFolders();
      loadCatalogMeta();
      loadTemplates();
    } catch (error: any) {
      message.error(error?.message || '模板复制失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ConfigProvider theme={BRAND_THEME}>
      <div className="flex h-[calc(100vh-64px)] min-h-[620px] flex-col overflow-hidden bg-white">
        <header className="flex h-12 shrink-0 items-center border-b border-[#e8e9ec] px-5">
          <h1 className="m-0 text-[20px] font-semibold text-[#161823]">
            规则模板库
          </h1>
        </header>

        <div className="flex min-h-0 flex-1 overflow-hidden">
          <aside
            className="shrink-0 overflow-hidden transition-[width] duration-200"
            style={{ width: collapsed ? 0 : leftWidth }}
          >
            <div
              className="h-full overflow-y-auto px-4 py-3"
              style={{ width: leftWidth }}
            >
              <div className="mb-2 text-xs font-semibold text-[#161823]">
                质量维度
              </div>
              <div className="space-y-1">
                {dimensions.map((item) => {
                  const selected = dimension === item.label;
                  return (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => setDimension(item.label)}
                      className={`flex h-8 w-full items-center justify-between border-0 px-2 text-left text-[13px] transition-colors ${
                        selected
                          ? 'bg-[rgba(254,44,85,.08)] font-medium text-[var(--yak-brand-color)]'
                          : 'bg-transparent text-[#30323b] hover:bg-[#f5f5f6]'
                      }`}
                    >
                      <span className="truncate">{item.label}</span>
                      <span
                        className={`ml-3 min-w-7 rounded-full px-2 text-center text-xs leading-5 ${
                          selected
                            ? 'bg-white text-[var(--yak-brand-color)]'
                            : 'bg-[#f2f3f5] text-[#5d616b]'
                        }`}
                      >
                        {item.count}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="mt-5 border-t border-[#eceef0] pt-4">
                <div className="mb-2 flex items-center justify-between">
                  <div className="text-xs font-semibold text-[#161823]">
                    自定义模板类目
                  </div>
                  <div className="flex items-center gap-0.5">
                    <Button
                      type="text"
                      size="small"
                      icon={<FolderPlus size={14} />}
                      onClick={() => openCreateFolder(selectedFolderId)}
                    />
                    <Button
                      type="text"
                      size="small"
                      icon={<RefreshCw size={14} />}
                      loading={folderLoading}
                      onClick={loadFolders}
                    />
                  </div>
                </div>
                <Input
                  allowClear
                  variant="filled"
                  size="small"
                  value={folderKeyword}
                  onChange={(event) =>
                    setFolderKeyword(event.target.value)
                  }
                  prefix={
                    <Search size={13} className="text-[#98a2b3]" />
                  }
                  placeholder="搜索模板类目"
                  className="mb-2"
                />
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFolder('ALL');
                    setActiveTab('CUSTOM');
                  }}
                  className={`flex h-8 w-full items-center gap-2 border-0 px-2 text-left text-[13px] ${
                    selectedFolder === 'ALL'
                      ? 'bg-[rgba(254,44,85,.08)] text-[var(--yak-brand-color)]'
                      : 'bg-transparent text-[#30323b] hover:bg-[#f5f5f6]'
                  }`}
                >
                  <Folder size={14} />
                  <span className="flex-1">全部</span>
                  <span className="text-xs text-[#8a8f99]">
                    {catalogMeta.customTotal}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFolder('ROOT');
                    setActiveTab('CUSTOM');
                  }}
                  className={`flex h-8 w-full items-center gap-2 border-0 px-2 text-left text-[13px] ${
                    selectedFolder === 'ROOT'
                      ? 'bg-[rgba(254,44,85,.08)] text-[var(--yak-brand-color)]'
                      : 'bg-transparent text-[#30323b] hover:bg-[#f5f5f6]'
                  }`}
                >
                  <Folder size={14} />
                  <span className="flex-1">未分类</span>
                </button>

                <Spin spinning={folderLoading} size="small">
                  <div className="mt-0.5 space-y-0.5">
                    {visibleFolders.map((folder) => (
                      <Dropdown
                        key={folder.id}
                        trigger={['contextMenu']}
                        menu={{
                          items: [
                            {
                              key: 'child',
                              icon: <FolderPlus size={14} />,
                              label: '新建子目录',
                              onClick: () =>
                                openCreateFolder(folder.id),
                            },
                            {
                              key: 'edit',
                              icon: <Pencil size={14} />,
                              label: '重命名或移动',
                              onClick: () => openEditFolder(folder),
                            },
                            { type: 'divider' },
                            {
                              key: 'delete',
                              danger: true,
                              icon: <Trash2 size={14} />,
                              label: '删除目录',
                              onClick: () => removeFolder(folder),
                            },
                          ],
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedFolder(folder.id);
                            setActiveTab('CUSTOM');
                          }}
                          className={`flex h-8 w-full items-center gap-2 border-0 pr-2 text-left text-[13px] ${
                            selectedFolder === folder.id
                              ? 'bg-[rgba(254,44,85,.08)] text-[var(--yak-brand-color)]'
                              : 'bg-transparent text-[#30323b] hover:bg-[#f5f5f6]'
                          }`}
                          style={{
                            paddingLeft: 8 + folder.depth * 16,
                          }}
                        >
                          <Folder size={14} />
                          <span className="min-w-0 flex-1 truncate">
                            {folder.name}
                          </span>
                          <span className="text-xs text-[#8a8f99]">
                            {folder.templateCount}
                          </span>
                        </button>
                      </Dropdown>
                    ))}
                  </div>
                </Spin>
                <div className="mt-2 text-[11px] leading-5 text-[#98a2b3]">
                  右键目录可新建子目录、重命名、移动或删除。
                </div>
              </div>
            </div>
          </aside>

          <div
            role="separator"
            onPointerDown={startResize}
            className="relative w-3 shrink-0 cursor-col-resize"
          >
            <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-[#e4e7ec]" />
            <button
              type="button"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={() => setCollapsed((value) => !value)}
              className="absolute left-1/2 top-1/2 z-10 flex h-8 w-4 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded border border-[#dfe1e5] bg-white text-[#7b808a]"
            >
              {collapsed ? (
                <ChevronRight size={13} />
              ) : (
                <ChevronLeft size={13} />
              )}
            </button>
          </div>

          <main className="min-w-0 flex-1 overflow-hidden px-5 py-4">
            <div className="flex h-full flex-col overflow-hidden">
              <section className="shrink-0">
                <div className="flex items-start justify-between gap-6">
                  <div className="min-w-0 flex-1">
                    <h2 className="m-0 text-[15px] font-semibold leading-6 text-[#161823]">
                      {dimension}
                    </h2>
                    <div className="mt-1 max-w-[900px] text-[13px] leading-6 text-[#8a8f99]">
                      {DIMENSION_DESCRIPTIONS[dimension]
                        || `${dimension}用于衡量数据是否符合对应的数据质量要求。`}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Input
                      allowClear
                      variant="filled"
                      value={keyword}
                      onChange={(event) =>
                        setKeyword(event.target.value)
                      }
                      prefix={
                        <Search
                          size={14}
                          className="text-[#98a2b3]"
                        />
                      }
                      placeholder="搜索模板名称、编码或描述"
                      className="w-[330px]"
                    />
                    <Button
                      icon={<RefreshCw size={14} />}
                      onClick={() => {
                        loadCatalogMeta();
                        loadTemplates();
                      }}
                    />
                  </div>
                </div>

                <div className="mt-2.5 flex flex-wrap items-center gap-2">
                  <div className="inline-flex h-7 items-center rounded bg-[#f5f5f6] px-2.5 text-xs text-[#60646f]">
                    维度类型：
                    <strong className="ml-1 text-[#30323b]">
                      系统维度
                    </strong>
                  </div>
                  <div className="inline-flex h-7 items-center rounded bg-[#f5f5f6] px-2.5 text-xs text-[#60646f]">
                    关联模板数：
                    <strong className="ml-1 text-[#30323b]">
                      {data.records.length}
                    </strong>
                  </div>
                  <div className="inline-flex h-7 items-center rounded bg-[#f5f5f6] px-2.5 text-xs text-[#60646f]">
                    关联规则数：
                    <strong className="ml-1 text-[#30323b]">
                      {relatedRuleCount}
                    </strong>
                  </div>
                </div>

                <Tabs
                  activeKey={activeTab}
                  animated={false}
                  items={[
                    {
                      key: 'SYSTEM',
                      label: `系统模板 (${catalogMeta.systemTotal})`,
                    },
                    {
                      key: 'CUSTOM',
                      label: `自定义模板 (${catalogMeta.customTotal})`,
                    },
                  ]}
                  onChange={(key) =>
                    setActiveTab(key as TemplateTabKey)
                  }
                  className="mt-2 [&_.ant-tabs-nav]:!mb-0 [&_.ant-tabs-tab]:!px-3 [&_.ant-tabs-tab]:!py-2.5 [&_.ant-tabs-tab-btn]:!text-[13px]"
                />
              </section>

              <section className="min-h-0 flex flex-1 flex-col overflow-hidden pt-3">
                {activeTab === 'CUSTOM' ? (
                  <div className="mb-3 flex shrink-0 items-center justify-between">
                    <Button
                      type="primary"
                      icon={<Plus size={14} />}
                      onClick={openCreateTemplate}
                    >
                      新建规则模板
                    </Button>
                    <div className="text-xs text-[#8a8f99]">
                      模板变更仅影响后续引用，不会修改存量质量规则。
                    </div>
                  </div>
                ) : null}

                <div className="min-h-0 flex-1 overflow-auto">
                  <Spin spinning={loading}>
                    <Table<TemplateView>
                      rowKey="id"
                      size="small"
                      bordered
                      pagination={false}
                      scroll={{ x: 1080 }}
                      className={dataQualityTableClassName()}
                      dataSource={data.records}
                      locale={{
                        emptyText: (
                          <Empty
                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                            description={
                              activeTab === 'CUSTOM'
                                ? '当前目录暂无自定义模板'
                                : '暂无系统模板'
                            }
                          />
                        ),
                      }}
                      columns={[
                        {
                          title: '模板名称 / 编码',
                          dataIndex: 'name',
                          width: 260,
                          render: (_, record) => (
                            <div className="min-w-0 py-1">
                              <button
                                type="button"
                                className={`block max-w-full truncate border-0 bg-transparent p-0 text-left font-medium ${
                                  record.builtin
                                    ? 'cursor-default text-[#172033]'
                                    : 'cursor-pointer text-[var(--yak-brand-color)]'
                                }`}
                                onClick={() =>
                                  !record.builtin
                                  && openEditTemplate(record)
                                }
                              >
                                {record.name}
                              </button>
                            </div>
                          ),
                        },
                        {
                          title: '质量维度',
                          dataIndex: 'dimension',
                          width: 110,
                          render: (value) => (
                            <Tag className="!m-0 !border-0 !bg-[#f2f4f7] !text-[#667085]">
                              {value}
                            </Tag>
                          ),
                        },
                        {
                          title: '关联范围',
                          dataIndex: 'scope',
                          width: 100,
                          render: (value) => (
                            <Tag
                              className="!m-0 !border-0"
                              style={{
                                color: BRAND_COLOR,
                                backgroundColor: BRAND_COLOR_SOFT,
                              }}
                            >
                              {value === 'TABLE' ? '表级' : '字段级'}
                            </Tag>
                          ),
                        },
                        {
                          title: '规则数',
                          dataIndex: 'ruleCount',
                          width: 90,
                          render: (value) => (
                            <span className="font-medium text-[#344054]">
                              {value}
                            </span>
                          ),
                        },
                        ...(activeTab === 'CUSTOM'
                          ? [
                              {
                                title: '所属目录',
                                dataIndex: 'folderName',
                                width: 130,
                                render: (value: string) =>
                                  value || '未分类',
                              },
                            ]
                          : []),
                        {
                          title: '模板描述',
                          dataIndex: 'description',
                          render: (value) => (
                            <div className="line-clamp-2 leading-5 text-[#667085]">
                              {value || '--'}
                            </div>
                          ),
                        },
                        ...(activeTab === 'CUSTOM'
                          ? [
                              {
                                title: '操作',
                                fixed: 'right' as const,
                                width: 150,
                                render: (
                                  _: unknown,
                                  record: TemplateView,
                                ) => (
                                  <div className="flex items-center gap-1">
                                    <Button
                                      type="link"
                                      size="small"
                                      onClick={() =>
                                        openEditTemplate(record)
                                      }
                                    >
                                      编辑
                                    </Button>
                                    <Dropdown
                                      menu={{
                                        items: [
                                          {
                                            key: 'copy',
                                            icon: <Copy size={14} />,
                                            label: '复制模板',
                                            onClick: () =>
                                              openCopy(record),
                                          },
                                          {
                                            key: 'delete',
                                            danger: true,
                                            icon: <Trash2 size={14} />,
                                            label: '删除模板',
                                            onClick: () =>
                                              removeTemplate(record),
                                          },
                                        ],
                                      }}
                                    >
                                      <Button
                                        type="text"
                                        size="small"
                                        icon={
                                          <Ellipsis size={15} />
                                        }
                                      />
                                    </Dropdown>
                                  </div>
                                ),
                              },
                            ]
                          : []),
                      ]}
                    />
                  </Spin>
                </div>
              </section>
            </div>
          </main>
        </div>
      </div>

      <CustomTemplateDrawer
        open={drawerOpen}
        mode={drawerMode}
        template={editingTemplate}
        folders={folders}
        defaultFolderId={selectedFolderId}
        submitting={submitting}
        onClose={() => setDrawerOpen(false)}
        onSubmit={saveTemplate}
      />

      <Modal
        title={
          folderDialogMode === 'create'
            ? '新建模板目录'
            : '编辑模板目录'
        }
        open={folderDialogOpen}
        confirmLoading={submitting}
        onOk={saveFolder}
        onCancel={() => setFolderDialogOpen(false)}
        destroyOnClose
      >
        <Form
          form={folderForm}
          layout="vertical"
          className="pt-3"
        >
          <Form.Item
            name="name"
            label="目录名称"
            rules={[
              {
                required: true,
                whitespace: true,
                message: '请输入目录名称',
              },
            ]}
          >
            <Input
              variant="filled"
              maxLength={100}
              placeholder="请输入目录名称"
            />
          </Form.Item>
          <Form.Item name="parentId" label="上级目录">
            <Select
              allowClear
              variant="filled"
              placeholder="根目录"
              options={flattenFolders(folders)
                .filter((folder) => folder.id !== editingFolder?.id)
                .map((folder) => ({
                  value: folder.id,
                  label: `${'　'.repeat(folder.depth)}${folder.name}`,
                }))}
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="复制自定义规则模板"
        open={Boolean(copyTemplate)}
        confirmLoading={submitting}
        onOk={saveCopy}
        onCancel={() => setCopyTemplate(undefined)}
        destroyOnClose
      >
        <Form
          form={copyForm}
          layout="vertical"
          className="pt-3"
        >
          <Form.Item
            name="name"
            label="模板名称"
            rules={[
              {
                required: true,
                whitespace: true,
                message: '请输入模板名称',
              },
            ]}
          >
            <Input variant="filled" maxLength={100} />
          </Form.Item>
          <Form.Item name="folderId" label="目标文件夹">
            <Select
              allowClear
              variant="filled"
              placeholder="未分类"
              options={flattenFolders(folders).map((folder) => ({
                value: folder.id,
                label: `${'　'.repeat(folder.depth)}${folder.name}`,
              }))}
            />
          </Form.Item>
        </Form>
      </Modal>
    </ConfigProvider>
  );
};

export default TemplateLibraryPage;

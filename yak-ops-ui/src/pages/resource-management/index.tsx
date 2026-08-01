import YakOpsEmpty from '@/components/YakOpsEmpty';
import { YAK_OPS_PERMISSIONS } from '@/constants/yakOpsPermissions';
import usePermissionAccess from '@/hooks/usePermissionAccess';
import { API_SUCCESS_CODE } from '@/services/http/response';
import { BRAND_COLOR, BRAND_THEME } from '@/styles/brand';
import {
  Breadcrumb,
  Button,
  ConfigProvider,
  Dropdown,
  Empty,
  Input,
  message,
  Modal,
  Space,
  Spin,
  Table,
  Tag,
  Tooltip,
  Tree,
  type MenuProps,
  type TableColumnsType,
} from 'antd';
import dayjs from 'dayjs';
import {
  Cloud,
  Database,
  Download,
  File,
  FileCode2,
  FilePlus2,
  Files,
  Folder,
  FolderPlus,
  FolderTree,
  HardDrive,
  MoreHorizontal,
  MoveRight,
  Pencil,
  RefreshCw,
  Search,
  Trash2,
  Upload,
} from 'lucide-react';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import CreateDirectoryModal from './components/CreateDirectoryModal';
import CreateTextResourceModal from './components/CreateTextResourceModal';
import MoveResourceModal from './components/MoveResourceModal';
import ResourceDetailDrawer from './components/ResourceDetailDrawer';
import ResourceMetadataModal from './components/ResourceMetadataModal';
import './index.less';
import {
  createDirectory,
  createTextResource,
  deleteResource,
  downloadResource,
  fetchResourceList,
  fetchResourceTree,
  fetchStoragePlugins,
  moveResource,
  replaceResourceFile,
  updateResource,
  uploadResource,
} from './service';
import type {
  DirectoryFormValues,
  MoveResourceFormValues,
  ResourceId,
  ResourceItem,
  ResourceMetadataFormValues,
  ResourceStoragePlugin,
  TextResourceFormValues,
} from './types';
import {
  buildDirectoryTree,
  findResource,
  formatFileSize,
  getResourceBreadcrumbs,
  getResourceSummary,
  isDirectory,
  resourceKey,
  ROOT_RESOURCE_ID,
} from './utils';

const { confirm } = Modal;

const ResourceManagementPage = () => {
  const { can } = usePermissionAccess();
  const canCreate = can(YAK_OPS_PERMISSIONS.resource.create);
  const canUpdate = can(YAK_OPS_PERMISSIONS.resource.update);
  const canDelete = can(YAK_OPS_PERMISSIONS.resource.delete);
  const canDownload = can(YAK_OPS_PERMISSIONS.resource.download);

  const uploadInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const replacingResourceRef = useRef<ResourceItem>();
  const listRequestSeqRef = useRef(0);

  const [treeLoading, setTreeLoading] = useState(false);
  const [listLoading, setListLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [resourceTree, setResourceTree] = useState<ResourceItem[]>([]);
  const [resourceList, setResourceList] = useState<ResourceItem[]>([]);
  const [storagePlugins, setStoragePlugins] = useState<
    ResourceStoragePlugin[]
  >([]);
  const [selectedDirectoryId, setSelectedDirectoryId] =
    useState<ResourceId>(ROOT_RESOURCE_ID);
  const [keyword, setKeyword] = useState('');
  const [debouncedKeyword, setDebouncedKeyword] = useState('');
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [directoryModalOpen, setDirectoryModalOpen] = useState(false);
  const [textModalOpen, setTextModalOpen] = useState(false);
  const [metadataResource, setMetadataResource] = useState<ResourceItem>();
  const [movingResource, setMovingResource] = useState<ResourceItem>();
  const [detailResource, setDetailResource] = useState<ResourceItem>();

  const loadTree = useCallback(async () => {
    try {
      setTreeLoading(true);
      const response = await fetchResourceTree();
      if (response.code !== API_SUCCESS_CODE) return;
      setResourceTree(response.data || []);
    } finally {
      setTreeLoading(false);
    }
  }, []);

  const loadPlugins = useCallback(async () => {
    const response = await fetchStoragePlugins();
    if (response.code !== API_SUCCESS_CODE) return;
    setStoragePlugins(response.data || []);
  }, []);

  const loadList = useCallback(async () => {
    const requestSeq = listRequestSeqRef.current + 1;
    listRequestSeqRef.current = requestSeq;
    try {
      setListLoading(true);
      const response = await fetchResourceList(
        selectedDirectoryId,
        debouncedKeyword || undefined,
      );
      if (
        requestSeq !== listRequestSeqRef.current ||
        response.code !== API_SUCCESS_CODE
      ) {
        return;
      }
      setResourceList(response.data || []);
    } finally {
      if (requestSeq === listRequestSeqRef.current) setListLoading(false);
    }
  }, [debouncedKeyword, selectedDirectoryId]);

  useEffect(() => {
    const timer = window.setTimeout(
      () => setDebouncedKeyword(keyword.trim()),
      keyword.trim() ? 250 : 0,
    );
    return () => window.clearTimeout(timer);
  }, [keyword]);

  useEffect(() => {
    void loadPlugins();
  }, [loadPlugins]);

  useEffect(() => {
    void loadTree();
  }, [loadTree, refreshVersion]);

  useEffect(() => {
    void loadList();
  }, [loadList, refreshVersion]);

  const refresh = useCallback(() => {
    setRefreshVersion((value) => value + 1);
  }, []);

  const selectedDirectory = useMemo(
    () => findResource(resourceTree, selectedDirectoryId),
    [resourceTree, selectedDirectoryId],
  );
  const selectedDirectoryName = selectedDirectory?.name || '全部资源';
  const breadcrumbs = useMemo(
    () => getResourceBreadcrumbs(resourceTree, selectedDirectoryId),
    [resourceTree, selectedDirectoryId],
  );
  const summary = useMemo(
    () => getResourceSummary(resourceTree),
    [resourceTree],
  );
  const directoryTree = useMemo(
    () => buildDirectoryTree(resourceTree),
    [resourceTree],
  );
  const moveDirectoryTree = useMemo(
    () => buildDirectoryTree(resourceTree, { movingResource }),
    [movingResource, resourceTree],
  );

  const navigateToDirectory = (id: ResourceId) => {
    setSelectedDirectoryId(id);
    setKeyword('');
  };

  const openResource = (resource: ResourceItem) => {
    if (isDirectory(resource)) {
      navigateToDirectory(resource.id);
      return;
    }
    setDetailResource(resource);
  };

  const handleCreateDirectory = async (values: DirectoryFormValues) => {
    try {
      setSaving(true);
      const response = await createDirectory({
        parentId: selectedDirectoryId,
        ...values,
      });
      if (response.code !== API_SUCCESS_CODE) return;
      message.success(response.message || '文件夹创建成功');
      setDirectoryModalOpen(false);
      refresh();
    } finally {
      setSaving(false);
    }
  };

  const handleCreateTextResource = async (
    values: TextResourceFormValues,
  ) => {
    try {
      setSaving(true);
      const response = await createTextResource({
        parentId: selectedDirectoryId,
        ...values,
      });
      if (response.code !== API_SUCCESS_CODE) return;
      message.success(response.message || '文件创建成功');
      setTextModalOpen(false);
      refresh();
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateMetadata = async (
    values: ResourceMetadataFormValues,
  ) => {
    if (!metadataResource) return;
    try {
      setSaving(true);
      const response = await updateResource(metadataResource.id, values);
      if (response.code !== API_SUCCESS_CODE) return;
      message.success(response.message || '资源信息已更新');
      setMetadataResource(undefined);
      if (detailResource?.id === metadataResource.id) {
        setDetailResource(response.data);
      }
      refresh();
    } finally {
      setSaving(false);
    }
  };

  const handleMoveResource = async (values: MoveResourceFormValues) => {
    if (!movingResource) return;
    try {
      setSaving(true);
      const response = await moveResource(movingResource.id, values);
      if (response.code !== API_SUCCESS_CODE) return;
      message.success(response.message || '资源移动成功');
      setMovingResource(undefined);
      if (detailResource?.id === movingResource.id) {
        setDetailResource(response.data);
      }
      refresh();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (resource: ResourceItem) => {
    if (!canDelete) return;
    confirm({
      title: `确认删除${isDirectory(resource) ? '文件夹' : '文件'}吗？`,
      centered: true,
      content: isDirectory(resource)
        ? `文件夹“${resource.name}”及其全部子资源都会被递归删除，删除后无法恢复。`
        : `文件“${resource.name}”删除后无法恢复。`,
      okText: '删除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      async onOk() {
        const response = await deleteResource(resource.id);
        if (response.code !== API_SUCCESS_CODE) return;
        message.success(response.message || '删除成功');
        if (detailResource?.id === resource.id) setDetailResource(undefined);
        refresh();
      },
    });
  };

  const handleDownload = async (resource: ResourceItem) => {
    try {
      await downloadResource(resource.id, resource.name);
      message.success('下载任务已开始');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '下载失败');
    }
  };

  const handleUpload = async (file?: File) => {
    if (!file) return;
    try {
      setUploading(true);
      const response = await uploadResource(selectedDirectoryId, file);
      if (response.code !== API_SUCCESS_CODE) return;
      message.success(response.message || '文件上传成功');
      refresh();
    } finally {
      setUploading(false);
      if (uploadInputRef.current) uploadInputRef.current.value = '';
    }
  };

  const requestReplaceFile = (resource: ResourceItem) => {
    replacingResourceRef.current = resource;
    replaceInputRef.current?.click();
  };

  const handleReplaceFile = async (file?: File) => {
    const resource = replacingResourceRef.current;
    if (!resource || !file) return;
    try {
      setUploading(true);
      const response = await replaceResourceFile(resource.id, file);
      if (response.code !== API_SUCCESS_CODE) return;
      message.success(response.message || '文件替换成功');
      if (detailResource?.id === resource.id) setDetailResource(response.data);
      refresh();
    } finally {
      setUploading(false);
      replacingResourceRef.current = undefined;
      if (replaceInputRef.current) replaceInputRef.current.value = '';
    }
  };

  const getActionItems = (resource: ResourceItem): MenuProps['items'] =>
    [
      {
        key: 'open',
        icon: isDirectory(resource) ? <Folder size={15} /> : <FileCode2 size={15} />,
        label: isDirectory(resource) ? '打开文件夹' : '查看详情',
      },
      !isDirectory(resource) && canDownload
        ? {
            key: 'download',
            icon: <Download size={15} />,
            label: '下载文件',
          }
        : null,
      canUpdate
        ? {
            key: 'edit',
            icon: <Pencil size={15} />,
            label: '编辑信息',
          }
        : null,
      canUpdate && !isDirectory(resource)
        ? {
            key: 'replace',
            icon: <Upload size={15} />,
            label: '替换文件',
          }
        : null,
      canUpdate
        ? {
            key: 'move',
            icon: <MoveRight size={15} />,
            label: '移动到',
          }
        : null,
      canDelete ? { type: 'divider' as const } : null,
      canDelete
        ? {
            key: 'delete',
            danger: true,
            icon: <Trash2 size={15} />,
            label: '删除',
          }
        : null,
    ].filter(Boolean) as MenuProps['items'];

  const handleAction = (resource: ResourceItem, key: string) => {
    switch (key) {
      case 'open':
        openResource(resource);
        break;
      case 'download':
        void handleDownload(resource);
        break;
      case 'edit':
        setMetadataResource(resource);
        break;
      case 'replace':
        requestReplaceFile(resource);
        break;
      case 'move':
        setMovingResource(resource);
        break;
      case 'delete':
        handleDelete(resource);
        break;
      default:
        break;
    }
  };

  const columns: TableColumnsType<ResourceItem> = [
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      width: 320,
      render: (_, resource) => (
        <button
          type="button"
          className="resource-name-cell"
          onClick={() => openResource(resource)}
        >
          <span
            className={[
              'resource-name-cell__icon',
              isDirectory(resource) ? 'is-directory' : 'is-file',
            ].join(' ')}
          >
            {isDirectory(resource) ? <Folder size={19} /> : <File size={19} />}
          </span>
          <span className="resource-name-cell__text">
            <strong title={resource.name}>{resource.name}</strong>
            <small title={resource.description || resource.fullPath}>
              {resource.description || resource.fullPath}
            </small>
          </span>
        </button>
      ),
    },
    {
      title: '类型',
      dataIndex: 'nodeType',
      key: 'nodeType',
      width: 110,
      render: (_, resource) =>
        isDirectory(resource) ? (
          <Tag bordered={false}>文件夹</Tag>
        ) : (
          <Tag bordered={false}>{resource.suffix?.toUpperCase() || 'FILE'}</Tag>
        ),
    },
    {
      title: '大小',
      dataIndex: 'fileSize',
      key: 'fileSize',
      width: 120,
      render: (_, resource) =>
        isDirectory(resource) ? '-' : formatFileSize(resource.fileSize),
    },
    {
      title: '存储',
      dataIndex: 'storageType',
      key: 'storageType',
      width: 120,
      render: (value) => (
        <span className="resource-storage-cell">
          <Cloud size={14} />
          {String(value || '-')}
        </span>
      ),
    },
    {
      title: '版本',
      dataIndex: 'version',
      key: 'version',
      width: 90,
      render: (value, resource) => (isDirectory(resource) ? '-' : `v${value || 1}`),
    },
    {
      title: '更新时间',
      dataIndex: 'updateTime',
      key: 'updateTime',
      width: 180,
      render: (value) =>
        value ? dayjs(String(value)).format('YYYY-MM-DD HH:mm:ss') : '-',
    },
    {
      title: '',
      key: 'actions',
      fixed: 'right',
      width: 60,
      align: 'center',
      render: (_, resource) => (
        <Dropdown
          trigger={['click']}
          menu={{
            items: getActionItems(resource),
            onClick: ({ key, domEvent }) => {
              domEvent.stopPropagation();
              handleAction(resource, key);
            },
          }}
        >
          <Button
            type="text"
            size="small"
            aria-label={`操作 ${resource.name}`}
            icon={<MoreHorizontal size={17} />}
            onClick={(event) => event.stopPropagation()}
          />
        </Dropdown>
      ),
    },
  ];

  const breadcrumbItems = [
    {
      title: (
        <button
          type="button"
          className="resource-breadcrumb-button"
          onClick={() => navigateToDirectory(ROOT_RESOURCE_ID)}
        >
          全部资源
        </button>
      ),
    },
    ...breadcrumbs.map((resource) => ({
      title: (
        <button
          type="button"
          className="resource-breadcrumb-button"
          onClick={() => navigateToDirectory(resource.id)}
        >
          {resource.name}
        </button>
      ),
    })),
  ];

  return (
    <ConfigProvider theme={BRAND_THEME}>
      <div className="resource-page">
        <header className="resource-header">
          <div>
            <h1>资源管理</h1>
            <p>统一管理任务脚本、配置文件与运行资源，底层支持 MinIO 和 HDFS。</p>
          </div>
          <Space size={10} wrap>
            {canCreate && (
              <Button
                icon={<FolderPlus size={16} />}
                onClick={() => setDirectoryModalOpen(true)}
              >
                新建文件夹
              </Button>
            )}
            {canCreate && (
              <Button
                icon={<FilePlus2 size={16} />}
                onClick={() => setTextModalOpen(true)}
              >
                在线创建
              </Button>
            )}
            {canCreate && (
              <Button
                type="primary"
                loading={uploading}
                icon={<Upload size={16} />}
                onClick={() => uploadInputRef.current?.click()}
              >
                上传文件
              </Button>
            )}
          </Space>
        </header>

        <section className="resource-overview">
          <div className="resource-overview-card">
            <span><Files size={20} /></span>
            <div><small>文件数量</small><strong>{summary.files}</strong></div>
          </div>
          <div className="resource-overview-card">
            <span><FolderTree size={20} /></span>
            <div><small>文件夹</small><strong>{summary.directories}</strong></div>
          </div>
          <div className="resource-overview-card">
            <span><HardDrive size={20} /></span>
            <div><small>资源容量</small><strong>{formatFileSize(summary.totalBytes)}</strong></div>
          </div>
          <div className="resource-overview-card resource-overview-card--plugins">
            <span><Database size={20} /></span>
            <div>
              <small>存储插件</small>
              <div className="resource-plugin-list">
                {storagePlugins.length ? (
                  storagePlugins.map((plugin) => (
                    <Tag
                      key={plugin.type}
                      bordered={false}
                      className={plugin.active ? 'is-active' : ''}
                    >
                      {plugin.name || plugin.type}
                      {plugin.active ? ' · 当前' : ''}
                    </Tag>
                  ))
                ) : (
                  <strong>-</strong>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="resource-workbench">
          <aside className="resource-tree-panel">
            <div className="resource-tree-panel__header">
              <div>
                <FolderTree size={17} />
                <strong>目录</strong>
              </div>
              <Tooltip title="刷新目录">
                <Button
                  type="text"
                  size="small"
                  disabled={treeLoading}
                  icon={
                    <RefreshCw
                      size={15}
                      className={treeLoading ? 'is-spinning' : ''}
                    />
                  }
                  onClick={refresh}
                />
              </Tooltip>
            </div>
            <Spin spinning={treeLoading}>
              <Tree
                className="resource-directory-tree"
                treeData={directoryTree}
                selectedKeys={[resourceKey(selectedDirectoryId)]}
                defaultExpandAll
                blockNode
                showLine={{ showLeafIcon: false }}
                onSelect={(keys) => {
                  const selectedKey = keys[0];
                  if (selectedKey === undefined) return;
                  const resource = findResource(resourceTree, String(selectedKey));
                  navigateToDirectory(resource?.id ?? ROOT_RESOURCE_ID);
                }}
              />
            </Spin>
          </aside>

          <main className="resource-list-panel">
            <div className="resource-list-toolbar">
              <div>
                <Breadcrumb items={breadcrumbItems} />
                <span className="resource-list-toolbar__count">
                  {resourceList.length} 项
                </span>
              </div>
              <Space size={8}>
                <Input
                  className="resource-search"
                  allowClear
                  prefix={<Search size={15} />}
                  value={keyword}
                  placeholder="搜索当前目录"
                  onChange={(event) => setKeyword(event.target.value)}
                />
                <Tooltip title="刷新列表">
                  <Button
                    icon={
                      <RefreshCw
                        size={15}
                        className={listLoading ? 'is-spinning' : ''}
                      />
                    }
                    disabled={listLoading}
                    onClick={refresh}
                  />
                </Tooltip>
              </Space>
            </div>

            <Spin spinning={listLoading}>
              <Table<ResourceItem>
                className="resource-table"
                rowKey={(record) => resourceKey(record.id)}
                columns={columns}
                dataSource={resourceList}
                pagination={false}
                scroll={{ x: 1080 }}
                locale={{
                  emptyText: (
                    <Empty
                      image={<YakOpsEmpty primaryColor={BRAND_COLOR} />}
                      description={
                        debouncedKeyword
                          ? '当前目录没有匹配的资源'
                          : '当前文件夹为空'
                      }
                    >
                      {canCreate && !debouncedKeyword && (
                        <Button
                          type="primary"
                          icon={<Upload size={15} />}
                          onClick={() => uploadInputRef.current?.click()}
                        >
                          上传第一个文件
                        </Button>
                      )}
                    </Empty>
                  ),
                }}
                onRow={(resource) => ({
                  onDoubleClick: () => openResource(resource),
                })}
              />
            </Spin>
          </main>
        </section>

        <input
          ref={uploadInputRef}
          hidden
          type="file"
          onChange={(event) => void handleUpload(event.target.files?.[0])}
        />
        <input
          ref={replaceInputRef}
          hidden
          type="file"
          onChange={(event) => void handleReplaceFile(event.target.files?.[0])}
        />

        <CreateDirectoryModal
          open={directoryModalOpen}
          parentName={selectedDirectoryName}
          saving={saving}
          onCancel={() => setDirectoryModalOpen(false)}
          onSubmit={handleCreateDirectory}
        />
        <CreateTextResourceModal
          open={textModalOpen}
          parentName={selectedDirectoryName}
          saving={saving}
          onCancel={() => setTextModalOpen(false)}
          onSubmit={handleCreateTextResource}
        />
        <ResourceMetadataModal
          open={Boolean(metadataResource)}
          resource={metadataResource}
          saving={saving}
          onCancel={() => setMetadataResource(undefined)}
          onSubmit={handleUpdateMetadata}
        />
        <MoveResourceModal
          open={Boolean(movingResource)}
          resource={movingResource}
          directories={moveDirectoryTree}
          saving={saving}
          onCancel={() => setMovingResource(undefined)}
          onSubmit={handleMoveResource}
        />
        <ResourceDetailDrawer
          open={Boolean(detailResource)}
          resource={detailResource}
          canUpdate={canUpdate}
          canDownload={canDownload}
          onClose={() => setDetailResource(undefined)}
          onDownload={handleDownload}
          onReplace={requestReplaceFile}
          onSaved={refresh}
        />
      </div>
    </ConfigProvider>
  );
};

export default ResourceManagementPage;

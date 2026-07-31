import {
  Alert,
  Button,
  Descriptions,
  Drawer,
  Empty,
  Input,
  message,
  Space,
  Spin,
  Tag,
} from 'antd';
import dayjs from 'dayjs';
import {
  Download,
  FileCode2,
  Folder,
  RefreshCw,
  Save,
  Upload,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { API_SUCCESS_CODE } from '@/services/http/response';

import {
  fetchResourceContent,
  updateResourceContent,
} from '../service';
import type { ResourceContent, ResourceItem } from '../types';
import { formatFileSize, isDirectory, isEditableResource } from '../utils';

interface ResourceDetailDrawerProps {
  open: boolean;
  resource?: ResourceItem;
  canUpdate: boolean;
  canDownload: boolean;
  onClose: () => void;
  onDownload: (resource: ResourceItem) => Promise<void>;
  onReplace: (resource: ResourceItem) => void;
  onSaved: () => void;
}

const EMPTY_CONTENT: ResourceContent = {
  resourceId: 0,
  fullPath: '',
  content: '',
  skipLineNum: 0,
  lineCount: 0,
  hasMore: false,
};

const ResourceDetailDrawer = ({
  open,
  resource,
  canUpdate,
  canDownload,
  onClose,
  onDownload,
  onReplace,
  onSaved,
}: ResourceDetailDrawerProps) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [contentResult, setContentResult] =
    useState<ResourceContent>(EMPTY_CONTENT);
  const [content, setContent] = useState('');
  const [initialContent, setInitialContent] = useState('');

  const editable = isEditableResource(resource);
  const dirty = content !== initialContent;

  const loadContent = async () => {
    if (!resource || !editable) return;
    try {
      setLoading(true);
      const response = await fetchResourceContent(resource.id);
      if (response.code !== API_SUCCESS_CODE || !response.data) return;
      setContentResult(response.data);
      setContent(response.data.content || '');
      setInitialContent(response.data.content || '');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open || !resource) return;
    setContentResult(EMPTY_CONTENT);
    setContent('');
    setInitialContent('');
    void loadContent();
  }, [open, resource?.id]);

  const descriptionItems = useMemo(
    () => [
      {
        key: 'path',
        label: '完整路径',
        children: resource?.fullPath || '-',
        span: 2,
      },
      {
        key: 'type',
        label: '资源类型',
        children: isDirectory(resource) ? '文件夹' : '文件',
      },
      {
        key: 'storage',
        label: '存储类型',
        children: resource?.storageType || '-',
      },
      {
        key: 'size',
        label: '文件大小',
        children: isDirectory(resource)
          ? '-'
          : formatFileSize(resource?.fileSize),
      },
      {
        key: 'version',
        label: '版本',
        children: resource?.version ? `v${resource.version}` : '-',
      },
      {
        key: 'updated',
        label: '更新时间',
        children: resource?.updateTime
          ? dayjs(resource.updateTime).format('YYYY-MM-DD HH:mm:ss')
          : '-',
      },
      {
        key: 'checksum',
        label: '校验值',
        children: resource?.checksum || '-',
        span: 2,
      },
      {
        key: 'description',
        label: '描述',
        children: resource?.description || '暂无描述',
        span: 2,
      },
    ],
    [resource],
  );

  const handleSave = async () => {
    if (!resource || !dirty || !canUpdate) return;
    try {
      setSaving(true);
      const response = await updateResourceContent(resource.id, content);
      if (response.code !== API_SUCCESS_CODE) return;
      setInitialContent(content);
      message.success(response.message || '文件内容已保存');
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  const handleDownload = async () => {
    if (!resource || !canDownload) return;
    try {
      setDownloading(true);
      await onDownload(resource);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Drawer
      title={
        <div className="resource-drawer-title">
          <span className="resource-drawer-title__icon">
            {isDirectory(resource) ? <Folder size={18} /> : <FileCode2 size={18} />}
          </span>
          <div>
            <strong>{resource?.name || '资源详情'}</strong>
            <span>{resource?.fullPath || '/'}</span>
          </div>
        </div>
      }
      open={open}
      width={760}
      destroyOnClose
      onClose={onClose}
      extra={
        resource?.nodeType === 'FILE' ? (
          <Space size={8}>
            {canUpdate && (
              <Button
                size="small"
                icon={<Upload size={14} />}
                onClick={() => onReplace(resource)}
              >
                替换文件
              </Button>
            )}
            {canDownload && (
              <Button
                size="small"
                loading={downloading}
                icon={<Download size={14} />}
                onClick={() => void handleDownload()}
              >
                下载
              </Button>
            )}
          </Space>
        ) : null
      }
    >
      <section className="resource-detail-section">
        <div className="resource-detail-section__heading">
          <h3>资源信息</h3>
          <Tag bordered={false}>{resource?.storageType || 'UNKNOWN'}</Tag>
        </div>
        <Descriptions
          size="small"
          bordered
          column={2}
          items={descriptionItems}
        />
      </section>

      {!isDirectory(resource) && (
        <section className="resource-detail-section resource-detail-section--content">
          <div className="resource-detail-section__heading">
            <div>
              <h3>文件内容</h3>
              <p>
                {editable
                  ? `支持在线预览与编辑 .${resource?.suffix || 'txt'} 文件`
                  : '当前文件类型不支持在线预览'}
              </p>
            </div>
            {editable && (
              <Space size={8}>
                <Button
                  size="small"
                  icon={<RefreshCw size={14} />}
                  disabled={loading || saving}
                  onClick={() => void loadContent()}
                >
                  重新加载
                </Button>
                {canUpdate && (
                  <Button
                    type="primary"
                    size="small"
                    icon={<Save size={14} />}
                    disabled={!dirty}
                    loading={saving}
                    onClick={() => void handleSave()}
                  >
                    保存内容
                  </Button>
                )}
              </Space>
            )}
          </div>

          {editable ? (
            <Spin spinning={loading}>
              {contentResult.hasMore && (
                <Alert
                  className="resource-content-alert"
                  type="warning"
                  showIcon
                  message="文件内容超过 2000 行，当前仅展示前 2000 行；保存会覆盖整个文件，请谨慎修改。"
                />
              )}
              <Input.TextArea
                className="resource-content-editor"
                value={content}
                readOnly={!canUpdate}
                spellCheck={false}
                onChange={(event) => setContent(event.target.value)}
              />
              <div className="resource-content-footer">
                <span>{contentResult.lineCount || content.split('\n').length} 行</span>
                <span>{new Blob([content]).size} 字节</span>
              </div>
            </Spin>
          ) : (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="可下载文件后在本地查看"
            />
          )}
        </section>
      )}
    </Drawer>
  );
};

export default ResourceDetailDrawer;

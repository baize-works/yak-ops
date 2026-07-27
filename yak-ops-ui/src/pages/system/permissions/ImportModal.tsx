import {
  FileTextOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import {
  Alert,
  Button,
  Input,
  Modal,
  Space,
  Tag,
  Typography,
  Upload,
  message,
} from 'antd';
import { useMemo, useState } from 'react';

import {
  type PermissionImportItem,
  importPermissions,
} from '@/services/security/permissions';

interface PermissionImportModalProps {
  open: boolean;
  onClose: () => void;
  onImported: () => void;
}

const EXAMPLE_JSON = JSON.stringify(
  [
    {
      permissionCode: 'security:example:read',
      permissionName: '示例模块查看',
      description: '查看示例模块',
      childPermissionDTOList: [
        {
          permissionCode: 'security:example:create',
          permissionName: '示例模块新增',
          description: '新增示例数据',
        },
      ],
    },
  ],
  null,
  2,
);

const isRecord = (
  value: unknown,
): value is Record<string, unknown> =>
  typeof value === 'object' &&
  value !== null &&
  !Array.isArray(value);

const cleanRequiredText = (
  value: unknown,
  label: string,
  path: string,
): string => {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text) {
    throw new Error(`${path} 缺少${label}`);
  }
  return text;
};

const parseImportNode = (
  value: unknown,
  path: string,
  permissionCodes: Set<string>,
): PermissionImportItem => {
  if (!isRecord(value)) {
    throw new Error(`${path} 必须是 JSON 对象`);
  }

  const permissionCode = cleanRequiredText(
    value.permissionCode,
    '权限编码 permissionCode',
    path,
  );
  const permissionName = cleanRequiredText(
    value.permissionName,
    '权限名称 permissionName',
    path,
  );

  if (permissionCodes.has(permissionCode)) {
    throw new Error(`权限编码重复：${permissionCode}`);
  }
  permissionCodes.add(permissionCode);

  if (
    value.description !== undefined &&
    typeof value.description !== 'string'
  ) {
    throw new Error(`${path}.description 必须是字符串`);
  }

  const childValue = value.childPermissionDTOList;
  if (childValue !== undefined && !Array.isArray(childValue)) {
    throw new Error(
      `${path}.childPermissionDTOList 必须是数组`,
    );
  }

  const children = (childValue ?? []).map((child, index) =>
    parseImportNode(
      child,
      `${path}.childPermissionDTOList[${index}]`,
      permissionCodes,
    ),
  );

  return {
    permissionCode,
    permissionName,
    ...(typeof value.description === 'string' &&
    value.description.trim()
      ? { description: value.description.trim() }
      : {}),
    ...(children.length > 0
      ? { childPermissionDTOList: children }
      : {}),
  };
};

const parseImportJson = (
  source: string,
): PermissionImportItem[] => {
  let value: unknown;

  try {
    value = JSON.parse(source);
  } catch {
    throw new Error('JSON 格式不正确，请检查逗号、引号和括号');
  }

  if (!Array.isArray(value) || value.length === 0) {
    throw new Error('顶层必须是非空 JSON 数组');
  }

  const permissionCodes = new Set<string>();
  return value.map((node, index) =>
    parseImportNode(node, `[${index}]`, permissionCodes),
  );
};

const countImportNodes = (
  nodes: PermissionImportItem[],
): number =>
  nodes.reduce(
    (total, node) =>
      total +
      1 +
      countImportNodes(node.childPermissionDTOList ?? []),
    0,
  );

const errorText = (error: unknown, fallback: string): string =>
  error instanceof Error && error.message
    ? error.message
    : fallback;

export default function ImportModal({
  open,
  onClose,
  onImported,
}: PermissionImportModalProps) {
  const [source, setSource] = useState('');
  const [saving, setSaving] = useState(false);

  const preview = useMemo(() => {
    if (!source.trim()) {
      return {
        data: undefined,
        count: 0,
        error: undefined,
      };
    }

    try {
      const data = parseImportJson(source);
      return {
        data,
        count: countImportNodes(data),
        error: undefined,
      };
    } catch (error) {
      return {
        data: undefined,
        count: 0,
        error: errorText(error, '权限 JSON 校验失败'),
      };
    }
  }, [source]);

  const close = () => {
    if (!saving) onClose();
  };

  const submit = async () => {
    if (!preview.data || saving) return;

    setSaving(true);
    try {
      await importPermissions(preview.data);
      message.success(`权限导入成功，共 ${preview.count} 个节点`);
      onClose();
      onImported();
    } catch (error) {
      message.error(errorText(error, '权限导入失败'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      title="导入权限树"
      width={760}
      maskClosable={false}
      keyboard={!saving}
      closable={!saving}
      onCancel={close}
      afterClose={() => setSource('')}
      footer={
        <Space>
          <Button disabled={saving} onClick={close}>
            取消
          </Button>
          <Button
            type="primary"
            loading={saving}
            disabled={!preview.data}
            onClick={() => void submit()}
          >
            确认导入
          </Button>
        </Space>
      }
    >
      <Alert
        showIcon
        type="info"
        className="mb-4"
        message="后端接收 JSON 权限树"
        description="请选择 JSON 文件或直接粘贴内容。权限编码在本次导入中必须唯一；数据库中已存在的编码或其他约束冲突会由后端返回错误。"
      />

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <Space wrap>
          <Upload
            accept=".json,application/json"
            maxCount={1}
            showUploadList={false}
            beforeUpload={(file) => {
              void file
                .text()
                .then(setSource)
                .catch(() => message.error('JSON 文件读取失败'));
              return false;
            }}
          >
            <Button icon={<UploadOutlined />}>
              选择 JSON 文件
            </Button>
          </Upload>

          <Button
            type="link"
            icon={<FileTextOutlined />}
            onClick={() => setSource(EXAMPLE_JSON)}
          >
            填充示例
          </Button>
        </Space>

        {preview.data && (
          <Tag color="success">已识别 {preview.count} 个权限节点</Tag>
        )}
      </div>

      <Input.TextArea
        value={source}
        placeholder={EXAMPLE_JSON}
        autoSize={{ minRows: 14, maxRows: 22 }}
        className="font-mono text-xs"
        status={preview.error ? 'error' : undefined}
        disabled={saving}
        onChange={(event) => setSource(event.target.value)}
      />

      <div className="mt-2 min-h-6">
        {preview.error ? (
          <Typography.Text type="danger">
            {preview.error}
          </Typography.Text>
        ) : (
          <Typography.Text type="secondary" className="text-xs">
            字段：permissionCode、permissionName、description、childPermissionDTOList。
          </Typography.Text>
        )}
      </div>
    </Modal>
  );
}

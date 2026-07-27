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
  type DepartmentImportItem,
  importDepartments,
} from '@/services/security/departments';

interface DepartmentImportModalProps {
  open: boolean;
  onClose: () => void;
  onImported: () => void;
}

const EXAMPLE_JSON = JSON.stringify(
  [
    {
      deptName: '技术中心',
      description: '负责产品研发和技术平台建设',
      childDeptDTOList: [
        {
          deptName: '前端研发部',
          description: '负责 Web 与移动端研发',
        },
        {
          deptName: '后端研发部',
          description: '负责服务端与基础架构研发',
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

const parseDepartmentNode = (
  value: unknown,
  path: string,
): DepartmentImportItem => {
  if (!isRecord(value)) {
    throw new Error(`${path} 必须是 JSON 对象`);
  }

  const deptName =
    typeof value.deptName === 'string'
      ? value.deptName.trim()
      : '';

  if (!deptName) {
    throw new Error(`${path} 缺少部门名称 deptName`);
  }

  if (
    value.description !== undefined &&
    typeof value.description !== 'string'
  ) {
    throw new Error(`${path}.description 必须是字符串`);
  }

  const childValue = value.childDeptDTOList;
  if (childValue !== undefined && !Array.isArray(childValue)) {
    throw new Error(`${path}.childDeptDTOList 必须是数组`);
  }

  const children = (childValue ?? []).map((child, index) =>
    parseDepartmentNode(
      child,
      `${path}.childDeptDTOList[${index}]`,
    ),
  );

  return {
    deptName,
    ...(typeof value.description === 'string' &&
    value.description.trim()
      ? { description: value.description.trim() }
      : {}),
    ...(children.length > 0
      ? { childDeptDTOList: children }
      : {}),
  };
};

const parseImportJson = (
  source: string,
): DepartmentImportItem[] => {
  let value: unknown;

  try {
    value = JSON.parse(source);
  } catch {
    throw new Error('JSON 格式不正确，请检查逗号、引号和括号');
  }

  if (!Array.isArray(value) || value.length === 0) {
    throw new Error('顶层必须是非空 JSON 数组');
  }

  return value.map((node, index) =>
    parseDepartmentNode(node, `[${index}]`),
  );
};

const countNodes = (
  nodes: DepartmentImportItem[],
): number =>
  nodes.reduce(
    (total, node) =>
      total +
      1 +
      countNodes(node.childDeptDTOList ?? []),
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
}: DepartmentImportModalProps) {
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
        count: countNodes(data),
        error: undefined,
      };
    } catch (error) {
      return {
        data: undefined,
        count: 0,
        error: errorText(error, '部门 JSON 校验失败'),
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
      await importDepartments(preview.data);
      message.success(`部门导入成功，共 ${preview.count} 个节点`);
      onClose();
      onImported();
    } catch (error) {
      message.error(errorText(error, '部门导入失败'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      title="导入部门树"
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
        message="后端接收 JSON 部门树"
        description="请选择 JSON 文件或直接粘贴内容。系统会按层级生成部门 ID 和父子关系；数据库约束冲突会由后端返回错误。"
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
          <Tag color="success">
            已识别 {preview.count} 个部门节点
          </Tag>
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
            字段：deptName、description、childDeptDTOList。
          </Typography.Text>
        )}
      </div>
    </Modal>
  );
}

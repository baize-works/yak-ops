import { InboxOutlined } from '@ant-design/icons';
import type { UploadFile } from 'antd';
import { Alert, Button, Modal, message, Table, Upload } from 'antd';
import { useState } from 'react';
import { type ImportReport, importPermissions } from '@/services/security/permissions';

export default function ImportModal({
  open,
  onClose,
  onImported,
}: {
  open: boolean;
  onClose: () => void;
  onImported: () => void;
}) {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<ImportReport>();
  const submit = async () => {
    const file = files[0]?.originFileObj;
    if (!file) return;
    setLoading(true);
    try {
      const next = await importPermissions(file);
      setReport(next);
      message.success(`导入完成：成功 ${next.successCount}，失败 ${next.failureCount}`);
      onImported();
    } finally {
      setLoading(false);
    }
  };
  return (
    <Modal
      title="导入权限"
      open={open}
      onCancel={onClose}
      footer={[
        <Button key="cancel" onClick={onClose}>
          关闭
        </Button>,
        <Button key="submit" type="primary" loading={loading} disabled={!files.length} onClick={submit}>
          开始导入
        </Button>,
      ]}
    >
      <Alert
        className="mb-4"
        type="warning"
        showIcon
        message="导入语义由服务端决定"
        description="提交前请确认模板、覆盖/合并规则及重复编码处理方式。"
      />
      <Upload.Dragger
        maxCount={1}
        fileList={files}
        beforeUpload={() => false}
        onChange={({ fileList }) => {
          setFiles(fileList.slice(-1));
          setReport(undefined);
        }}
      >
        <p className="ant-upload-drag-icon">
          <InboxOutlined />
        </p>
        <p>点击或拖拽文件到此处</p>
      </Upload.Dragger>
      {report && (
        <Table
          className="mt-4"
          size="small"
          pagination={false}
          rowKey={(_, index) => String(index)}
          dataSource={report.failures ?? []}
          locale={{ emptyText: `成功 ${report.successCount} 条，无失败明细` }}
          columns={[
            { title: '行', dataIndex: 'row', width: 64 },
            { title: '编码', dataIndex: 'code' },
            { title: '失败原因', dataIndex: 'message' },
          ]}
        />
      )}
    </Modal>
  );
}

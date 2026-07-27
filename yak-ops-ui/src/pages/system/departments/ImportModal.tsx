import { InboxOutlined } from '@ant-design/icons';
import type { UploadFile } from 'antd';
import { Alert, Button, Descriptions, Modal, message, Upload } from 'antd';
import { useState } from 'react';
import { importDepartments } from '@/services/security/departments';
import type { ImportReport } from '@/services/security/permissions';

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
      const result = await importDepartments(file);
      setReport(result);
      message.success(`导入完成：成功 ${result.successCount}，失败 ${result.failureCount}`);
      onImported();
    } finally {
      setLoading(false);
    }
  };
  return (
    <Modal
      title="导入部门"
      open={open}
      onCancel={onClose}
      footer={[
        <Button key="close" onClick={onClose}>
          关闭
        </Button>,
        <Button key="import" type="primary" loading={loading} disabled={!files.length} onClick={submit}>
          开始导入
        </Button>,
      ]}
    >
      <Alert
        className="mb-4"
        type="info"
        showIcon
        message="请使用服务端约定的导入模板"
        description="文件中的父部门必须先于子部门；请在导入前检查重复编码和父部门标识。"
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
        <p>点击或拖拽部门文件到此处</p>
      </Upload.Dragger>
      {report && (
        <Descriptions className="mt-4" bordered column={2} size="small">
          <Descriptions.Item label="成功">{report.successCount}</Descriptions.Item>
          <Descriptions.Item label="失败">{report.failureCount}</Descriptions.Item>
          {report.failures?.length ? (
            <Descriptions.Item label="失败明细" span={2}>
              {report.failures.map((item, index) => (
                <div key={`${item.row ?? index}-${item.code ?? ''}`}>
                  {item.row ? `第 ${item.row} 行：` : ''}
                  {item.message}
                </div>
              ))}
            </Descriptions.Item>
          ) : null}
        </Descriptions>
      )}
    </Modal>
  );
}

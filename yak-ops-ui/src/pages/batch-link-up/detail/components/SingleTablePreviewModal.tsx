import { ReloadOutlined } from '@ant-design/icons';
import { Alert, Button, Empty, Modal, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { dataSourceCatalogApi } from '@/pages/data-source/service';
import { API_SUCCESS_CODE } from '@/services/http/response';

interface DataSourcePreviewColumn {
  title?: string;
  dataIndex?: string;
  key?: string;
  ellipsis?: boolean;
}

interface DataSourcePreviewResult {
  columns?: DataSourcePreviewColumn[];
  data?: Array<Record<string, unknown>>;
  total?: number;
}

interface SingleTablePreviewModalProps {
  open: boolean;
  dataSourceId?: string | number;
  sourceConfig: Record<string, any>;
  onCancel: () => void;
}

type PreviewRow = Record<string, unknown> & {
  __yakPreviewRowKey: string;
};

const emptyPreview: DataSourcePreviewResult = {
  columns: [],
  data: [],
  total: 0,
};

const responseMessage = (response: any, fallback: string) =>
  response?.message || response?.msg || fallback;

const normalizeRequest = (sourceConfig: Record<string, any>) => {
  const readMode = sourceConfig.readMode === 'sql' ? 'sql' : 'table';

  if (readMode === 'sql') {
    const query = String(sourceConfig.sql || '').trim();
    return query
      ? {
          readMode,
          read_mode: readMode,
          query,
          ...(Array.isArray(sourceConfig.paramsList)
            ? { paramsList: sourceConfig.paramsList }
            : {}),
        }
      : null;
  }

  const tablePath = String(sourceConfig.table || '').trim();
  return tablePath
    ? {
        readMode,
        read_mode: readMode,
        table_path: tablePath,
      }
    : null;
};

const renderCellValue = (value: unknown) => {
  if (value === null || value === undefined) {
    return <span className="text-[#98a2b3]">NULL</span>;
  }

  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }

  return String(value);
};

export default function SingleTablePreviewModal({
  open,
  dataSourceId,
  sourceConfig,
  onCancel,
}: SingleTablePreviewModalProps) {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [preview, setPreview] = useState<DataSourcePreviewResult>(emptyPreview);
  const [total, setTotal] = useState(0);
  const requestSequence = useRef(0);

  const requestBody = useMemo(
    () => normalizeRequest(sourceConfig),
    [sourceConfig],
  );

  const loadPreview = useCallback(async () => {
    if (!dataSourceId) {
      setErrorMessage('请先选择来源数据源');
      return;
    }
    if (!requestBody) {
      setErrorMessage(
        sourceConfig.readMode === 'sql'
          ? '请先填写查询 SQL'
          : '请先选择来源表',
      );
      return;
    }

    const sequence = ++requestSequence.current;
    setLoading(true);
    setErrorMessage('');
    setPreview(emptyPreview);
    setTotal(0);

    try {
      const [previewResponse, countResponse] = await Promise.all([
        dataSourceCatalogApi.getTop20Data(dataSourceId, requestBody),
        dataSourceCatalogApi.count(dataSourceId, requestBody),
      ]);

      if (sequence !== requestSequence.current) return;

      if (previewResponse?.code !== API_SUCCESS_CODE) {
        throw new Error(responseMessage(previewResponse, '获取预览数据失败'));
      }
      if (countResponse?.code !== API_SUCCESS_CODE) {
        throw new Error(responseMessage(countResponse, '统计数据量失败'));
      }

      const nextPreview =
        (previewResponse?.data as DataSourcePreviewResult | undefined) ||
        emptyPreview;
      const nextTotal = Number(countResponse?.data ?? nextPreview.total ?? 0);

      setPreview({
        columns: Array.isArray(nextPreview.columns) ? nextPreview.columns : [],
        data: Array.isArray(nextPreview.data) ? nextPreview.data : [],
        total: Number.isFinite(Number(nextPreview.total))
          ? Number(nextPreview.total)
          : 0,
      });
      setTotal(Number.isFinite(nextTotal) ? nextTotal : 0);
    } catch (error: any) {
      if (sequence !== requestSequence.current) return;
      setPreview(emptyPreview);
      setTotal(0);
      setErrorMessage(error?.message || '获取数据预览失败');
    } finally {
      if (sequence === requestSequence.current) {
        setLoading(false);
      }
    }
  }, [dataSourceId, requestBody, sourceConfig.readMode]);

  useEffect(() => {
    if (open) {
      void loadPreview();
      return;
    }

    requestSequence.current += 1;
  }, [loadPreview, open]);

  const columns = useMemo<ColumnsType<PreviewRow>>(() => {
    const configuredColumns = Array.isArray(preview.columns)
      ? preview.columns
      : [];
    const fallbackColumns = Object.keys(preview.data?.[0] || {}).map((key) => ({
      title: key,
      dataIndex: key,
      key,
      ellipsis: true,
    }));

    return (configuredColumns.length > 0
      ? configuredColumns
      : fallbackColumns
    ).map((column, index) => {
      const dataIndex = String(
        column.dataIndex || column.key || column.title || `column_${index}`,
      );

      return {
        title: column.title || dataIndex,
        key: column.key || `${dataIndex}_${index}`,
        width: 180,
        ellipsis: column.ellipsis !== false,
        render: (_value, record) => renderCellValue(record[dataIndex]),
      };
    });
  }, [preview.columns, preview.data]);

  const rows = useMemo<PreviewRow[]>(
    () =>
      (preview.data || []).map((row, index) => ({
        ...row,
        __yakPreviewRowKey: `preview-${index}`,
      })),
    [preview.data],
  );

  const readMode = sourceConfig.readMode === 'sql' ? 'sql' : 'table';
  const previewTarget =
    readMode === 'sql'
      ? '自定义 SQL'
      : String(sourceConfig.table || '未选择来源表');

  return (
    <Modal
      open={open}
      title="数据预览"
      width={1200}
      destroyOnClose
      onCancel={onCancel}
      footer={[
        <Button
          key="refresh"
          icon={<ReloadOutlined />}
          loading={loading}
          onClick={() => void loadPreview()}
        >
          刷新
        </Button>,
        <Button key="close" type="primary" onClick={onCancel}>
          关闭
        </Button>,
      ]}
      styles={{ body: { paddingTop: 12 } }}
    >
      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg bg-[#f7f7f8] px-3.5 py-3">
        <Tag bordered={false}>{readMode === 'sql' ? 'SQL 查询' : '数据表'}</Tag>
        <div className="min-w-0 flex-1 truncate text-[13px] font-medium text-[#344054]">
          {previewTarget}
        </div>
        <div className="text-[12px] text-[#667085]">
          总记录数：
          <span className="ml-1 font-semibold text-[#161823]">
            {total.toLocaleString()}
          </span>
        </div>
        <div className="text-[12px] text-[#667085]">
          本次预览：
          <span className="ml-1 font-semibold text-[#161823]">
            {rows.length} 条
          </span>
        </div>
      </div>

      {errorMessage ? (
        <Alert
          showIcon
          type="error"
          message="数据预览失败"
          description={errorMessage}
          className="mb-4"
        />
      ) : null}

      <Table<PreviewRow>
        bordered
        size="small"
        loading={loading}
        columns={columns}
        dataSource={rows}
        rowKey="__yakPreviewRowKey"
        pagination={false}
        scroll={{ x: 'max-content', y: 420 }}
        locale={{
          emptyText: (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={loading ? '正在加载预览数据' : '暂无数据'}
            />
          ),
        }}
      />
    </Modal>
  );
}

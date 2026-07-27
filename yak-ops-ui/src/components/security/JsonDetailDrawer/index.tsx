import { Descriptions, Drawer, Empty, Spin } from 'antd';

interface JsonDetailDrawerProps {
  title: string;
  open: boolean;
  loading?: boolean;
  data?: Record<string, unknown> | null;
  labels?: Record<string, string>;
  fields?: string[];
  onClose: () => void;
}

const displayValue = (value: unknown) => {
  if (value === null || value === undefined || value === '') return '-';
  if (typeof value === 'boolean') return value ? '是' : '否';
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  return String(value);
};

export default function JsonDetailDrawer({
  title,
  open,
  loading,
  data,
  labels = {},
  fields,
  onClose,
}: JsonDetailDrawerProps) {
  const entries = data
    ? (fields ?? Object.keys(data))
        .filter((field) => field !== 'children' && field in data)
        .map((field) => [field, data[field]] as const)
    : [];
  return (
    <Drawer title={title} width={520} open={open} onClose={onClose} destroyOnClose>
      <Spin spinning={Boolean(loading)}>
        {entries.length ? (
          <Descriptions bordered column={1} size="small">
            {entries.map(([key, value]) => (
              <Descriptions.Item key={key} label={labels[key] ?? key}>
                <span className="whitespace-pre-wrap break-all">{displayValue(value)}</span>
              </Descriptions.Item>
            ))}
          </Descriptions>
        ) : (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无详情" />
        )}
      </Spin>
    </Drawer>
  );
}

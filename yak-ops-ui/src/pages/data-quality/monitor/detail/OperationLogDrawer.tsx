import { Drawer, Empty, Pagination, Table, Tag } from 'antd';
import type { TableColumnsType } from 'antd';
import { dataQualityTableClassName } from '../../components/tableStyle';
import type { OperationLogItem, OperationLogPageView } from '../../types';
import { ACTION_TYPE_LABEL } from './model';

interface OperationLogDrawerProps {
  open: boolean;
  loading: boolean;
  data: OperationLogPageView;
  onClose: () => void;
  onPageChange: (current: number, pageSize: number) => void;
}

const OperationLogDrawer = ({
  open,
  loading,
  data,
  onClose,
  onPageChange,
}: OperationLogDrawerProps) => {
  const columns: TableColumnsType<OperationLogItem> = [
    {
      title: '操作人 / 时间',
      width: 210,
      render: (_, record) => (
        <div className="space-y-1 py-0.5">
          <div className="font-medium text-[#172033]">{record.operator}</div>
          <div className="text-[11px] text-[#98a2b3]">
            {record.operationTime}
          </div>
        </div>
      ),
    },
    {
      title: '操作类型',
      dataIndex: 'actionType',
      width: 120,
      render: (value) => (
        <Tag className="!m-0 !border-0 !bg-[#f2f4f7] !text-[#43506a]">
          {ACTION_TYPE_LABEL[value] || value}
        </Tag>
      ),
    },
    {
      title: '操作内容',
      dataIndex: 'content',
      render: (value) => (
        <div className="whitespace-pre-wrap leading-5 text-[#475467]">
          {value}
        </div>
      ),
    },
  ];

  return (
    <Drawer
      title="操作日志"
      width="min(720px, 92vw)"
      open={open}
      onClose={onClose}
      destroyOnClose
      footer={
        <div className="flex justify-end">
          <Pagination
            size="small"
            current={data.current}
            pageSize={data.pageSize}
            total={data.total}
            showSizeChanger
            onChange={onPageChange}
          />
        </div>
      }
    >
      <Table<OperationLogItem>
        rowKey="id"
        size="small"
        bordered
        loading={loading}
        pagination={false}
        scroll={{ x: 700 }}
        className={dataQualityTableClassName()}
        dataSource={data.records}
        columns={columns}
        locale={{
          emptyText: (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="暂无操作日志"
            />
          ),
        }}
      />
    </Drawer>
  );
};

export default OperationLogDrawer;

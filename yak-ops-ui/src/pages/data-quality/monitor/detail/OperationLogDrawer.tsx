import { Drawer, Pagination, Table, Tag } from 'antd';
import type { TableColumnsType } from 'antd';
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
    { title: '操作人', dataIndex: 'operator', width: 130 },
    { title: '操作时间', dataIndex: 'operationTime', width: 190 },
    {
      title: '类型',
      dataIndex: 'actionType',
      width: 100,
      render: (value) => (
        <Tag className="!m-0 !border-0 !bg-[#f2f4f7] !text-[#43506a]">
          {ACTION_TYPE_LABEL[value] || value}
        </Tag>
      ),
    },
    { title: '操作内容', dataIndex: 'content' },
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
        loading={loading}
        pagination={false}
        scroll={{ x: 760 }}
        dataSource={data.records}
        columns={columns}
        locale={{ emptyText: '暂无操作日志' }}
      />
    </Drawer>
  );
};

export default OperationLogDrawer;

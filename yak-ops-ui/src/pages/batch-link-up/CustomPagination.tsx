import { Pagination, Select } from "antd";

interface CustomPaginationProps {
  total: number;
  current?: number;
  pageSize?: number;
  onChange?: (page: number, pageSize: number) => void;
}

const PAGE_SIZE_OPTIONS = [10, 20, 50];

const CustomPagination: React.FC<CustomPaginationProps> = ({
  total,
  current = 1,
  pageSize = 20,
  onChange,
}) => {
  const handlePageChange = (page: number) => {
    onChange?.(page, pageSize);
  };

  const handlePageSizeChange = (nextPageSize: number) => {
    onChange?.(1, nextPageSize);
  };

  return (
    <div className="flex items-center gap-3 text-[13px] text-[#667085]">
      <Pagination
        size="small"
        total={total}
        current={current}
        pageSize={pageSize}
        showSizeChanger={false}
        showQuickJumper={false}
        onChange={handlePageChange}
      />

      <span className="whitespace-nowrap">每页显示：</span>

      <Select
        size="small"
        value={pageSize}
        options={PAGE_SIZE_OPTIONS.map((value) => ({
          label: value,
          value,
        }))}
        onChange={handlePageSizeChange}
        className="w-[64px]"
      />

      <span className="whitespace-nowrap text-[#344054]">总 {total} 行</span>
    </div>
  );
};

export default CustomPagination;

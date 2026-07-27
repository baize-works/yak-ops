import { Pagination } from 'antd';

interface SecurityPaginationProps {
  current: number;
  pageSize: number;
  total: number;
  disabled?: boolean;
  onChange: (
    current: number,
    pageSize: number,
  ) => void;
}

export default function SecurityPagination({
  current,
  pageSize,
  total,
  disabled = false,
  onChange,
}: SecurityPaginationProps) {
  return (
    <div className="flex h-[80px] w-full shrink-0 items-center justify-end rounded-md bg-white px-6">
      {total > 0 && (
        <div className="flex flex-wrap items-center justify-end gap-4">
          <span className="text-sm text-slate-500">
            共 {total} 条
          </span>

          <Pagination
            current={current}
            pageSize={pageSize}
            total={total}
            disabled={disabled}
            showSizeChanger
            showQuickJumper={false}
            pageSizeOptions={[10, 20, 50, 100]}
            showTotal={undefined}
            onChange={onChange}
          />
        </div>
      )}
    </div>
  );
}
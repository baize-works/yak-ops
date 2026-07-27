import { Table, type TableProps } from "antd";

export default function SecurityQueryTable<T extends object>({
  className,
  rowKey = "id",
  pagination = false,
  bordered = true,
  size = "middle",
  ...props
}: TableProps<T>) {
  return (
    <Table<T>
      rowKey={rowKey}
      bordered={bordered}
      pagination={pagination}
      size={size}
      {...props}
      className={[
        "[&_.ant-table]:bg-white",

        // 直接给 Table 自身设置圆角，不添加外层 border
        "[&_.ant-table-container]:overflow-hidden",
        "[&_.ant-table-container]:rounded-xl",

        // 表头
        "[&_.ant-table-thead>tr>th]:!h-11",
        "[&_.ant-table-thead>tr>th]:!bg-[#fafafa]",
        "[&_.ant-table-thead>tr>th]:!px-4",
        "[&_.ant-table-thead>tr>th]:!py-0",
        "[&_.ant-table-thead>tr>th]:text-sm",
        "[&_.ant-table-thead>tr>th]:font-medium",
        "[&_.ant-table-thead>tr>th]:text-slate-600",

        // 表格内容
        "[&_.ant-table-tbody>tr>td]:!px-4",
        "[&_.ant-table-tbody>tr>td]:!py-4",
        "[&_.ant-table-tbody>tr>td]:text-sm",
        "[&_.ant-table-tbody>tr>td]:text-slate-700",

        // Hover
        "[&_.ant-table-tbody>tr:hover>td]:!bg-slate-50/80",

        // 空数据区域
        "[&_.ant-table-placeholder>td]:!py-16",

        className,
      ]
        .filter(Boolean)
        .join(" ")}
    />
  );
}
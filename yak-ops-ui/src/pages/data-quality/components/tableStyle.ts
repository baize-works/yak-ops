export const DATA_QUALITY_TABLE_CLASS_NAME = [
  // 表格整体
  '[&_.ant-table]:!text-[13px]',
  '[&_.ant-table-container]:!overflow-hidden',
  '[&_.ant-table-container]:!rounded-xl',
  '[&_.ant-table-container]:!border-[#eaecf0]',
  '[&_.ant-table-cell]:!align-middle',

  // 表头
  '[&_.ant-table-thead>tr>th]:!h-10',
  '[&_.ant-table-thead>tr>th]:!bg-[#f8f9fb]',
  '[&_.ant-table-thead>tr>th]:!px-4',
  '[&_.ant-table-thead>tr>th]:!py-2',
  '[&_.ant-table-thead>tr>th]:!text-[12px]',
  '[&_.ant-table-thead>tr>th]:!font-medium',
  '[&_.ant-table-thead>tr>th]:!text-[#667085]',
  '[&_.ant-table-thead>tr>th]:!border-[#eaecf0]',

  // 表体
  '[&_.ant-table-tbody>tr>td]:!px-4',
  '[&_.ant-table-tbody>tr>td]:!py-2.5',
  '[&_.ant-table-tbody>tr>td]:!border-[#f0f2f5]',
  '[&_.ant-table-tbody>tr>td]:!text-[#667085]',
  '[&_.ant-table-tbody>tr:hover>td]:!bg-[#fafbfc]',

  // 固定操作列
  '[&_.ant-table-cell-fix-right]:!bg-white',
  '[&_.ant-table-tbody>tr:hover_.ant-table-cell-fix-right]:!bg-[#fafbfc]',

  // 复选框
  '[&_.ant-checkbox-inner]:!h-4',
  '[&_.ant-checkbox-inner]:!w-4',

  // 展开行和空状态
  '[&_.ant-table-expanded-row>td]:!bg-[#fafbfc]',
  '[&_.ant-table-placeholder>td]:!h-[240px]',
].join(' ');

export const dataQualityTableClassName = (...classNames: Array<string | undefined | false>) =>
  [DATA_QUALITY_TABLE_CLASS_NAME, ...classNames].filter(Boolean).join(' ');

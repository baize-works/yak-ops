
import YakOpsEmpty from '@/components/YakOpsEmpty';
import {
  Empty,
  Table,
  type SpinProps,
  type TableProps,
} from 'antd';



export default function SecurityQueryTable<T extends object>({
  className,
  rowKey = 'id',
  pagination = false,
  bordered = true,
  size = 'middle',
  loading = false,
  locale,
  ...props
}: TableProps<T>) {
  const isSpinning =
    typeof loading === 'boolean'
      ? loading
      : loading.spinning ?? true;

  const tableLoading: boolean | SpinProps =
    typeof loading === 'boolean'
      ? {
          spinning: loading,
          indicator: (
            <span
              className="security-table-loading-spinner"
              aria-label="加载中"
            />
          ),
          tip: '加载中，请稍候...',
        }
      : {
          ...loading,
          indicator: loading.indicator ?? (
            <span
              className="security-table-loading-spinner"
              aria-label="加载中"
            />
          ),
          tip: loading.tip ?? '加载中，请稍候...',
        };

  /**
   * 外部传入 locale.emptyText 时优先使用外部配置；
   * 未传入时默认使用 YakOpsEmpty。
   */
  const emptyText =
    locale?.emptyText !== undefined ? (
      locale.emptyText
    ) : (
      <Empty
        image={
          <YakOpsEmpty
            width={220}
            height={174}
            className="mx-auto"
          />
        }
        imageStyle={{
          height: 174,
        }}
        description={
          <span className="text-sm text-slate-400">
            暂无数据
          </span>
        }
      />
    );

  return (
    <>
      <Table<T>
        {...props}
        rowKey={rowKey}
        bordered={bordered}
        pagination={pagination}
        size={size}
        loading={tableLoading}
        locale={{
          ...locale,

          // 加载过程中不显示空状态插画
          emptyText: isSpinning ? null : emptyText,
        }}
        className={[
          '[&_.ant-table]:bg-white',

          // Table 圆角
          '[&_.ant-table-container]:overflow-hidden',
          '[&_.ant-table-container]:rounded-xl',

          // 加载遮罩
          '[&_.ant-spin-container]:min-h-[200px]',
          '[&_.ant-spin-blur]:after:!rounded-xl',
          '[&_.ant-spin-text]:!mt-3',
          '[&_.ant-spin-text]:!text-[14px]',
          '[&_.ant-spin-text]:!font-normal',
          '[&_.ant-spin-text]:!text-[#655750]',

          // 表头
          '[&_.ant-table-thead>tr>th]:!h-11',
          '[&_.ant-table-thead>tr>th]:!bg-[#fafafa]',
          '[&_.ant-table-thead>tr>th]:!px-4',
          '[&_.ant-table-thead>tr>th]:!py-0',
          '[&_.ant-table-thead>tr>th]:text-sm',
          '[&_.ant-table-thead>tr>th]:font-medium',
          '[&_.ant-table-thead>tr>th]:text-slate-600',

          // 表格内容
          '[&_.ant-table-tbody>tr>td]:!px-4',
          '[&_.ant-table-tbody>tr>td]:!py-4',
          '[&_.ant-table-tbody>tr>td]:text-sm',
          '[&_.ant-table-tbody>tr>td]:text-slate-700',

          // Hover
          '[&_.ant-table-tbody>tr:hover>td]:!bg-slate-50/80',

          // 空数据区域
          '[&_.ant-table-placeholder>td]:!py-10',
          '[&_.ant-table-placeholder_.ant-empty]:!my-0',
          '[&_.ant-table-placeholder_.ant-empty-image]:!mb-3',

          className,
        ]
          .filter(Boolean)
          .join(' ')}
      />

      <style>
        {`
          .security-table-loading-spinner {
            display: inline-block;
            width: 28px !important;
            height: 28px !important;
            border-radius: 50%;
            background: conic-gradient(
              from 0deg,
              transparent 0deg,
              transparent 210deg,
              rgba(255, 82, 126, 0.18) 245deg,
              #ff527e 300deg,
              #ff527e 360deg
            );
            -webkit-mask: radial-gradient(
              farthest-side,
              transparent calc(100% - 4px),
              #000 calc(100% - 3px)
            );
            mask: radial-gradient(
              farthest-side,
              transparent calc(100% - 4px),
              #000 calc(100% - 3px)
            );
            animation: security-table-loading-spin 0.75s linear infinite;
          }

          @keyframes security-table-loading-spin {
            to {
              transform: rotate(360deg);
            }
          }

          @media (prefers-reduced-motion: reduce) {
            .security-table-loading-spinner {
              animation-duration: 1.5s;
            }
          }
        `}
      </style>
    </>
  );
}
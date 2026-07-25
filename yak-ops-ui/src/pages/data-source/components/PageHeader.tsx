import React from 'react';
import {Button} from 'antd';
import {PlusOutlined} from '@ant-design/icons';
import {useIntl} from '@umijs/max';

interface PageHeaderProps {
  onCreate: () => void;
}

const PageHeader: React.FC<PageHeaderProps> = ({onCreate}) => {
  const intl = useIntl();

  return (
    <div
      className={[
        'mb-8 flex flex-col items-start gap-5',
        'md:flex-row md:items-end md:justify-between',
      ].join(' ')}
    >
      <div className="min-w-0 flex-1">
        <div className="mb-2 flex items-center gap-3">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[hsl(231_48%_48%/0.10)] text-[hsl(231_48%_48%)]">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="23"
              height="23"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/>
              <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/>
              <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/>
              <path d="M10 6h4"/>
              <path d="M10 10h4"/>
              <path d="M10 14h4"/>
              <path d="M10 18h4"/>
            </svg>
          </div>

          <h1 className="m-0 truncate text-[26px] font-bold leading-8 tracking-[-0.02em] text-[#101828]">
            {intl.formatMessage({
              id: 'pages.datasource.header.title',
              defaultMessage: 'List of Data Sources',
            })}
          </h1>
        </div>

        <p className="m-0 max-w-[780px] text-sm leading-6 text-[#667085]">
          统一管理数据源连接、访问权限与安全策略，让数据接入更规范、更可控。
        </p>
      </div>

      <Button
        type="primary"
        icon={<PlusOutlined/>}
        size="large"
        onClick={onCreate}
        className={[
          '!h-[42px] !shrink-0 !rounded-full !px-5 !font-semibold',
          '!border-[hsl(231_48%_48%)] !bg-[hsl(231_48%_48%)]',
          'self-start md:self-auto',
          'transition-all duration-200 ease-out',
          'hover:!border-[hsl(231_48%_44%)]',
          'hover:!bg-[hsl(231_48%_44%)]',
        ].join(' ')}
      >
        新建数据源
      </Button>
    </div>
  );
};

export default PageHeader;

import { Empty, Typography } from 'antd';

export interface SystemPageShellProps {
  title: string;
  description: string;
}

/** Compile-safe system page boundary until its confirmed service contract lands. */
export default function SystemPageShell({ title, description }: SystemPageShellProps) {
  return (
    <section className="m-4 min-h-[calc(100vh-80px)] rounded-xl bg-white p-6" aria-labelledby="system-page-title">
      <Typography.Title id="system-page-title" level={4} className="!mb-1">
        {title}
      </Typography.Title>
      <Typography.Text type="secondary">{description}</Typography.Text>
      <Empty className="mt-20" description="暂无数据，等待已确认的 Security 接口" />
    </section>
  );
}

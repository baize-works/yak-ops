import { ArrowLeft, ArrowRight, DatabaseZap, FileCode2, Table2 } from 'lucide-react';
import { history, useParams } from '@umijs/max';
import { Tag } from 'antd';
import { modeMeta } from '../data';

const modes = [
  {
    key: 'single',
    mode: 'SINGLE_TABLE' as const,
    title: '单表同步',
    subtitle: '一个来源表 → 一个目标表',
    description:
      '适合订单主表、用户表等明确的一对一实时同步。配置字段投影、重命名、计算字段、行过滤、主键、分区键、建表参数和 UDF。',
    icon: <Table2 size={22} strokeWidth={1.7} />,
    iconClassName: 'bg-[#eff4ff] text-[#315efb]',
    features: ['来源表与目标表配置', '可视化字段投影与过滤', '主键 / 分区键重设', '自动生成 Pipeline YAML'],
  },
  {
    key: 'multi',
    mode: 'MULTI_TABLE' as const,
    title: '多表同步',
    subtitle: '整库、多表或表名规则同步',
    description:
      '适合整库同步、分库分表合并与多表路由。每张表可以配置独立 Transform，并通过 Route 映射到不同目标表。',
    icon: <DatabaseZap size={22} strokeWidth={1.7} />,
    iconClassName: 'bg-[#f4f3ff] text-[#6938ef]',
    features: ['表名正则与表清单', '多条 Transform 规则', 'Route 表路由映射', '统一 UDF 与运行参数'],
  },
  {
    key: 'yaml',
    mode: 'CUSTOM_YAML' as const,
    title: '自定义 YAML',
    subtitle: '直接编辑 Flink CDC Pipeline',
    description:
      '适合熟悉 Flink CDC 的高级用户，以及需要使用暂未在可视化页面开放的 Connector 参数和 Pipeline 能力。',
    icon: <FileCode2 size={22} strokeWidth={1.7} />,
    iconClassName: 'bg-[#fff5e7] text-[#b54708]',
    features: ['导入 .yaml / .yml 文件', '保留完整原始配置', '必要区块实时检查', '支持 Transform、Route 与 UDF'],
  },
];

const RealtimeTaskTypePage = () => {
  const { id = `rt-${Date.now()}` } = useParams<{ id: string }>();

  const selectMode = (mode: string) => {
    history.push(`/sync/realtime-link-up/${id}/config?mode=${mode}&scene=create`);
  };

  return (
    <div className="min-h-[calc(100vh-48px)] bg-[#f7f8fa]">
      <header className="border-b border-black/[0.07] bg-white">
        <div className="flex h-[66px] items-center px-5">
          <button
            type="button"
            onClick={() => history.push('/sync/realtime-link-up')}
            className="flex h-9 w-9 items-center justify-center rounded-[8px] border border-black/[0.07] bg-white text-[rgba(22,24,35,0.58)] transition hover:border-black/[0.14] hover:text-[#161823]"
          >
            <ArrowLeft size={17} strokeWidth={1.9} />
          </button>
          <div className="ml-3">
            <div className="text-[16px] font-semibold text-[#161823]">新建实时同步任务</div>
            <div className="mt-0.5 text-[10px] text-[rgba(22,24,35,0.42)]">选择创建模式后进入对应配置页面</div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1320px] px-6 py-10">
        <div className="text-center">
          <Tag className="!m-0 !rounded-full !border-black/[0.07] !bg-white !px-3 !py-1 !text-[10px] !font-medium !text-[rgba(22,24,35,0.52)]">
            Flink CDC Pipeline
          </Tag>
          <h1 className="mt-4 text-[26px] font-semibold tracking-[-0.02em] text-[#161823]">
            选择实时同步任务类型
          </h1>
          <p className="mx-auto mt-3 max-w-[720px] text-[12px] leading-6 text-[rgba(22,24,35,0.50)]">
            第一版不引入 Debezium Server、Kafka 或 Kafka Connect。三种模式最终都保存为 Flink CDC Pipeline 配置，后续由后端负责校验与提交。
          </p>
        </div>

        <div className="mt-9 grid grid-cols-3 gap-5 max-xl:grid-cols-1">
          {modes.map((item) => {
            const meta = modeMeta[item.mode];
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => selectMode(item.key)}
                className="group flex min-h-[420px] flex-col rounded-[12px] border border-black/[0.08] bg-white p-6 text-left shadow-[0_1px_2px_rgba(16,24,40,0.03)] transition duration-200 hover:-translate-y-0.5 hover:border-black/[0.16] hover:shadow-[0_12px_32px_rgba(16,24,40,0.08)]"
              >
                <div className="flex items-start justify-between gap-4">
                  <span className={`flex h-12 w-12 items-center justify-center rounded-[10px] ${item.iconClassName}`}>
                    {item.icon}
                  </span>
                  <Tag className={`!m-0 !rounded-full !px-2.5 !text-[10px] ${meta.className}`}>
                    {item.key === 'single' ? '推荐入门' : item.key === 'multi' ? '批量同步' : '高级模式'}
                  </Tag>
                </div>

                <div className="mt-6 text-[19px] font-semibold text-[#161823]">{item.title}</div>
                <div className="mt-1 text-[11px] font-medium text-[#315efb]">{item.subtitle}</div>
                <p className="mt-4 min-h-[72px] text-[11px] leading-6 text-[rgba(22,24,35,0.52)]">
                  {item.description}
                </p>

                <div className="mt-5 space-y-3 border-t border-black/[0.055] pt-5">
                  {item.features.map((feature) => (
                    <div key={feature} className="flex items-center gap-2 text-[11px] text-[#343741]">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#9aa1ad]" />
                      {feature}
                    </div>
                  ))}
                </div>

                <div className="mt-auto flex items-center justify-between border-t border-black/[0.055] pt-5 text-[11px] font-semibold text-[#161823]">
                  <span>使用此模式</span>
                  <ArrowRight
                    size={16}
                    strokeWidth={1.9}
                    className="transition-transform group-hover:translate-x-1"
                  />
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-6 rounded-[10px] border border-black/[0.07] bg-white px-5 py-4 text-[11px] leading-5 text-[rgba(22,24,35,0.50)]">
          <span className="font-semibold text-[#343741]">配置说明：</span>
          中间不设置连接测试步骤。单表和多表页面使用结构化表单生成 YAML；自定义 YAML 页面直接保存用户内容。三种模式都只完成任务定义，不涉及运行执行。
        </div>
      </main>
    </div>
  );
};

export default RealtimeTaskTypePage;

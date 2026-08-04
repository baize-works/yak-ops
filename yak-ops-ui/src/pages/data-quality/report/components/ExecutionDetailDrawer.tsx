import {
  CodeOutlined,
  CopyOutlined,
  DatabaseOutlined,
  FieldTimeOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import { Alert, Button, Descriptions, Drawer, message, Space } from 'antd';
import QualityResultTag from '../../components/QualityResultTag';
import { QUALITY_RULE_TYPE_META } from '../../mock';
import type { QualityExecutionRecord } from '../../types';

interface ExecutionDetailDrawerProps {
  open: boolean;
  record?: QualityExecutionRecord;
  onClose: () => void;
}

const ExecutionDetailDrawer = ({
  open,
  record,
  onClose,
}: ExecutionDetailDrawerProps) => {
  const copySql = async () => {
    if (!record) return;
    try {
      await navigator.clipboard.writeText(record.sql);
      message.success('SQL 已复制');
    } catch {
      message.warning('浏览器未允许复制，请手动选择 SQL');
    }
  };

  return (
    <Drawer
      width={680}
      open={open}
      title="运行详情"
      onClose={onClose}
      extra={<Button onClick={onClose}>关闭</Button>}
    >
      {record ? (
        <div className="space-y-5">
          <section>
            <div className="mb-3 flex items-center gap-2 text-[14px] font-semibold text-[#161823]">
              <SafetyCertificateOutlined className="text-[#667085]" />
              检查结果
            </div>
            <div className="grid grid-cols-2 gap-3 rounded-lg border border-[#eceef2] bg-[#f8f9fb] p-4">
              <div>
                <div className="text-[12px] text-[#98a2b3]">执行状态</div>
                <div className="mt-2">
                  <QualityResultTag value={record.executionStatus} />
                </div>
              </div>
              <div>
                <div className="text-[12px] text-[#98a2b3]">检查结果</div>
                <div className="mt-2">
                  <QualityResultTag value={record.checkResult} />
                </div>
              </div>
              <div>
                <div className="text-[12px] text-[#98a2b3]">实际值</div>
                <div className="mt-1 text-[18px] font-semibold text-[#101828]">
                  {record.metricValue || '--'}
                </div>
              </div>
              <div>
                <div className="text-[12px] text-[#98a2b3]">期望值</div>
                <div className="mt-1 font-mono text-[18px] font-semibold text-[#101828]">
                  {record.expectedValue}
                </div>
              </div>
            </div>
          </section>

          {record.errorMessage ? (
            <Alert
              showIcon
              type="error"
              message="执行异常"
              description={record.errorMessage}
            />
          ) : null}

          <section>
            <div className="mb-3 flex items-center gap-2 text-[14px] font-semibold text-[#161823]">
              <DatabaseOutlined className="text-[#667085]" />
              规则与对象
            </div>
            <Descriptions
              bordered
              size="small"
              column={1}
              labelStyle={{ width: 120, color: '#667085' }}
              items={[
                { key: 'id', label: '执行编号', children: record.id },
                { key: 'rule', label: '质量规则', children: record.ruleName },
                {
                  key: 'type',
                  label: '规则类型',
                  children: QUALITY_RULE_TYPE_META[record.ruleType].label,
                },
                { key: 'source', label: '数据源', children: record.dataSourceName },
                { key: 'object', label: '检查对象', children: record.objectName },
              ]}
            />
          </section>

          <section>
            <div className="mb-3 flex items-center gap-2 text-[14px] font-semibold text-[#161823]">
              <FieldTimeOutlined className="text-[#667085]" />
              执行信息
            </div>
            <Descriptions
              bordered
              size="small"
              column={1}
              labelStyle={{ width: 120, color: '#667085' }}
              items={[
                {
                  key: 'trigger',
                  label: '触发方式',
                  children:
                    record.triggerType === 'SCHEDULE' ? '定时调度' : '手动触发',
                },
                { key: 'operator', label: '执行人', children: record.operator },
                { key: 'start', label: '开始时间', children: record.startedAt },
                { key: 'end', label: '结束时间', children: record.finishedAt || '--' },
                {
                  key: 'duration',
                  label: '执行耗时',
                  children:
                    record.duration === undefined ? '--' : `${record.duration} ms`,
                },
              ]}
            />
          </section>

          <section>
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-[14px] font-semibold text-[#161823]">
                <CodeOutlined className="text-[#667085]" />
                执行 SQL
              </div>
              <Space>
                <Button
                  size="small"
                  icon={<CopyOutlined />}
                  onClick={() => void copySql()}
                >
                  复制
                </Button>
              </Space>
            </div>
            <pre className="m-0 overflow-auto rounded-lg border border-[#eceef2] bg-[#101828] p-4 text-[12px] leading-6 text-[#f2f4f7]">
              <code>{record.sql}</code>
            </pre>
          </section>
        </div>
      ) : null}
    </Drawer>
  );
};

export default ExecutionDetailDrawer;

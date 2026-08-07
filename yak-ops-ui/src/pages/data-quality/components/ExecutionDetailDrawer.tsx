import { API_SUCCESS_CODE } from '@/services/http/response';
import {
  Descriptions,
  Drawer,
  Empty,
  Spin,
  Table,
  Typography,
  message,
} from 'antd';
import { useEffect, useState } from 'react';
import { qualityExecutionApi } from '../service';
import type { ExecutionView, RuleExecutionView } from '../types';
import { CheckResultTag, ExecutionStatusTag } from './QualityStatus';
import { dataQualityTableClassName } from './tableStyle';

interface Props {
  executionNo?: string;
  open: boolean;
  onClose: () => void;
}

const ExecutionDetailDrawer = ({ executionNo, open, onClose }: Props) => {
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState<ExecutionView>();

  useEffect(() => {
    if (!open || !executionNo) return;
    setLoading(true);
    qualityExecutionApi
      .detail(executionNo)
      .then((response) => {
        if (response.code !== API_SUCCESS_CODE) {
          throw new Error(response.message || response.msg || '执行详情加载失败');
        }
        setDetail(response.data);
      })
      .catch((error) => message.error(error?.message || '执行详情加载失败'))
      .finally(() => setLoading(false));
  }, [executionNo, open]);

  return (
    <Drawer
      width={820}
      title={executionNo ? `执行详情 · ${executionNo}` : '执行详情'}
      open={open}
      onClose={onClose}
      destroyOnClose
    >
      <Spin spinning={loading}>
        {!detail ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          <div className="space-y-5">
            <Descriptions size="small" column={2} bordered>
              <Descriptions.Item label="监控名称">{detail.monitorName}</Descriptions.Item>
              <Descriptions.Item label="监控对象">{detail.objectName}</Descriptions.Item>
              <Descriptions.Item label="执行状态">
                <ExecutionStatusTag value={detail.executionStatus} />
              </Descriptions.Item>
              <Descriptions.Item label="检查结果">
                <CheckResultTag value={detail.checkResult} />
              </Descriptions.Item>
              <Descriptions.Item label="规则统计">
                {detail.passedRules} 通过 / {detail.failedRules} 未通过 /{' '}
                {detail.errorRules} 异常
              </Descriptions.Item>
              <Descriptions.Item label="执行耗时">
                {detail.durationMs === undefined ? '--' : `${detail.durationMs} ms`}
              </Descriptions.Item>
              <Descriptions.Item label="触发人">{detail.operator}</Descriptions.Item>
              <Descriptions.Item label="开始时间">{detail.startedAt || '--'}</Descriptions.Item>
            </Descriptions>

            <Table<RuleExecutionView>
              rowKey="id"
              size="small"
              bordered
              pagination={false}
              className={dataQualityTableClassName()}
              dataSource={detail.rules}
              columns={[
                {
                  title: '规则名称 / 模板',
                  dataIndex: 'ruleName',
                  width: 220,
                  render: (_, record) => (
                    <div className="min-w-0 py-0.5">
                      <div className="truncate font-medium text-[#172033]">
                        {record.ruleName}
                      </div>
                      <div className="mt-1 truncate text-[11px] text-[#98a2b3]">
                        {record.templateCode}
                      </div>
                    </div>
                  ),
                },
                {
                  title: '检查字段',
                  dataIndex: 'columnName',
                  width: 130,
                  render: (value) => value || '表级规则',
                },
                {
                  title: '检查结果',
                  dataIndex: 'checkResult',
                  width: 110,
                  render: (value) => <CheckResultTag value={value} />,
                },
                {
                  title: '实际值 / 期望值',
                  width: 210,
                  render: (_, record) => (
                    <div className="space-y-1 text-xs">
                      <div>
                        <span className="text-[#98a2b3]">实际：</span>
                        <span className="text-[#344054]">{record.metricValue || '--'}</span>
                      </div>
                      <div>
                        <span className="text-[#98a2b3]">期望：</span>
                        <span className="text-[#344054]">{record.expectedValue || '--'}</span>
                      </div>
                    </div>
                  ),
                },
                {
                  title: '耗时',
                  dataIndex: 'durationMs',
                  width: 90,
                  render: (value) => `${value ?? 0} ms`,
                },
              ]}
              expandable={{
                expandedRowRender: (record) => (
                  <div className="space-y-2 px-2 py-1">
                    {record.errorMessage && (
                      <Typography.Text type="danger">
                        {record.errorMessage}
                      </Typography.Text>
                    )}
                    <Typography.Paragraph
                      copyable
                      className="!mb-0 whitespace-pre-wrap text-xs"
                    >
                      {record.executedSql || '未生成执行 SQL'}
                    </Typography.Paragraph>
                  </div>
                ),
              }}
            />
          </div>
        )}
      </Spin>
    </Drawer>
  );
};

export default ExecutionDetailDrawer;

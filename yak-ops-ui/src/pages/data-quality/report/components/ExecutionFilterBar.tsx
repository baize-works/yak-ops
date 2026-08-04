import { ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import { Button, Input, Select } from 'antd';
import type {
  QualityCheckResult,
  QualityExecutionFilters,
  QualityExecutionStatus,
  QualityTriggerType,
} from '../../types';

interface ExecutionFilterBarProps {
  value: QualityExecutionFilters;
  onChange: (value: QualityExecutionFilters) => void;
  onReset: () => void;
}

const ExecutionFilterBar = ({
  value,
  onChange,
  onReset,
}: ExecutionFilterBarProps) => (
  <section className="mt-4 rounded-lg border border-[#eceef2] bg-white px-4 py-3">
    <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-[minmax(280px,1fr)_180px_180px_160px_auto]">
      <Input
        allowClear
        variant="filled"
        prefix={<SearchOutlined className="text-[#98a2b3]" />}
        placeholder="搜索执行编号、规则名称或检查对象"
        value={value.keyword}
        onChange={(event) =>
          onChange({ ...value, keyword: event.target.value })
        }
      />
      <Select<QualityExecutionStatus>
        allowClear
        variant="filled"
        placeholder="执行状态"
        value={value.status}
        options={[
          { label: '等待中', value: 'WAITING' },
          { label: '运行中', value: 'RUNNING' },
          { label: '执行成功', value: 'SUCCESS' },
          { label: '执行失败', value: 'FAILED' },
        ]}
        onChange={(status) => onChange({ ...value, status })}
      />
      <Select<QualityCheckResult>
        allowClear
        variant="filled"
        placeholder="检查结果"
        value={value.checkResult}
        options={[
          { label: '通过', value: 'PASSED' },
          { label: '未通过', value: 'NOT_PASSED' },
          { label: '未知', value: 'UNKNOWN' },
        ]}
        onChange={(checkResult) => onChange({ ...value, checkResult })}
      />
      <Select<QualityTriggerType>
        allowClear
        variant="filled"
        placeholder="触发方式"
        value={value.triggerType}
        options={[
          { label: '手动触发', value: 'MANUAL' },
          { label: '定时调度', value: 'SCHEDULE' },
        ]}
        onChange={(triggerType) => onChange({ ...value, triggerType })}
      />
      <Button icon={<ReloadOutlined />} onClick={onReset}>
        重置
      </Button>
    </div>
  </section>
);

export default ExecutionFilterBar;

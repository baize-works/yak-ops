import { ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import { Button, Input, Select } from 'antd';
import { DATA_SOURCE_OPTIONS, QUALITY_RULE_TYPE_META } from '../mock';
import type {
  QualityRuleFilters,
  QualityRuleResult,
  QualityRuleType,
} from '../types';

interface QualityFilterBarProps {
  value: QualityRuleFilters;
  onChange: (value: QualityRuleFilters) => void;
  onReset: () => void;
}

const ruleTypeOptions = Object.entries(QUALITY_RULE_TYPE_META).map(
  ([value, meta]) => ({
    label: meta.label,
    value: value as QualityRuleType,
  }),
);

const resultOptions: Array<{ label: string; value: QualityRuleResult }> = [
  { label: '通过', value: 'PASSED' },
  { label: '未通过', value: 'NOT_PASSED' },
  { label: '执行异常', value: 'ERROR' },
  { label: '运行中', value: 'RUNNING' },
  { label: '未运行', value: 'NOT_RUN' },
];

const QualityFilterBar = ({
  value,
  onChange,
  onReset,
}: QualityFilterBarProps) => (
  <section className="mt-4 rounded-lg border border-[#eceef2] bg-white px-4 py-3">
    <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
      <div className="grid flex-1 grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-[minmax(240px,1.4fr)_200px_180px_150px]">
        <Input
          allowClear
          variant="filled"
          prefix={<SearchOutlined className="text-[#98a2b3]" />}
          placeholder="搜索规则名称、表名或字段"
          value={value.keyword}
          onChange={(event) =>
            onChange({ ...value, keyword: event.target.value })
          }
        />
        <Select<string>
          allowClear
          variant="filled"
          placeholder="全部数据源"
          options={DATA_SOURCE_OPTIONS}
          value={value.dataSourceId}
          onChange={(dataSourceId) => onChange({ ...value, dataSourceId })}
        />
        <Select<QualityRuleType>
          allowClear
          variant="filled"
          placeholder="全部规则类型"
          options={ruleTypeOptions}
          value={value.ruleType}
          onChange={(ruleType) => onChange({ ...value, ruleType })}
        />
        <Select<QualityRuleResult>
          allowClear
          variant="filled"
          placeholder="全部结果"
          options={resultOptions}
          value={value.result}
          onChange={(result) => onChange({ ...value, result })}
        />
      </div>
      <div className="flex items-center justify-end gap-2">
        <Select<boolean>
          allowClear
          variant="filled"
          className="w-[128px]"
          placeholder="启用状态"
          options={[
            { label: '已启用', value: true },
            { label: '已停用', value: false },
          ]}
          value={value.enabled}
          onChange={(enabled) => onChange({ ...value, enabled })}
        />
        <Button icon={<ReloadOutlined />} onClick={onReset}>
          重置
        </Button>
      </div>
    </div>
  </section>
);

export default QualityFilterBar;

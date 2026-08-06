import { Input, Radio, Select, Switch } from 'antd';
import { BellRing, ShieldAlert } from 'lucide-react';
import { EditorField, EditorSection } from './EditorLayout';
import type { IssueStrategyState } from './model';

export const IssueStrategy = ({
  value,
  onChange,
}: {
  value: IssueStrategyState;
  onChange: (value: IssueStrategyState) => void;
}) => (
  <EditorSection
    id="issue-strategy"
    title="质量问题处理策略"
    description="配置规则失败后的执行行为，以及检查异常时的告警记录。"
  >
    <div className="space-y-5">
      <EditorField label="失败后处理" required>
        <Radio.Group
          value={value.ruleFailureAction}
          onChange={(event) => onChange({ ...value, ruleFailureAction: event.target.value })}
          className="flex flex-wrap gap-3"
        >
          <Radio.Button value="CONTINUE">继续执行剩余规则</Radio.Button>
          <Radio.Button value="STOP">立即终止本次检查</Radio.Button>
        </Radio.Group>
      </EditorField>

      <EditorField label="告警通知">
        <div className="flex min-h-12 items-center justify-between rounded-lg bg-[#f5f5f6] px-3 py-2">
          <div className="flex min-w-0 items-start gap-2.5">
            <BellRing size={16} className="mt-0.5 shrink-0 text-[#667085]" />
            <div>
              <div className="text-[13px] font-medium text-[#344054]">质量检查异常时记录告警事件</div>
              <div className="mt-0.5 text-[11px] text-[#98a2b3]">站内消息直接记录；邮件和 Webhook 进入待投递队列。</div>
            </div>
          </div>
          <Switch checked={value.notifyEnabled} onChange={(notifyEnabled) => onChange({ ...value, notifyEnabled })} />
        </div>
      </EditorField>

      {value.notifyEnabled ? (
        <EditorField label="通知配置" required>
          <div className="rounded-lg border border-[#ebecef] bg-[#fcfcfd] p-4">
            <div className="grid grid-cols-2 gap-4 max-md:grid-cols-1">
              <div>
                <div className="mb-1.5 text-xs font-medium text-[#667085]">告警级别</div>
                <Select
                  variant="filled"
                  value={value.alertLevel}
                  options={[{ value: 'WARNING', label: '警告' }, { value: 'CRITICAL', label: '严重' }]}
                  onChange={(alertLevel) => onChange({ ...value, alertLevel })}
                  className="w-full"
                />
              </div>
              <div>
                <div className="mb-1.5 text-xs font-medium text-[#667085]">通知方式</div>
                <Select
                  variant="filled"
                  value={value.notifyChannel}
                  options={[
                    { value: 'MESSAGE', label: '站内消息' },
                    { value: 'EMAIL', label: '邮件' },
                    { value: 'WEBHOOK', label: 'Webhook' },
                  ]}
                  onChange={(notifyChannel) => onChange({ ...value, notifyChannel })}
                  className="w-full"
                />
              </div>
              <div className="col-span-2 max-md:col-span-1">
                <div className="mb-1.5 text-xs font-medium text-[#667085]">接收对象</div>
                <Input
                  variant="filled"
                  value={value.notifyTarget}
                  placeholder={
                    value.notifyChannel === 'EMAIL'
                      ? '请输入邮箱，多个邮箱用逗号分隔'
                      : value.notifyChannel === 'WEBHOOK'
                        ? '请输入 Webhook 地址'
                        : '留空时默认使用质量监控负责人'
                  }
                  onChange={(event) => onChange({ ...value, notifyTarget: event.target.value })}
                />
              </div>
            </div>
          </div>
        </EditorField>
      ) : null}

      <div className="flex items-start gap-2 rounded-lg bg-[#f7f8fa] px-3 py-2.5 text-[11px] leading-5 text-[#667085]">
        <ShieldAlert size={15} className="mt-0.5 shrink-0" />
        <span>邮件与 Webhook 当前完成配置持久化和告警事件入队，实际外部投递由后续通知通道消费。</span>
      </div>
    </div>
  </EditorSection>
);

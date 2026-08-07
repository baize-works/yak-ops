import { history } from '@umijs/max';
import { Alert, Button, Form, Input, Select, Switch } from 'antd';
import { EditorField, EditorSection } from './EditorLayout';

export const BasicConfig = ({
  dataSourceId,
  dataSourceName,
  tables,
}: {
  dataSourceId?: number;
  dataSourceName?: string;
  tables: Array<{ name: string; remarks?: string }>;
}) => (
  <EditorSection
    id="basic-config"
    title="基本配置"
    description=""
  >
    <div className="space-y-5">
      <EditorField label="监控名称" required>
        <Form.Item
          name="name"
          rules={[{ required: true, message: '请输入监控名称' }]}
          className="!mb-0"
        >
          <Input
            variant="filled"
            maxLength={100}
            showCount
            placeholder="例如：订单表每日质量检查"
          />
        </Form.Item>
      </EditorField>

      <EditorField label="负责人" required>
        <Form.Item
          name="owner"
          rules={[{ required: true, message: '请输入负责人' }]}
          className="!mb-0"
        >
          <Input variant="filled" placeholder="请输入质量监控负责人" />
        </Form.Item>
      </EditorField>

      <EditorField label="监控对象" required>
        {dataSourceId ? (
          <Form.Item
            name="tableName"
            rules={[{ required: true, message: '请选择数据表' }]}
            className="!mb-0"
          >
            <Select
              variant="filled"
              showSearch
              optionFilterProp="label"
              placeholder="请选择需要监控的数据表"
              options={tables.map((item) => ({
                value: item.name,
                label: item.remarks ? `${item.name} · ${item.remarks}` : item.name,
              }))}
            />
          </Form.Item>
        ) : (
          <Alert
            type="warning"
            showIcon
            message="尚未指定监控对象"
            description="请先从按表配置页面选择数据表，再创建质量监控。"
            action={
              <Button
                size="small"
                onClick={() => history.push('/data-quality/table-config')}
              >
                返回按表配置
              </Button>
            }
          />
        )}
        {dataSourceId && dataSourceName ? (
          <div className="mt-2 text-[11px] text-[#98a2b3]">
            已关联 {dataSourceName}，数据库与 Schema 路径自动继承。
          </div>
        ) : null}
      </EditorField>

      <EditorField
        label="数据范围"
        hint="仅填写 WHERE 后的条件；留空时检查整张表。"
      >
        <Form.Item name="whereClause" className="!mb-0">
          <Input.TextArea
            variant="filled"
            rows={4}
            maxLength={4000}
            showCount
            placeholder="例如：dt = '${bizdate}' AND status = 1"
          />
        </Form.Item>
      </EditorField>

      <EditorField label="监控描述">
        <Form.Item name="description" className="!mb-0">
          <Input.TextArea
            variant="filled"
            rows={4}
            maxLength={500}
            showCount
            placeholder="请说明监控目的、质量要求和异常处理方式"
          />
        </Form.Item>
      </EditorField>

      <EditorField label="启用状态">
        <div className="flex min-h-12 items-center justify-between rounded-lg bg-[#f5f5f6] px-3 py-2">
          <div>
            <div className="text-[13px] font-medium text-[#344054]">
              创建后立即启用
            </div>
            <div className="mt-0.5 text-[11px] text-[#98a2b3]">
              停用后调度不会运行，仍可保留全部配置。
            </div>
          </div>
          <Form.Item name="enabled" valuePropName="checked" className="!mb-0">
            <Switch />
          </Form.Item>
        </div>
      </EditorField>
    </div>
  </EditorSection>
);

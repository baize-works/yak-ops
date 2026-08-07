import {
  Alert,
  Button,
  Drawer,
  Form,
  Input,
  InputNumber,
  Select,
  Space,
} from 'antd';
import { useEffect } from 'react';
import type {
  ComparisonOperator,
  SaveCustomTemplatePayload,
  TemplateFolderView,
  TemplateView,
} from '../types';

type DrawerMode = 'create' | 'edit';

interface CustomTemplateDrawerProps {
  open: boolean;
  mode: DrawerMode;
  template?: TemplateView;
  folders: TemplateFolderView[];
  defaultFolderId?: number;
  submitting?: boolean;
  onClose: () => void;
  onSubmit: (payload: SaveCustomTemplatePayload) => void;
}

type FormValues = SaveCustomTemplatePayload;

const DIMENSIONS = [
  '完整性',
  '唯一性',
  '有效性',
  '准确性',
  '一致性',
  '及时性',
  '规范性',
  '自定义',
];

const OPERATORS: Array<{
  value: ComparisonOperator;
  label: string;
}> = [
  { value: 'GT', label: '大于（>）' },
  { value: 'GTE', label: '大于等于（>=）' },
  { value: 'EQ', label: '等于（=）' },
  { value: 'LTE', label: '小于等于（<=）' },
  { value: 'LT', label: '小于（<）' },
  { value: 'BETWEEN', label: '区间' },
];

const parseDefaults = (schema?: string) => {
  try {
    return schema ? JSON.parse(schema) : {};
  } catch {
    return {};
  }
};

const folderOptions = (folders: TemplateFolderView[]) => {
  const children = new Map<number | undefined, TemplateFolderView[]>();
  folders.forEach((folder) => {
    const items = children.get(folder.parentId) || [];
    items.push(folder);
    children.set(folder.parentId, items);
  });

  const result: Array<{ value: number; label: string }> = [];
  const walk = (parentId: number | undefined, depth: number) => {
    (children.get(parentId) || []).forEach((folder) => {
      result.push({
        value: folder.id,
        label: `${'　'.repeat(depth)}${folder.name}`,
      });
      walk(folder.id, depth + 1);
    });
  };
  walk(undefined, 0);
  return result;
};

const CustomTemplateDrawer = ({
  open,
  mode,
  template,
  folders,
  defaultFolderId,
  submitting,
  onClose,
  onSubmit,
}: CustomTemplateDrawerProps) => {
  const [form] = Form.useForm<FormValues>();
  const operator = Form.useWatch('defaultOperator', form);

  useEffect(() => {
    if (!open) return;
    const defaults = parseDefaults(template?.parameterSchema);
    form.setFieldsValue({
      name: template?.name || '',
      description: template?.description || '',
      dimension: template?.dimension || '自定义',
      folderId: template?.folderId || defaultFolderId,
      setFlag: template?.setFlag || '',
      checkType: 'NUMERIC',
      checkMethod: 'FIXED_VALUE',
      customSql:
        template?.templateSql
        || 'SELECT COUNT(*) AS metric_value FROM ${tableName} WHERE ${where}',
      defaultOperator: defaults.defaultOperator || 'EQ',
      defaultThreshold: defaults.defaultThreshold ?? 0,
      defaultThresholdEnd: defaults.defaultThresholdEnd,
    });
  }, [defaultFolderId, form, open, template]);

  return (
    <Drawer
      width={620}
      title={
        mode === 'create'
          ? '新建自定义规则模板'
          : '编辑自定义规则模板'
      }
      open={open}
      onClose={onClose}
      destroyOnClose
      footer={
        <div className="flex justify-end gap-2">
          <Button onClick={onClose}>取消</Button>
          <Button
            type="primary"
            loading={submitting}
            onClick={() => form.validateFields().then(onSubmit)}
          >
            {mode === 'create' ? '创建模板' : '保存修改'}
          </Button>
        </div>
      }
    >
      <Alert
        type="info"
        showIcon
        className="mb-5"
        message="自定义模板当前支持单条只读 SELECT，查询结果必须为一行一列的数值。模板修改只影响后续引用，不会改变已有质量规则。"
      />

      <Form<FormValues>
        form={form}
        layout="vertical"
        requiredMark="optional"
        initialValues={{
          dimension: '自定义',
          checkType: 'NUMERIC',
          checkMethod: 'FIXED_VALUE',
          defaultOperator: 'EQ',
          defaultThreshold: 0,
        }}
      >
        <Form.Item
          label="模板名称"
          name="name"
          rules={[
            {
              required: true,
              whitespace: true,
              message: '请输入模板名称',
            },
          ]}
        >
          <Input
            variant="filled"
            maxLength={100}
            placeholder="请输入自定义模板名称"
          />
        </Form.Item>

        <div className="grid grid-cols-2 gap-4">
          <Form.Item
            label="质量维度"
            name="dimension"
            rules={[{ required: true }]}
          >
            <Select
              variant="filled"
              options={DIMENSIONS.map((value) => ({
                value,
                label: value,
              }))}
            />
          </Form.Item>
          <Form.Item label="目标文件夹" name="folderId">
            <Select
              allowClear
              variant="filled"
              placeholder="根目录"
              options={folderOptions(folders)}
            />
          </Form.Item>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Form.Item
            label="校验类型"
            name="checkType"
            rules={[{ required: true }]}
          >
            <Select
              variant="filled"
              disabled
              options={[{ value: 'NUMERIC', label: '数值型' }]}
            />
          </Form.Item>
          <Form.Item
            label="校验方式"
            name="checkMethod"
            rules={[{ required: true }]}
          >
            <Select
              variant="filled"
              disabled
              options={[
                { value: 'FIXED_VALUE', label: '与固定值比较' },
              ]}
            />
          </Form.Item>
        </div>

        <Form.Item
          label="Set Flag"
          name="setFlag"
          extra="多条前置 set 语句使用英文逗号分隔，不要添加分号。当前版本仅保存该配置，执行器暂不下发 Set Flag。"
        >
          <Input.TextArea
            variant="filled"
            rows={2}
            maxLength={1000}
            placeholder="例如：set spark.sql.shuffle.partitions=10"
          />
        </Form.Item>

        <Form.Item
          label="自定义 SQL"
          name="customSql"
          rules={[
            {
              required: true,
              whitespace: true,
              message: '请输入自定义 SQL',
            },
          ]}
          extra="可使用 ${tableName} 表示目标表，也支持 ${table}、${column}、${where}。"
        >
          <Input.TextArea
            variant="filled"
            rows={8}
            maxLength={20000}
            placeholder="SELECT COUNT(*) AS metric_value FROM ${tableName} WHERE ${where}"
            className="font-mono"
          />
        </Form.Item>

        <Form.Item label="默认比较条件" required>
          <Space.Compact block>
            <Form.Item
              name="defaultOperator"
              noStyle
              rules={[{ required: true }]}
            >
              <Select
                className="w-[190px]"
                variant="filled"
                options={OPERATORS}
              />
            </Form.Item>
            <Form.Item
              name="defaultThreshold"
              noStyle
              rules={[
                {
                  required: true,
                  message: '请输入默认阈值',
                },
              ]}
            >
              <InputNumber
                className="!w-full"
                variant="filled"
                placeholder="默认阈值"
              />
            </Form.Item>
            {operator === 'BETWEEN' ? (
              <Form.Item
                name="defaultThresholdEnd"
                noStyle
                rules={[
                  {
                    required: true,
                    message: '请输入区间最大值',
                  },
                ]}
              >
                <InputNumber
                  className="!w-full"
                  variant="filled"
                  placeholder="区间最大值"
                />
              </Form.Item>
            ) : null}
          </Space.Compact>
        </Form.Item>

        <Form.Item label="模板描述" name="description">
          <Input.TextArea
            variant="filled"
            rows={3}
            maxLength={500}
            placeholder="说明模板用途、指标口径及适用范围"
          />
        </Form.Item>
      </Form>
    </Drawer>
  );
};

export default CustomTemplateDrawer;

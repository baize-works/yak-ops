import { API_SUCCESS_CODE } from '@/services/http/response';
import { InfoCircleOutlined, LoadingOutlined } from '@ant-design/icons';
import { useIntl } from '@umijs/max';
import {
  Button,
  Form,
  Input,
  InputNumber,
  message,
  Select,
  Switch,
  Tooltip,
} from 'antd';
import TextArea from 'antd/es/input/TextArea';
import { Code2, FlaskConical, ShieldCheck } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  fetchDataSourcePluginConfig,
  installDataSourcePlugin,
} from '../../service';
import type {
  DynamicDataSourceFormProps,
  DynamicFormField,
} from '../../types';
import { DataSourceOperateType } from '../../types';
import DatabaseIcons from '../../icon/DatabaseIcons';
import CustomKVList from './components/CustomKVList';
import DriverLocationField from './components/DriverLocationField';
import { getConfigInitialValues, transformRules } from './utils/formUtils';

const DEFAULT_ENVIRONMENT = 'DEVELOP';

const DATASOURCE_NAME_PRESETS = [
  '认真搬砖的数据源',
  '稳稳接住数据的同学',
  '准点上班的数据源',
  '连接世界的小桥',
  '数据同步小能手',
  '稳定发挥的数据源',
];

const DATASOURCE_REMARK_PRESETS = [
  '负责把数据稳稳接住，偶尔也想早点下班。',
  '一个朴素但可靠的数据入口，主打稳定发挥。',
  '数据从这里出发，去往更需要它的地方。',
  '主打一个稳定、清晰、少出幺蛾子。',
  '用于承载当前业务数据连接配置。',
  '连接参数准备好后，就可以开始认真干活了。',
];

const ENV_OPTIONS = [
  {
    value: 'DEVELOP',
    label: (
      <div className="flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
          <Code2 size={13} />
        </span>
        <span className="text-[13px] font-medium text-slate-700">开发环境</span>
      </div>
    ),
  },
  {
    value: 'TEST',
    label: (
      <div className="flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
          <FlaskConical size={13} />
        </span>
        <span className="text-[13px] font-medium text-slate-700">测试环境</span>
      </div>
    ),
  },
  {
    value: 'PROD',
    label: (
      <div className="flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
          <ShieldCheck size={13} />
        </span>
        <span className="text-[13px] font-medium text-slate-700">生产环境</span>
      </div>
    ),
  },
];

const sectionTitleClass = 'm-0 text-[15px] font-semibold text-slate-800';
const sectionDescClass = 'mb-0 mt-1 text-[13px] leading-[22px] text-slate-500';

const pickRandomPreset = (values: string[]) =>
  values[Math.floor(Math.random() * values.length)];

const isEmptyValue = (value: unknown) =>
  value === undefined || value === null || value === '';

const DynamicDataSourceForm = ({
  dbType,
  form,
  configForm,
  operateType,
  initialConfig,
}: DynamicDataSourceFormProps) => {
  const intl = useIntl();
  const [formConfig, setFormConfig] = useState<DynamicFormField[]>([]);
  const [loading, setLoading] = useState(false);
  const [needInstall, setNeedInstall] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [loadErrMsg, setLoadErrMsg] = useState('');
  const requestSeqRef = useRef(0);

  const defaultBaseInfo = useMemo(
    () => ({
      name: pickRandomPreset(DATASOURCE_NAME_PRESETS),
      environment: DEFAULT_ENVIRONMENT,
      remark: pickRandomPreset(DATASOURCE_REMARK_PRESETS),
    }),
    [],
  );

  useEffect(() => {
    if (operateType !== DataSourceOperateType.Create) return;
    const current = form.getFieldsValue(true);
    const patch: Record<string, unknown> = {};
    if (isEmptyValue(current?.name)) patch.name = defaultBaseInfo.name;
    if (isEmptyValue(current?.environment)) {
      patch.environment = defaultBaseInfo.environment;
    }
    if (isEmptyValue(current?.remark)) patch.remark = defaultBaseInfo.remark;
    if (Object.keys(patch).length) form.setFieldsValue(patch);
  }, [defaultBaseInfo, form, operateType]);

  const loadFormConfig = useCallback(
    async (currentDbType: string) => {
      const requestSeq = requestSeqRef.current + 1;
      requestSeqRef.current = requestSeq;
      setLoading(true);
      setNeedInstall(false);
      setLoadErrMsg('');
      setFormConfig([]);
      configForm.resetFields();

      try {
        const response = await fetchDataSourcePluginConfig(currentDbType);
        if (requestSeq !== requestSeqRef.current) return;

        if (response.code !== API_SUCCESS_CODE) {
          setNeedInstall(true);
          setLoadErrMsg(
            response.msg || response.message || '数据源插件配置暂不可用',
          );
          return;
        }

        const data = response.data || { formFields: [] };
        if (data.installRequired) {
          setNeedInstall(true);
          setLoadErrMsg(data.installHint || '请先安装数据源插件');
          return;
        }

        const fields = data.formFields || [];
        setFormConfig(fields);
        const defaults = getConfigInitialValues(fields);
        configForm.setFieldsValue({
          ...defaults,
          ...(initialConfig || {}),
        });
      } catch (error) {
        if (requestSeq !== requestSeqRef.current) return;
        setNeedInstall(true);
        setLoadErrMsg(
          error instanceof Error
            ? error.message
            : intl.formatMessage({
                id: 'pages.datasource.form.loadConfigFail',
                defaultMessage: 'Failed to load form config',
              }),
        );
      } finally {
        if (requestSeq === requestSeqRef.current) setLoading(false);
      }
    },
    [configForm, initialConfig, intl],
  );

  useEffect(() => {
    if (!dbType) {
      requestSeqRef.current += 1;
      setFormConfig([]);
      setNeedInstall(false);
      setLoadErrMsg('');
      setLoading(false);
      configForm.resetFields();
      return undefined;
    }

    void loadFormConfig(dbType);
    return () => {
      requestSeqRef.current += 1;
    };
  }, [configForm, dbType, loadFormConfig]);

  const installPlugin = async () => {
    if (!dbType || installing) return;
    try {
      setInstalling(true);
      const response = await installDataSourcePlugin(dbType);
      if (response.code !== API_SUCCESS_CODE) return;
      message.success('插件安装成功');
      await loadFormConfig(dbType);
    } finally {
      setInstalling(false);
    }
  };

  const validateField = (key: string) => {
    window.setTimeout(() => {
      void configForm.validateFields([key]).catch(() => undefined);
    }, 0);
  };

  const renderFormItem = (field: DynamicFormField) => {
    if (field.key === 'driverLocation') {
      return (
        <DriverLocationField
          field={field}
          dbType={dbType}
          configForm={configForm}
        />
      );
    }

    switch (field.type) {
      case 'PASSWORD':
        return (
          <Input.Password
            placeholder={field.placeholder}
            onChange={() => validateField(field.key)}
          />
        );
      case 'SELECT':
        return (
          <Select
            placeholder={field.placeholder}
            options={field.options}
            onChange={() => validateField(field.key)}
          />
        );
      case 'NUMBER':
        return (
          <InputNumber
            className="!w-full"
            placeholder={field.placeholder}
            onChange={() => validateField(field.key)}
          />
        );
      case 'SWITCH':
        return <Switch onChange={() => validateField(field.key)} />;
      case 'TEXTAREA':
        return (
          <Input.TextArea
            rows={4}
            placeholder={field.placeholder}
            onChange={() => validateField(field.key)}
          />
        );
      default:
        return (
          <Input
            placeholder={field.placeholder}
            onChange={() => validateField(field.key)}
          />
        );
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[220px] items-center justify-center rounded-2xl border border-[#E8EDF3] bg-[#FCFDFE] p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <div className="flex items-center gap-2.5 text-sm text-slate-500">
          <LoadingOutlined />
          <span>正在加载数据源配置...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[#E8EDF3] bg-[#FCFDFE] p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <div className="mb-5">
        <h3 className={sectionTitleClass}>数据源信息</h3>
        <p className={sectionDescClass}>
          先填写基础信息，再补充当前数据源类型对应的连接参数。
        </p>
      </div>

      <Form form={form} layout="vertical">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Form.Item
            label={intl.formatMessage({
              id: 'pages.datasource.form.dsName',
              defaultMessage: 'DS Name',
            })}
            name="name"
            rules={[
              {
                required: true,
                message: intl.formatMessage({
                  id: 'pages.datasource.form.dsNameRequired',
                  defaultMessage: 'DS Name is required',
                }),
              },
              { max: 128, message: '数据源名称不能超过 128 个字符' },
            ]}
          >
            <Input maxLength={128} placeholder="请输入数据源名称" />
          </Form.Item>

          <Form.Item
            label={
              <span className="inline-flex items-center">
                {intl.formatMessage({
                  id: 'pages.datasource.form.env',
                  defaultMessage: 'Env',
                })}
                <Tooltip title="数据源所属的部署环境">
                  <InfoCircleOutlined className="ml-1 text-slate-400" />
                </Tooltip>
              </span>
            }
            name="environment"
            rules={[{ required: true, message: '请选择数据源环境' }]}
          >
            <Select placeholder="请选择环境" options={ENV_OPTIONS} />
          </Form.Item>
        </div>

        <Form.Item
          label={intl.formatMessage({
            id: 'pages.datasource.form.description',
            defaultMessage: 'Description',
          })}
          name="remark"
          rules={[{ max: 500, message: '数据源备注不能超过 500 个字符' }]}
        >
          <TextArea maxLength={500} showCount rows={4} placeholder="请输入备注" />
        </Form.Item>

        {needInstall && (
          <div className="mb-5 rounded-xl border border-dashed border-[#D6E4FF] bg-[#F7FAFF] px-4 py-3.5">
            <div className="mb-2.5 text-[13px] leading-[22px] text-slate-600">
              当前插件配置暂不可用，请确认对应插件已经随服务部署。
            </div>
            {loadErrMsg && (
              <div className="mb-3 text-xs leading-5 text-slate-400">
                {loadErrMsg}
              </div>
            )}
            <Button
              loading={installing}
              onClick={() => void installPlugin()}
              className="!h-[38px] !rounded-[10px] !px-4"
            >
              <span className="inline-flex items-center gap-2">
                重新检测插件
                <span className="inline-flex items-center gap-1.5">
                  <span>({dbType})</span>
                  <DatabaseIcons dbType={dbType} height="18" width="18" />
                </span>
              </span>
            </Button>
          </div>
        )}

        <div className="mt-2 border-t border-[#EEF2F6] pt-[18px]">
          <div className="mb-4">
            <h3 className={sectionTitleClass}>连接参数</h3>
            <p className={sectionDescClass}>
              根据当前数据源类型自动渲染配置项；编辑时未修改的密码会安全沿用。
            </p>
          </div>

          <Form
            form={configForm}
            component={false}
            labelCol={{ flex: '110px' }}
            wrapperCol={{ flex: '1' }}
            labelAlign="left"
          >
            {formConfig.map((field) => {
              if (field.type === 'CUSTOM_SELECT') {
                return (
                  <CustomKVList key={field.key} intl={intl} field={field} />
                );
              }

              return (
                <Form.Item
                  key={field.key}
                  label={field.label}
                  name={field.key}
                  valuePropName={field.type === 'SWITCH' ? 'checked' : 'value'}
                  rules={transformRules(field.rules)}
                  validateTrigger={['onChange', 'onBlur']}
                  className="!mb-[18px]"
                >
                  {renderFormItem(field)}
                </Form.Item>
              );
            })}
          </Form>
        </div>
      </Form>
    </div>
  );
};

export default DynamicDataSourceForm;

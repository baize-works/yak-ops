import { API_SUCCESS_CODE } from '@/services/http/response';
import {
  InfoCircleOutlined,
  LoadingOutlined,
} from '@ant-design/icons';
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
import {
  Code2,
  FlaskConical,
  ShieldCheck,
} from 'lucide-react';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import DatabaseIcons from '../../icon/DatabaseIcons';
import {
  fetchDataSourcePluginConfig,
  installDataSourcePlugin,
} from '../../service';
import type {
  DynamicDataSourceFormProps,
  DynamicFormField,
} from '../../types';
import { DataSourceOperateType } from '../../types';
import CustomKVList from './components/CustomKVList';
import DriverLocationField from './components/DriverLocationField';
import {
  getConfigInitialValues,
  transformRules,
} from './utils/formUtils';

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
        <span
          className={[
            'flex h-5 w-5 items-center justify-center',
            'rounded-md bg-blue-50 text-blue-600',
          ].join(' ')}
        >
          <Code2 size={12} />
        </span>

        <span className="text-[13px] text-[#344054]">
          开发环境
        </span>
      </div>
    ),
  },
  {
    value: 'TEST',
    label: (
      <div className="flex items-center gap-2">
        <span
          className={[
            'flex h-5 w-5 items-center justify-center',
            'rounded-md bg-amber-50 text-amber-600',
          ].join(' ')}
        >
          <FlaskConical size={12} />
        </span>

        <span className="text-[13px] text-[#344054]">
          测试环境
        </span>
      </div>
    ),
  },
  {
    value: 'PROD',
    label: (
      <div className="flex items-center gap-2">
        <span
          className={[
            'flex h-5 w-5 items-center justify-center',
            'rounded-md bg-rose-50 text-rose-600',
          ].join(' ')}
        >
          <ShieldCheck size={12} />
        </span>

        <span className="text-[13px] text-[#344054]">
          生产环境
        </span>
      </div>
    ),
  },
];

const sectionTitleClass =
  'm-0 text-sm font-semibold leading-6 text-[#161823]';

const sectionDescriptionClass =
  'm-0 text-xs leading-5 text-[#8a8f99]';

const pickRandomPreset = (values: string[]) => {
  return values[
    Math.floor(Math.random() * values.length)
  ];
};

const isEmptyValue = (value: unknown) => {
  return (
    value === undefined ||
    value === null ||
    value === ''
  );
};

const DynamicDataSourceForm = ({
  dbType,
  form,
  configForm,
  operateType,
  initialConfig,
}: DynamicDataSourceFormProps) => {
  const intl = useIntl();

  const [formConfig, setFormConfig] = useState<
    DynamicFormField[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [needInstall, setNeedInstall] =
    useState(false);
  const [installing, setInstalling] =
    useState(false);
  const [loadErrMsg, setLoadErrMsg] =
    useState('');

  const requestSeqRef = useRef(0);

  const defaultBaseInfo = useMemo(
    () => ({
      name: pickRandomPreset(
        DATASOURCE_NAME_PRESETS,
      ),
      environment: DEFAULT_ENVIRONMENT,
      remark: pickRandomPreset(
        DATASOURCE_REMARK_PRESETS,
      ),
    }),
    [],
  );

  useEffect(() => {
    if (
      operateType !==
      DataSourceOperateType.Create
    ) {
      return;
    }

    const current =
      form.getFieldsValue(true);

    const patch: Record<string, unknown> = {};

    if (isEmptyValue(current?.name)) {
      patch.name = defaultBaseInfo.name;
    }

    if (isEmptyValue(current?.environment)) {
      patch.environment =
        defaultBaseInfo.environment;
    }

    if (isEmptyValue(current?.remark)) {
      patch.remark = defaultBaseInfo.remark;
    }

    if (Object.keys(patch).length > 0) {
      form.setFieldsValue(patch);
    }
  }, [
    defaultBaseInfo,
    form,
    operateType,
  ]);

  const loadFormConfig = useCallback(
    async (currentDbType: string) => {
      const requestSeq =
        requestSeqRef.current + 1;

      requestSeqRef.current = requestSeq;

      setLoading(true);
      setNeedInstall(false);
      setLoadErrMsg('');
      setFormConfig([]);

      configForm.resetFields();

      try {
        const response =
          await fetchDataSourcePluginConfig(
            currentDbType,
          );

        if (
          requestSeq !==
          requestSeqRef.current
        ) {
          return;
        }

        if (
          response.code !== API_SUCCESS_CODE
        ) {
          setNeedInstall(true);
          setLoadErrMsg(
            response.msg ||
              response.message ||
              '数据源插件配置暂不可用',
          );
          return;
        }

        const data = response.data || {
          formFields: [],
        };

        if (data.installRequired) {
          setNeedInstall(true);
          setLoadErrMsg(
            data.installHint ||
              '请先安装数据源插件',
          );
          return;
        }

        const fields =
          data.formFields || [];

        setFormConfig(fields);

        const defaults =
          getConfigInitialValues(fields);

        configForm.setFieldsValue({
          ...defaults,
          ...(initialConfig || {}),
        });
      } catch (error) {
        if (
          requestSeq !==
          requestSeqRef.current
        ) {
          return;
        }

        setNeedInstall(true);

        setLoadErrMsg(
          error instanceof Error
            ? error.message
            : intl.formatMessage({
                id: 'pages.datasource.form.loadConfigFail',
                defaultMessage:
                  '数据源配置加载失败',
              }),
        );
      } finally {
        if (
          requestSeq ===
          requestSeqRef.current
        ) {
          setLoading(false);
        }
      }
    },
    [
      configForm,
      initialConfig,
      intl,
    ],
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
  }, [
    configForm,
    dbType,
    loadFormConfig,
  ]);

  const installPlugin = async () => {
    if (!dbType || installing) return;

    try {
      setInstalling(true);

      const response =
        await installDataSourcePlugin(dbType);

      if (
        response.code !== API_SUCCESS_CODE
      ) {
        return;
      }

      message.success('插件安装成功');

      await loadFormConfig(dbType);
    } finally {
      setInstalling(false);
    }
  };

  const validateField = (key: string) => {
    window.setTimeout(() => {
      void configForm
        .validateFields([key])
        .catch(() => undefined);
    }, 0);
  };

  const renderFormItem = (
    field: DynamicFormField,
  ) => {
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
            variant="filled"
            placeholder={field.placeholder}
            onChange={() =>
              validateField(field.key)
            }
          />
        );

      case 'SELECT':
        return (
          <Select
            variant="filled"
            placeholder={field.placeholder}
            options={field.options}
            onChange={() =>
              validateField(field.key)
            }
          />
        );

      case 'NUMBER':
        return (
          <InputNumber
            variant="filled"
            className="!w-full"
            placeholder={field.placeholder}
            onChange={() =>
              validateField(field.key)
            }
          />
        );

      case 'SWITCH':
        return (
          <Switch
            onChange={() =>
              validateField(field.key)
            }
          />
        );

      case 'TEXTAREA':
        return (
          <Input.TextArea
            variant="filled"
            rows={2}
            placeholder={field.placeholder}
            onChange={() =>
              validateField(field.key)
            }
          />
        );

      default:
        return (
          <Input
            variant="filled"
            placeholder={field.placeholder}
            onChange={() =>
              validateField(field.key)
            }
          />
        );
    }
  };

  if (loading) {
    return (
      <div
        className={[
          'flex min-h-[160px] items-center justify-center',
          'rounded-lg border border-[#eef0f3] bg-[#fafbfc]',
        ].join(' ')}
      >
        <div className="flex items-center gap-2 text-sm text-[#8a8f99]">
          <LoadingOutlined />
          <span>
            正在加载数据源配置...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white">
      <section>
        <div className="mb-3 flex items-end justify-between gap-4">
          <div>
            <h3 className={sectionTitleClass}>
              基础信息
            </h3>

            <p
              className={
                sectionDescriptionClass
              }
            >
              设置数据源名称和所属环境
            </p>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-[#8a8f99]">
            <DatabaseIcons
              dbType={dbType}
              width="15"
              height="15"
            />
            <span>{dbType}</span>
          </div>
        </div>

        <Form
          form={form}
          layout="vertical"
          colon={false}
          requiredMark
        >
          <div className="grid grid-cols-1 gap-x-4 md:grid-cols-2">
            <Form.Item
              className="!mb-3"
              label={intl.formatMessage({
                id: 'pages.datasource.form.dsName',
                defaultMessage: '数据源名称',
              })}
              name="name"
              rules={[
                {
                  required: true,
                  message:
                    intl.formatMessage({
                      id: 'pages.datasource.form.dsNameRequired',
                      defaultMessage:
                        '请输入数据源名称',
                    }),
                },
                {
                  max: 128,
                  message:
                    '数据源名称不能超过 128 个字符',
                },
              ]}
            >
              <Input
                variant="filled"
                maxLength={128}
                placeholder="请输入数据源名称"
              />
            </Form.Item>

            <Form.Item
              className="!mb-3"
              label={
                <span className="inline-flex items-center">
                  {intl.formatMessage({
                    id: 'pages.datasource.form.env',
                    defaultMessage:
                      '运行环境',
                  })}

                  <Tooltip title="数据源所属的部署环境">
                    <InfoCircleOutlined className="ml-1 text-[#98a2b3]" />
                  </Tooltip>
                </span>
              }
              name="environment"
              rules={[
                {
                  required: true,
                  message:
                    '请选择数据源环境',
                },
              ]}
            >
              <Select
                variant="filled"
                placeholder="请选择环境"
                options={ENV_OPTIONS}
              />
            </Form.Item>
          </div>

          <Form.Item
            className="!mb-0"
            label={intl.formatMessage({
              id: 'pages.datasource.form.description',
              defaultMessage: '备注',
            })}
            name="remark"
            rules={[
              {
                max: 500,
                message:
                  '数据源备注不能超过 500 个字符',
              },
            ]}
          >
            <Input.TextArea
              variant="filled"
              maxLength={500}
              rows={2}
              placeholder="请输入数据源备注"
            />
          </Form.Item>
        </Form>
      </section>

      {needInstall && (
        <div
          className={[
            'mt-4 rounded-lg border border-dashed border-[#d6e4ff]',
            'bg-[#f7faff] px-3.5 py-3',
          ].join(' ')}
        >
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="text-[13px] leading-5 text-[#475467]">
                当前插件配置暂不可用，请确认对应插件已经随服务部署。
              </div>

              {loadErrMsg && (
                <div className="mt-1 truncate text-xs text-[#98a2b3]">
                  {loadErrMsg}
                </div>
              )}
            </div>

            <Button
              size="small"
              loading={installing}
              className="shrink-0"
              onClick={() =>
                void installPlugin()
              }
            >
              <span className="inline-flex items-center gap-1.5">
                重新检测
                <DatabaseIcons
                  dbType={dbType}
                  height="15"
                  width="15"
                />
              </span>
            </Button>
          </div>
        </div>
      )}

      <section className="mt-4 border-t border-[#eef0f3] pt-4">
        <div className="mb-3">
          <h3 className={sectionTitleClass}>
            连接参数
          </h3>

          <p
            className={
              sectionDescriptionClass
            }
          >
            填写当前数据源对应的连接信息
          </p>
        </div>

        <Form
          form={configForm}
          component={false}
          layout="vertical"
          colon={false}
          requiredMark
        >
          <div className="grid grid-cols-1 gap-x-4 md:grid-cols-2">
            {formConfig.map((field) => {
              if (
                field.type ===
                'CUSTOM_SELECT'
              ) {
                return (
                  <div
                    key={field.key}
                    className="md:col-span-2"
                  >
                    <CustomKVList
                      intl={intl}
                      field={field}
                    />
                  </div>
                );
              }

              const fullWidth =
                field.type ===
                  'TEXTAREA' ||
                field.key ===
                  'driverLocation';

              return (
                <Form.Item
                  key={field.key}
                  label={field.label}
                  name={field.key}
                  valuePropName={
                    field.type ===
                    'SWITCH'
                      ? 'checked'
                      : 'value'
                  }
                  rules={transformRules(
                    field.rules,
                    field.type,
                  )}
                  validateTrigger={[
                    'onChange',
                    'onBlur',
                  ]}
                  className={[
                    '!mb-3',
                    fullWidth
                      ? 'md:col-span-2'
                      : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  {renderFormItem(field)}
                </Form.Item>
              );
            })}
          </div>
        </Form>
      </section>
    </div>
  );
};

export default DynamicDataSourceForm;
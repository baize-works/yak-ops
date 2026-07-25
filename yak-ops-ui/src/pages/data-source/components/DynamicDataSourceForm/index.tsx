import HttpUtils from "@/utils/HttpUtils";
import {InfoCircleOutlined, LoadingOutlined} from "@ant-design/icons";
import {useIntl} from "@umijs/max";
import {Button, Form, Input, InputNumber, message, Select, Switch, Tooltip,} from "antd";
import TextArea from "antd/es/input/TextArea";
import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import DatabaseIcons from "../../icon/DatabaseIcons";
import {DataSourceOperateType, DynamicDataSourceFormProps} from "../../types";
import CustomKVList from "./components/CustomKVList";
import DriverLocationField from "./components/DriverLocationField";
import {getConfigInitialValues, transformRules} from "./utils/formUtils";

import {Code2, FlaskConical, ShieldCheck} from "lucide-react";

const DEFAULT_ENVIRONMENT = "DEVELOP";

const DATASOURCE_NAME_PRESETS = [
  "认真搬砖的数据源",
  "数据搬运小分队一号",
  "今天也在同步的数据源",
  "稳稳接住数据的同学",
  "不爱出错的数据入口",
  "数据高速路收费站",
  "勤勤恳恳的连接器",
  "准点上班的数据源",
  "低调但靠谱的数据源",
  "正在发光的数据源",
  "表格森林入口站",
  "数据宇宙传送门",
  "一只努力工作的数据源",
  "每天都很忙的数据源",
  "沉默但能干的数据源",
  "靠谱同步搭子",
  "数据流动观察员",
  "连接世界的小桥",
  "准时抵达的数据列车",
  "数据搬运界劳模",
  "不掉链子的数据源",
  "安静运行的小引擎",
  "专注搬运三十年",
  "数据同步小能手",
  "连接参数守门员",
  "数据湖边的小码头",
  "今日份数据入口",
  "稳定发挥的数据源",
  "打工人专属数据源",
  "平平无奇但很可靠",
];

const DATASOURCE_REMARK_PRESETS = [
  "负责把数据稳稳接住，偶尔也想早点下班。",
  "它看起来很安静，其实每天都在认真搬运数据。",
  "使命是把数据从这里送到那里，尽量不掉队。",
  "一个朴素但可靠的数据入口，主打稳定发挥。",
  "别看名字随意，干起活来一点都不含糊。",
  "连接建立后，它会默默开始自己的表演。",
  "今天的数据，也要整整齐齐地同步过去。",
  "专注连接与同步，顺便守护一点点秩序感。",
  "希望每一次连接测试，都能优雅地通过。",
  "数据从这里出发，去往更需要它的地方。",
  "一个认真工作的数据源，不声张，但靠谱。",
  "用来连接数据世界的一扇小门。",
  "别催，它已经在努力和数据库打招呼了。",
  "平时很低调，关键时候负责把数据送到位。",
  "如果数据也有旅程，这里就是出发站。",
  "主打一个稳定、清晰、少出幺蛾子。",
  "连接成功的那一刻，世界都顺滑了一点。",
  "负责让数据流动起来，也负责让人安心一点。",
  "一个不抢戏的数据源，但每一步都很重要。",
  "它的目标很简单：连得上、跑得稳、别迷路。",
  "用于承载当前业务数据连接配置，请温柔对待。",
  "当你看到它的时候，说明数据同步又近了一步。",
  "这是一条通往数据表的小路，建议保持畅通。",
  "负责和数据库保持友好沟通，尽量不吵架。",
  "配置不复杂，但意义很重大。",
  "它会记住连接信息，也会努力不辜负期待。",
  "一个为同步任务提供能量的数据入口。",
  "数据不会自己跑路，所以它来了。",
  "连接参数准备好后，就可以开始认真干活了。",
  "今日任务：把数据安全、稳定、漂亮地送达。",
];

const ENV_OPTIONS = [
  {
    value: "DEVELOP",
    label: (
      <div className="flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
          <Code2 size={13}/>
        </span>
        <span className="text-[13px] font-medium text-slate-700">开发环境</span>
      </div>
    ),
  },
  {
    value: "TEST",
    label: (
      <div className="flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
          <FlaskConical size={13}/>
        </span>
        <span className="text-[13px] font-medium text-slate-700">测试环境</span>
      </div>
    ),
  },
  {
    value: "PROD",
    label: (
      <div className="flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
          <ShieldCheck size={13}/>
        </span>
        <span className="text-[13px] font-medium text-slate-700">生产环境</span>
      </div>
    ),
  },
];

const sectionTitleClass = "m-0 text-[15px] font-semibold text-slate-800";
const sectionDescClass = "mt-1 mb-0 text-[13px] leading-[22px] text-slate-500";

const pickRandomPreset = (list: string[]) => {
  return list[Math.floor(Math.random() * list.length)];
};

const isEmptyValue = (value: any) => {
  return value === undefined || value === null || value === "";
};

const isCreateOperateType = (operateType?: DataSourceOperateType) => {
  return (
    operateType === ("CREATE" as DataSourceOperateType) ||
    operateType === (DataSourceOperateType as any)?.Create
  );
};

const DynamicDataSourceForm: React.FC<DynamicDataSourceFormProps> = ({
                                                                       dbType,
                                                                       form,
                                                                       configForm,
                                                                       operateType,
                                                                       initialConfig,
                                                                     }) => {
  const intl = useIntl();

  const [formConfig, setFormConfig] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const [needInstall, setNeedInstall] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [loadErrMsg, setLoadErrMsg] = useState<string>("");

  /**
   * 用请求序号解决“慢一拍”的问题。
   * 比如先请求 MySQL，再请求 PostgreSQL。
   * 如果 MySQL 后返回，不能再覆盖 PostgreSQL 的表单。
   */
  const requestSeqRef = useRef(0);

  const defaultBaseInfo = useMemo(() => {
    return {
      name: pickRandomPreset(DATASOURCE_NAME_PRESETS),
      environment: DEFAULT_ENVIRONMENT,
      remark: pickRandomPreset(DATASOURCE_REMARK_PRESETS),
    };
  }, []);

  const fillCreateDefaultBaseInfo = useCallback(() => {
    if (!isCreateOperateType(operateType)) {
      return;
    }

    const current = form.getFieldsValue(true);
    const patch: Record<string, any> = {};

    if (isEmptyValue(current?.name)) {
      patch.name = defaultBaseInfo.name;
    }

    if (isEmptyValue(current?.environment)) {
      patch.environment = defaultBaseInfo.environment;
    }

    if (isEmptyValue(current?.remark)) {
      patch.remark = defaultBaseInfo.remark;
    }

    if (Object.keys(patch).length) {
      form.setFieldsValue(patch);
    }
  }, [operateType, form, defaultBaseInfo]);

  const loadFormConfig = useCallback(
    async (currentDbType: string): Promise<void> => {
      const requestSeq = requestSeqRef.current + 1;
      requestSeqRef.current = requestSeq;

      try {
        setLoading(true);
        setNeedInstall(false);
        setLoadErrMsg("");

        /**
         * 切换 dbType 时，先把旧字段清掉。
         * 否则 PostgreSQL 配置请求还没回来时，页面可能短暂显示 MySQL 字段。
         */
        setFormConfig([]);
        configForm.resetFields();

        const response = await HttpUtils.get<any>(
          `/api/v1/data-source/plugin/config?pluginType=${currentDbType}`
        );

        /**
         * 只允许最新请求更新页面。
         * 旧请求回来直接丢弃。
         */
        if (requestSeq !== requestSeqRef.current) {
          return;
        }

        if (response?.code === 0) {
          const data = response?.data || {};

          // 检查是否需要安装插件
          if (data.installRequired) {
            setNeedInstall(true);
            setLoadErrMsg(data.installHint || "请先安装数据源插件");
            setFormConfig([]);
            configForm.resetFields();
            return;
          }

          const fields = data.formFields || [];

          setNeedInstall(false);
          setLoadErrMsg("");
          setFormConfig(fields);

          /**
           * 注意：
           * 这里不要用"只 patch 空值"的方式。
           * 因为 MySQL 和 PostgreSQL 有很多同名字段，例如 host、port、user、password。
           * 切换类型时应该以当前 dbType 的默认值为准。
           */
          const init = getConfigInitialValues(fields);
          configForm.resetFields();

          /**
           * 编辑模式：使用传入的 initialConfig 覆盖默认值
           * 创建模式：使用表单的默认值
           */
          if (initialConfig && Object.keys(initialConfig).length > 0) {
            configForm.setFieldsValue({
              ...init,
              ...initialConfig,
            });
          } else {
            configForm.setFieldsValue(init);
          }
          return;
        }

        setNeedInstall(true);
        setLoadErrMsg(
          response?.msg || response?.message || "Plugin config not available"
        );
        setFormConfig([]);
        configForm.resetFields();
      } catch (error: any) {
        if (requestSeq !== requestSeqRef.current) {
          return;
        }

        setNeedInstall(true);
        setLoadErrMsg(
          error?.message ||
          intl.formatMessage({
            id: "pages.datasource.form.loadConfigFail",
            defaultMessage: "Failed to load form config",
          })
        );
        setFormConfig([]);
        configForm.resetFields();
      } finally {
        if (requestSeq === requestSeqRef.current) {
          setLoading(false);
        }
      }
    },
    [configForm, intl]
  );

  useEffect(() => {
    fillCreateDefaultBaseInfo();
  }, [fillCreateDefaultBaseInfo]);

  useEffect(() => {
    if (!dbType) {
      requestSeqRef.current += 1;
      setFormConfig([]);
      setNeedInstall(false);
      setLoadErrMsg("");
      setLoading(false);
      configForm.resetFields();
      return;
    }

    loadFormConfig(dbType);

    return () => {
      /**
       * 组件卸载或 dbType 变化时，让旧请求失效。
       */
      requestSeqRef.current += 1;
    };
  }, [dbType, configForm, loadFormConfig]);

  const installPlugin = async () => {
    if (!dbType) {
      message.warning("请先选择数据源类型");
      return;
    }

    try {
      setInstalling(true);

      const resp = await HttpUtils.post<any>(
        `/api/v1/data-source/plugin/config/install?pluginType=${dbType}`,
        {}
      );

      if (resp?.code === 0) {
        message.success("插件安装成功");
        await loadFormConfig(dbType);
        return;
      }

    } catch (e: any) {
    } finally {
      setInstalling(false);
    }
  };

  const renderFormItem = (field: any): React.ReactNode => {
    const commonProps = {
      placeholder: field.placeholder,
      onChange: () => {
        setTimeout(() => {
          configForm.validateFields([field.key]).catch(() => {
          });
        }, 0);
      },
    };

    if (field.key === "driverLocation") {
      return (
        <DriverLocationField
          field={field}
          dbType={dbType}
          configForm={configForm}
        />
      );
    }

    switch (field.type) {
      case "INPUT":
        return <Input {...commonProps} />;

      case "PASSWORD":
        return <Input.Password {...commonProps} />;

      case "SELECT":
        return (
          <Select {...commonProps}>
            {field.options?.map((option: any) => (
              <Select.Option key={option.value} value={option.value}>
                {option.label}
              </Select.Option>
            ))}
          </Select>
        );

      case "NUMBER":
        return <InputNumber {...commonProps} className="!w-full"/>;

      case "SWITCH":
        return <Switch {...commonProps} />;

      case "TEXTAREA":
        return <Input.TextArea rows={4} {...commonProps} />;

      default:
        return <Input {...commonProps} />;
    }
  };

  if (loading) {
    return (
      <div
        className="flex min-h-[220px] items-center justify-center rounded-2xl border border-[#E8EDF3] bg-[#FCFDFE] p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <div className="flex items-center gap-2.5 text-sm text-slate-500">
          <LoadingOutlined/>
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
              id: "pages.datasource.form.dsName",
              defaultMessage: "DS Name",
            })}
            name="name"
            rules={[
              {
                required: true,
                message: intl.formatMessage({
                  id: "pages.datasource.form.dsNameRequired",
                  defaultMessage: "DS Name is required",
                }),
              },
            ]}
          >
            <Input
              placeholder={intl.formatMessage({
                id: "pages.datasource.form.inputPlaceholder",
                defaultMessage: "Input...",
              })}
              maxLength={100}
            />
          </Form.Item>

          <Form.Item
            label={
              <span className="inline-flex items-center">
                {intl.formatMessage({
                  id: "pages.datasource.form.env",
                  defaultMessage: "Env",
                })}
                <Tooltip title="Deployment environment of the datasource">
                  <InfoCircleOutlined className="ml-1 text-slate-400"/>
                </Tooltip>
              </span>
            }
            name="environment"
            rules={[
              {
                required: true,
                message: intl.formatMessage({
                  id: "pages.datasource.form.envRequired",
                  defaultMessage: "Env is required",
                }),
              },
            ]}
          >
            <Select
              placeholder={intl.formatMessage({
                id: "pages.datasource.form.selectPlaceholder",
                defaultMessage: "Select...",
              })}
              options={ENV_OPTIONS}
            />
          </Form.Item>
        </div>

        <Form.Item
          label={intl.formatMessage({
            id: "pages.datasource.form.description",
            defaultMessage: "Description",
          })}
          name="remark"
        >
          <TextArea
            placeholder={intl.formatMessage({
              id: "pages.datasource.form.inputPlaceholder",
              defaultMessage: "Input...",
            })}
            rows={4}
          />
        </Form.Item>

        <Form.Item name="connectionParams" hidden>
          <Input type="hidden"/>
        </Form.Item>

        {needInstall && (
          <div className="mb-5 rounded-xl border border-dashed border-[#D6E4FF] bg-[#F7FAFF] px-4 py-3.5">
            <div className="mb-2.5 text-[13px] leading-[22px] text-slate-600">
              当前插件配置暂不可用，可能尚未安装。请先安装对应插件后，再继续填写连接参数。
            </div>

            {loadErrMsg ? (
              <div className="mb-3 text-xs leading-5 text-slate-400">
                {loadErrMsg}
              </div>
            ) : null}

            <Button
              type="default"
              loading={installing}
              onClick={installPlugin}
              className="!h-[38px] !rounded-[10px] !px-4"
            >
              <span className="inline-flex items-center gap-2">
                <span>
                  {intl.formatMessage({
                    id: "pages.datasource.form.installPlugin",
                    defaultMessage: "Install Plugin",
                  })}
                </span>

                <span className="inline-flex items-center gap-1.5">
                  <span>({dbType})</span>
                  <DatabaseIcons dbType={dbType} height="18" width="18"/>
                </span>
              </span>
            </Button>
          </div>
        )}

        <div className="mt-2 border-t border-[#EEF2F6] pt-[18px]">
          <div className="mb-4">
            <h3 className={sectionTitleClass}>连接参数</h3>
            <p className={sectionDescClass}>
              根据当前数据源类型自动渲染配置项，建议优先填写必填字段。
            </p>
          </div>

          <Form
            form={configForm}
            component={false}
            labelCol={{flex: "110px"}}
            wrapperCol={{flex: "1"}}
            labelAlign="left"
          >
            {formConfig.map((field) => {
              if (field.type === "CUSTOM_SELECT") {
                return (
                  <CustomKVList key={field.key} intl={intl} field={field}/>
                );
              }

              return (
                <Form.Item
                  key={field.key}
                  label={field.label}
                  name={field.key}
                  rules={transformRules(field?.rules)}
                  validateTrigger={["onChange", "onBlur"]}
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

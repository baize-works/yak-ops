import {useIntl} from '@umijs/max';
import {Button, Drawer, Form, Input, InputNumber, message, Select, Spin, Switch,} from 'antd';
import type {Rule} from 'antd/es/form';
import {ArrowLeft, Check, ChevronRight, FlaskConical, RadioTower, X,} from 'lucide-react';
import React, {forwardRef, useEffect, useImperativeHandle, useRef, useState,} from 'react';
import {fetchChannelTypes, saveChannel, testChannel,} from '../service';
import {
  AlarmOperateType,
  type AlarmChannelCommand,
  type AlarmChannelRecord,
  type AlarmModalOpenPayload,
  type AlarmModalRef,
  type ChannelFormValues,
  type ChannelTypeVO,
  type FormFieldConfig,
  type FormFieldRule,
} from '../types';

const {TextArea} = Input;

/**
 * 解析通道配置 JSON。
 */
function parseConfigJson(
  configJson?: string,
): Record<string, unknown> {
  if (!configJson) {
    return {};
  }

  try {
    const parsed = JSON.parse(configJson);

    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      !Array.isArray(parsed)
    ) {
      return parsed;
    }

    return {};
  } catch {
    return {};
  }
}

/**
 * 将后端动态表单校验规则转换为 Ant Design Form Rule。
 */
function toAntdRules(
  rules?: FormFieldRule[],
): Rule[] | undefined {
  if (!rules?.length) {
    return undefined;
  }

  return rules.map((item) => {
    const rule: Rule = {
      message: item.message,
    };

    if (item.required) {
      rule.required = true;
    }

    if (item.pattern) {
      rule.pattern = new RegExp(item.pattern);
    }

    if (item.min !== undefined) {
      rule.min = item.min;
    }

    if (item.max !== undefined) {
      rule.max = item.max;
    }

    return rule;
  });
}

/**
 * 根据后端下发的字段类型渲染表单控件。
 */
function renderFormControl(field: FormFieldConfig) {
  switch (field.type) {
    case 'PASSWORD':
      return (
        <Input.Password
          placeholder={field.placeholder}
          autoComplete="new-password"
        />
      );

    case 'SELECT':
      return (
        <Select
          allowClear
          placeholder={field.placeholder}
          options={field.options?.map((option) => ({
            label: option.label,
            value: option.value,
          }))}
        />
      );

    case 'CUSTOM_SELECT':
      return (
        <Select
          mode="tags"
          allowClear
          placeholder={field.placeholder}
          options={field.options?.map((option) => ({
            label: option.label,
            value: option.value,
          }))}
        />
      );

    case 'NUMBER':
      return (
        <InputNumber
          className="w-full"
          placeholder={field.placeholder}
        />
      );

    case 'SWITCH':
      return <Switch size="small"/>;

    case 'TEXTAREA':
      return (
        <TextArea
          placeholder={field.placeholder}
          autoSize={{
            minRows: 3,
            maxRows: 8,
          }}
        />
      );

    case 'INPUT':
    default:
      return (
        <Input placeholder={field.placeholder}/>
      );
  }
}

interface ChannelTypeSelectorProps {
  channelTypes: ChannelTypeVO[];
  loading: boolean;
  onSelect: (type: ChannelTypeVO) => void;
}

/**
 * 新建通道时的类型选择区域。
 */
const ChannelTypeSelector: React.FC<ChannelTypeSelectorProps> = ({
                                                                   channelTypes,
                                                                   loading,
                                                                   onSelect,
                                                                 }) => {
  return (
    <section>
      <div>
        <h3 className="m-0 text-sm font-semibold text-slate-950">
          选择通道类型
        </h3>

        <p className="m-0 mt-1 text-xs leading-5 text-slate-400">
          选择告警消息需要投递到的平台或服务。
        </p>
      </div>

      {!loading && channelTypes.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
            <RadioTower className="h-5 w-5"/>
          </div>

          <p className="m-0 mt-4 text-sm font-medium text-slate-600">
            暂无可用的通道类型
          </p>

          <p className="m-0 mt-2 text-xs text-slate-400">
            请检查告警通道 SPI 是否已经正确加载
          </p>
        </div>
      ) : (
        <div className="mt-5 divide-y divide-slate-100">
          {channelTypes.map((type) => {
            const displayName =
              type.displayName || type.channelType;

            return (
              <button
                key={type.channelType}
                type="button"
                onClick={() => onSelect(type)}
                className={[
                  'group flex w-full items-center gap-4',
                  'rounded-xl px-3 py-4 text-left',
                  'transition-all duration-200',
                  'hover:bg-slate-50',
                  'focus-visible:outline-none',
                  'focus-visible:ring-2',
                  'focus-visible:ring-slate-300',
                  'focus-visible:ring-offset-2',
                ].join(' ')}
              >
                <div
                  className={[
                    'flex h-10 w-10 shrink-0 items-center',
                    'justify-center rounded-xl bg-slate-100',
                    'text-sm font-semibold text-slate-600',
                    'transition-colors duration-200',
                    'group-hover:bg-white',
                    'group-hover:text-slate-950',
                  ].join(' ')}
                >
                  {displayName
                    .slice(0, 1)
                    .toUpperCase()}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="m-0 truncate text-sm font-semibold text-slate-900">
                    {displayName}
                  </p>

                  <p className="m-0 mt-1 text-xs text-slate-400">
                    {type.channelType}
                    <span className="mx-1.5">·</span>
                    {type.configFields?.length || 0}
                    个配置项
                  </p>
                </div>

                <ChevronRight
                  className={[
                    'h-4 w-4 shrink-0 text-slate-300',
                    'transition-all duration-200',
                    'group-hover:translate-x-0.5',
                    'group-hover:text-slate-600',
                  ].join(' ')}
                />
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
};

const AddOrEditChannelModal =
  forwardRef<AlarmModalRef>((_, ref) => {
    const intl = useIntl();

    const [basicForm] =
      Form.useForm<ChannelFormValues>();

    const [configForm] =
      Form.useForm<Record<string, unknown>>();

    const [open, setOpen] = useState(false);

    const [confirmLoading, setConfirmLoading] =
      useState(false);

    const [loadingTypes, setLoadingTypes] =
      useState(false);

    const [testing, setTesting] = useState(false);

    const [operateType, setOperateType] =
      useState<AlarmOperateType>(
        AlarmOperateType.Create,
      );

    const [currentRecord, setCurrentRecord] =
      useState<AlarmChannelRecord>();

    const [channelTypes, setChannelTypes] =
      useState<ChannelTypeVO[]>([]);

    const [selectedType, setSelectedType] =
      useState<ChannelTypeVO | null>(null);

    const [showFormStep, setShowFormStep] =
      useState(false);

    const successCallbackRef =
      useRef<(() => void) | undefined>();

    const isCreateMode =
      operateType === AlarmOperateType.Create;

    /**
     * 清空抽屉内部状态。
     */
    const resetState = () => {
      setCurrentRecord(undefined);
      setSelectedType(null);
      setShowFormStep(false);
      setConfirmLoading(false);
      setTesting(false);

      basicForm.resetFields();
      configForm.resetFields();
    };

    /**
     * 关闭抽屉。
     */
    const handleClose = () => {
      if (confirmLoading || testing) {
        return;
      }

      setOpen(false);
    };

    /**
     * 抽屉关闭动画完成后再清空表单。
     * 避免关闭过程中内容突然消失。
     */
    const handleAfterOpenChange = (
      nextOpen: boolean,
    ) => {
      if (!nextOpen) {
        resetState();
      }
    };

    /**
     * 获取后端 SPI 下发的通道类型。
     */
    const ensureChannelTypes =
      async (): Promise<ChannelTypeVO[]> => {
        if (channelTypes.length > 0) {
          return channelTypes;
        }

        setLoadingTypes(true);

        try {
          const res = await fetchChannelTypes();

          if (res?.code !== 0) {
            return [];
          }

          const list = Array.isArray(res.data)
            ? res.data
            : [];

          setChannelTypes(list);

          return list;
        } catch {
          return [];
        } finally {
          setLoadingTypes(false);
        }
      };

    useImperativeHandle(ref, () => ({
      open: async ({
                     operateType: nextOperateType,
                     currentRecord: nextRecord,
                     onSuccess,
                   }: AlarmModalOpenPayload) => {
        resetState();

        setOperateType(nextOperateType);
        setCurrentRecord(
          nextRecord as
            | AlarmChannelRecord
            | undefined,
        );

        successCallbackRef.current = onSuccess;

        setOpen(true);

        const types = await ensureChannelTypes();

        /**
         * 编辑模式直接进入配置表单。
         */
        if (
          nextOperateType ===
          AlarmOperateType.Edit &&
          nextRecord
        ) {
          const channelRecord =
            nextRecord as AlarmChannelRecord;

          const matchedType =
            types.find(
              (type) =>
                type.channelType ===
                channelRecord.channelType,
            ) || null;

          if (!matchedType) {
            message.error(
              '未找到该通道对应的通道类型',
            );

            setSelectedType(null);
            setShowFormStep(false);
            return;
          }

          setSelectedType(matchedType);
          setShowFormStep(true);

          basicForm.setFieldsValue({
            name: channelRecord.name || '',
            enabled: channelRecord.enabled !== 0,
            description:
              channelRecord.description || '',
          });

          configForm.setFieldsValue(
            parseConfigJson(
              channelRecord.configJson,
            ),
          );

          return;
        }

        /**
         * 新建模式先选择通道类型。
         */
        setSelectedType(null);
        setShowFormStep(false);
      },

      close: handleClose,
    }));

    /**
     * 选择通道类型。
     */
    const handleSelectType = (
      type: ChannelTypeVO,
    ) => {
      basicForm.resetFields();
      configForm.resetFields();

      basicForm.setFieldsValue({
        enabled: true,
      });

      setSelectedType(type);
      setShowFormStep(true);
    };

    /**
     * 返回通道类型选择。
     */
    const handlePrevious = () => {
      if (confirmLoading || testing) {
        return;
      }

      setShowFormStep(false);
      setSelectedType(null);

      basicForm.resetFields();
      configForm.resetFields();
    };

    /**
     * 新建通道时设置动态字段默认值。
     */
    useEffect(() => {
      if (
        !showFormStep ||
        !selectedType ||
        !isCreateMode
      ) {
        return;
      }

      const defaultValues: Record<string,
        unknown> = {};

      selectedType.configFields?.forEach(
        (field) => {
          if (
            field.defaultValue !== undefined &&
            field.defaultValue !== null
          ) {
            defaultValues[field.key] =
              field.defaultValue;
          }
        },
      );

      configForm.setFieldsValue(defaultValues);
    }, [
      configForm,
      isCreateMode,
      selectedType,
      showFormStep,
    ]);

    /**
     * 测试通道配置。
     */
    const handleTest = async () => {
      if (!selectedType) {
        message.error('请先选择告警通道类型');
        return;
      }

      try {
        const configValues =
          await configForm.validateFields();

        setTesting(true);

        const res = await testChannel({
          channelType: selectedType.channelType,
          configJson:
            JSON.stringify(configValues),
        });

        if (
          res?.code === 0 &&
          res.data?.success
        ) {
          message.success(
            res.data.message ||
            '测试消息发送成功',
          );

          return;
        }

        message.error(
          res?.data?.message ||
          '测试失败，请检查通道配置',
        );
      } catch (error: any) {
        if (error?.errorFields) {
          return;
        }

        message.error('测试请求失败');
      } finally {
        setTesting(false);
      }
    };

    /**
     * 保存通道。
     */
    const handleSubmit = async () => {
      if (!selectedType) {
        message.error('请先选择告警通道类型');
        return;
      }

      try {
        const [
          basicValues,
          configValues,
        ] = await Promise.all([
          basicForm.validateFields(),
          configForm.validateFields(),
        ]);

        const payload: AlarmChannelCommand = {
          name: basicValues.name,
          channelType:
          selectedType.channelType,
          enabled: basicValues.enabled ? 1 : 0,
          description:
            basicValues.description?.trim() ||
            undefined,
          configJson:
            JSON.stringify(configValues),
        };

        if (
          !isCreateMode &&
          currentRecord?.id
        ) {
          payload.id = currentRecord.id;
        }

        setConfirmLoading(true);

        const res = await saveChannel(payload);

        if (res?.code !== 0) {
          return;
        }

        message.success(
          intl.formatMessage({
            id: 'pages.alarm.message.success',
            defaultMessage: '操作成功',
          }),
        );

        setOpen(false);

        successCallbackRef.current?.();
      } catch (error: any) {
        if (error?.errorFields) {
          return;
        }
      } finally {
        setConfirmLoading(false);
      }
    };

    const drawerTitle = isCreateMode
      ? intl.formatMessage({
        id: 'pages.alarm.modal.channel.title.add',
        defaultMessage: '新建告警通道',
      })
      : intl.formatMessage({
        id: 'pages.alarm.modal.channel.title.edit',
        defaultMessage: '编辑告警通道',
      });

    const drawerDescription =
      showFormStep && selectedType
        ? `配置 ${
          selectedType.displayName ||
          selectedType.channelType
        } 告警通道`
        : '选择需要创建的告警通道类型';

    const sortedFields =
      selectedType?.configFields
        ? [...selectedType.configFields].sort(
        (first, second) =>
          (first.order ?? 0) -
          (second.order ?? 0),
        )
        : [];

    return (
      <Drawer
        open={open}
        onClose={handleClose}
        afterOpenChange={
          handleAfterOpenChange
        }
        width="min(640px, 100vw)"
        closable={false}
        maskClosable={
          !confirmLoading && !testing
        }
        keyboard={
          !confirmLoading && !testing
        }
        destroyOnClose
        styles={{
          body: {
            padding: 0,
            overflow: 'hidden',
          },
        }}
      >
        <div className="flex h-full min-h-0 flex-col bg-white">
          {/* 自定义抽屉头部 */}
          <header
            className={[
              'flex min-h-[76px] shrink-0',
              'items-center justify-between gap-4',
              'border-b border-slate-100',
              'bg-white px-6 py-4',
            ].join(' ')}
          >
            <div className="flex min-w-0 items-center gap-3">
              {showFormStep &&
              isCreateMode && (
                <button
                  type="button"
                  aria-label="返回选择通道类型"
                  disabled={
                    confirmLoading || testing
                  }
                  onClick={handlePrevious}
                  className={[
                    'inline-flex h-9 w-9 shrink-0',
                    'items-center justify-center',
                    'rounded-lg text-slate-400',
                    'transition-colors duration-200',
                    'hover:bg-slate-100',
                    'hover:text-slate-900',
                    'disabled:pointer-events-none',
                    'disabled:opacity-40',
                  ].join(' ')}
                >
                  <ArrowLeft className="h-4 w-4"/>
                </button>
              )}

              <div
                className={[
                  'flex h-10 w-10 shrink-0',
                  'items-center justify-center',
                  'rounded-xl',
                  'bg-[hsl(231_48%_48%/0.08)]',
                  'text-[hsl(231_48%_48%)]',
                ].join(' ')}
              >
                <RadioTower className="h-5 w-5"/>
              </div>

              <div className="min-w-0">
                <div className="flex min-w-0 items-center gap-2">
                  <h2 className="m-0 truncate text-base font-semibold text-slate-950">
                    {drawerTitle}
                  </h2>

                  {showFormStep &&
                  selectedType && (
                    <span
                      className="shrink-0 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
                        {
                          selectedType.channelType
                        }
                      </span>
                  )}
                </div>

                <p className="m-0 mt-1 truncate text-xs text-slate-400">
                  {drawerDescription}
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {showFormStep && (
                <>
                  <Button
                    size="small"
                    icon={
                      <FlaskConical className="h-3.5 w-3.5"/>
                    }
                    loading={testing}
                    disabled={confirmLoading}
                    onClick={handleTest}
                    className="rounded-lg"
                  >
                    <span className="hidden sm:inline">
                      测试
                    </span>
                  </Button>

                  <Button
                    type="primary"
                    size="small"
                    icon={
                      <Check className="h-3.5 w-3.5"/>
                    }
                    loading={confirmLoading}
                    disabled={testing}
                    onClick={handleSubmit}
                    className="rounded-lg px-4 shadow-none"
                  >
                    <span className="hidden sm:inline">
                      保存
                    </span>
                  </Button>
                </>
              )}

              <button
                type="button"
                aria-label="关闭抽屉"
                disabled={
                  confirmLoading || testing
                }
                onClick={handleClose}
                className={[
                  'ml-1 inline-flex h-9 w-9',
                  'items-center justify-center',
                  'rounded-lg text-slate-400',
                  'transition-colors duration-200',
                  'hover:bg-slate-100',
                  'hover:text-slate-900',
                  'disabled:pointer-events-none',
                  'disabled:opacity-40',
                ].join(' ')}
              >
                <X className="h-4 w-4"/>
              </button>
            </div>
          </header>

          {/* 抽屉内容 */}
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
            <Spin spinning={loadingTypes}>
              {showFormStep &&
              selectedType ? (
                <>
                  {/* 基本信息 */}
                  <section className="border-b border-slate-100 pb-6">
                    <div className="mb-5">
                      <h3 className="m-0 text-sm font-semibold text-slate-950">
                        基本信息
                      </h3>

                      <p className="m-0 mt-1 text-xs leading-5 text-slate-400">
                        设置通道名称、用途说明和启用状态。
                      </p>
                    </div>

                    <Form
                      form={basicForm}
                      layout="vertical"
                      requiredMark={false}
                    >
                      <div className="grid gap-x-5 sm:grid-cols-[minmax(0,1fr)_120px]">
                        <Form.Item
                          label={intl.formatMessage({
                            id: 'pages.alarm.field.name',
                            defaultMessage:
                              '通道名称',
                          })}
                          name="name"
                          rules={[
                            {
                              required: true,
                              whitespace: true,
                              message:
                                '请输入通道名称',
                            },
                          ]}
                        >
                          <Input
                            maxLength={100}
                            placeholder={intl.formatMessage(
                              {
                                id: 'pages.alarm.placeholder.channelName',
                                defaultMessage:
                                  '请输入通道名称',
                              },
                            )}
                          />
                        </Form.Item>

                        <Form.Item
                          label={intl.formatMessage({
                            id: 'pages.alarm.field.enabled',
                            defaultMessage:
                              '启用状态',
                          })}
                          name="enabled"
                          valuePropName="checked"
                        >
                          <Switch size="small"/>
                        </Form.Item>
                      </div>

                      <Form.Item
                        label={intl.formatMessage({
                          id: 'pages.alarm.field.description',
                          defaultMessage:
                            '通道说明',
                        })}
                        name="description"
                        className="mb-0"
                      >
                        <TextArea
                          maxLength={500}
                          showCount
                          placeholder="简单说明该通道的用途"
                          autoSize={{
                            minRows: 3,
                            maxRows: 6,
                          }}
                        />
                      </Form.Item>
                    </Form>
                  </section>

                  {/* 动态通道配置 */}
                  <section className="pt-6">
                    <div className="mb-5 flex items-start justify-between gap-4">
                      <div>
                        <h3 className="m-0 text-sm font-semibold text-slate-950">
                          通道配置
                        </h3>

                        <p className="m-0 mt-1 text-xs leading-5 text-slate-400">
                          填写告警消息接收地址和相关认证信息。
                        </p>
                      </div>

                      <span
                        className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">
                        {sortedFields.length}
                        个配置项
                      </span>
                    </div>

                    {sortedFields.length >
                    0 ? (
                      <Form
                        form={configForm}
                        layout="vertical"
                        requiredMark={false}
                      >
                        {sortedFields.map(
                          (field) => (
                            <Form.Item
                              key={field.key}
                              label={
                                field.label
                              }
                              name={field.key}
                              rules={toAntdRules(
                                field.rules,
                              )}
                              valuePropName={
                                field.type ===
                                'SWITCH'
                                  ? 'checked'
                                  : undefined
                              }
                            >
                              {renderFormControl(
                                field,
                              )}
                            </Form.Item>
                          ),
                        )}
                      </Form>
                    ) : (
                      <div className="rounded-xl border border-dashed border-slate-200 py-12 text-center">
                        <p className="m-0 text-sm font-medium text-slate-600">
                          当前通道无需额外配置
                        </p>

                        <p className="m-0 mt-2 text-xs text-slate-400">
                          填写基本信息后即可保存
                        </p>
                      </div>
                    )}
                  </section>
                </>
              ) : (
                <ChannelTypeSelector
                  channelTypes={channelTypes}
                  loading={loadingTypes}
                  onSelect={
                    handleSelectType
                  }
                />
              )}
            </Spin>
          </div>
        </div>
      </Drawer>
    );
  });

AddOrEditChannelModal.displayName =
  'AddOrEditChannelModal';

export default AddOrEditChannelModal;

import {useIntl} from '@umijs/max';
import {Button, Drawer, Form, Input, message, Select, Spin, Switch,} from 'antd';
import {Check, ShieldAlert, X,} from 'lucide-react';
import React, {forwardRef, useImperativeHandle, useRef, useState,} from 'react';
import {DEFAULT_SEVERITY, JOB_STATUS_OPTIONS, SEVERITY_OPTIONS,} from '../constants';
import {fetchAllJobDefinitions, fetchRuleChannels, saveRule,} from '../service';
import {
  AlarmOperateType,
  type AlarmModalOpenPayload,
  type AlarmModalRef,
  type AlarmRuleCommand,
  type AlarmRuleRecord,
  type JobDefinitionOption,
  type RuleFormValues,
} from '../types';

const {TextArea} = Input;

interface AddOrEditRuleModalProps {
  channels: Array<{
    id?: number;
    name?: string;
    channelType?: string;
    enabled?: number;
  }>;
}

/**
 * 将逗号分隔的 ID 字符串转换为数字数组。
 */
function parseNumberValues(value?: string): number[] {
  if (!value) {
    return [];
  }

  return value
    .split(',')
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isFinite(item));
}

/**
 * 将逗号分隔的字符串转换为字符串数组。
 */
function parseStringValues(value?: string): string[] {
  if (!value) {
    return [];
  }

  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

/**
 * 生成任务选项名称。
 */
function getJobOptionLabel(job: JobDefinitionOption) {
  return `[离线] ${job.jobName}`;
}

const AddOrEditRuleModal = forwardRef<AlarmModalRef,
  AddOrEditRuleModalProps>(({channels}, ref) => {
  const intl = useIntl();
  const [form] = Form.useForm<RuleFormValues>();

  const [open, setOpen] = useState(false);
  const [confirmLoading, setConfirmLoading] =
    useState(false);
  const [loadingJobs, setLoadingJobs] =
    useState(false);

  const [operateType, setOperateType] =
    useState<AlarmOperateType>(
      AlarmOperateType.Create,
    );

  const [currentRecord, setCurrentRecord] =
    useState<AlarmRuleRecord>();

  const [jobOptions, setJobOptions] = useState<JobDefinitionOption[]>([]);

  const successCallbackRef =
    useRef<(() => void) | undefined>();

  /**
   * 防止抽屉关闭或切换规则后，
   * 之前的异步请求继续回填旧数据。
   */
  const openRequestIdRef = useRef(0);

  const isCreateMode =
    operateType === AlarmOperateType.Create;

  const resetState = () => {
    setCurrentRecord(undefined);
    setConfirmLoading(false);
    form.resetFields();
  };

  const handleClose = () => {
    if (confirmLoading) {
      return;
    }

    openRequestIdRef.current += 1;
    setOpen(false);
  };

  /**
   * 关闭动画结束后再清空表单，
   * 避免抽屉关闭时内容突然消失。
   */
  const handleAfterOpenChange = (
    nextOpen: boolean,
  ) => {
    if (!nextOpen) {
      resetState();
    }
  };

  /**
   * 加载任务定义。
   */
  const ensureJobOptions =
    async (): Promise<JobDefinitionOption[]> => {
      if (jobOptions.length > 0) {
        return jobOptions;
      }

      setLoadingJobs(true);

      try {
        const result =
          await fetchAllJobDefinitions();

        const list = Array.isArray(result)
          ? result
          : [];

        setJobOptions(list);

        return list;
      } catch {
        setJobOptions([]);
        return [];
      } finally {
        setLoadingJobs(false);
      }
    };

  useImperativeHandle(ref, () => ({
    open: async ({
                   operateType: nextOperateType,
                   currentRecord: nextRecord,
                   onSuccess,
                 }: AlarmModalOpenPayload) => {
      const currentRequestId =
        openRequestIdRef.current + 1;

      openRequestIdRef.current =
        currentRequestId;

      resetState();

      setOperateType(nextOperateType);
      setCurrentRecord(
        nextRecord as
          | AlarmRuleRecord
          | undefined,
      );

      successCallbackRef.current = onSuccess;

      setOpen(true);

      /**
       * 任务列表不影响基本字段回填，
       * 可以与规则通道查询并行执行。
       */
      void ensureJobOptions();

      const defaultValues: Partial<RuleFormValues> =
        {
          severity: DEFAULT_SEVERITY,
          enabled: true,
          triggerStatuses: ['FAILED'],
          targetJobs: [],
          excludes: [],
          channelIds: [],
          description: '',
        };

      const isEdit =
        nextOperateType ===
        AlarmOperateType.Edit &&
        nextRecord;

      if (!isEdit) {
        form.setFieldsValue(defaultValues);
        return;
      }

      const rule =
        nextRecord as AlarmRuleRecord;

      form.setFieldsValue({
        name: rule.name || '',
        targetJobs: parseNumberValues(
          rule.targetJobs,
        ),
        triggerStatuses: parseStringValues(
          rule.triggerStatuses,
        ),
        severity:
          rule.severity || DEFAULT_SEVERITY,
        enabled: rule.enabled !== 0,
        description: rule.description || '',
        excludes: parseNumberValues(
          rule.excludes,
        ),
        channelIds: [],
      });

      if (rule.id == null) {
        return;
      }

      try {
        const channelRes =
          await fetchRuleChannels(rule.id);

        if (
          openRequestIdRef.current !==
          currentRequestId
        ) {
          return;
        }

        if (
          channelRes?.code === 0 &&
          Array.isArray(channelRes.data)
        ) {
          form.setFieldValue(
            'channelIds',
            channelRes.data,
          );
        }
      } catch {
        /*
         * 关联通道加载失败不影响其他字段编辑。
         * 全局请求错误处理会负责提示。
         */
      }
    },

    close: handleClose,
  }));

  const handleSubmit = async () => {
    try {
      const values =
        await form.validateFields();

      const targetJobs =
        values.targetJobs || [];

      const targetJobSet = new Set(
        targetJobs,
      );

      /**
       * 目标任务为空表示全部任务，
       * 此时排除任务可以从所有任务中选择。
       */
      const filteredExcludes = (
        values.excludes || []
      ).filter(
        (id) =>
          targetJobSet.size === 0 ||
          targetJobSet.has(id),
      );

      const payload: AlarmRuleCommand = {
        name: values.name?.trim(),
        targetJobs:
          targetJobs.length > 0
            ? targetJobs.join(',')
            : undefined,
        triggerStatuses: (
          values.triggerStatuses || []
        ).join(','),
        excludes:
          filteredExcludes.length > 0
            ? filteredExcludes.join(',')
            : undefined,
        severity: values.severity,
        enabled: values.enabled ? 1 : 0,
        description:
          values.description?.trim() ||
          undefined,
        channelIds: values.channelIds || [],
      };

      if (
        !isCreateMode &&
        currentRecord?.id != null
      ) {
        payload.id = currentRecord.id;
      }

      setConfirmLoading(true);

      const res = await saveRule(payload);

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

  const handleTargetJobsChange = (
    targetIds: number[],
  ) => {
    const selectedExcludes: number[] =
      form.getFieldValue('excludes') || [];

    /**
     * 选择具体任务后，自动移除不属于
     * 当前目标任务范围的排除项。
     */
    if (targetIds.length > 0) {
      form.setFieldValue(
        'excludes',
        selectedExcludes.filter((id) =>
          targetIds.includes(id),
        ),
      );
    }
  };

  const drawerTitle = isCreateMode
    ? intl.formatMessage({
      id: 'pages.alarm.modal.rule.title.add',
      defaultMessage: '新建告警规则',
    })
    : intl.formatMessage({
      id: 'pages.alarm.modal.rule.title.edit',
      defaultMessage: '编辑告警规则',
    });

  const drawerDescription = isCreateMode
    ? '配置任务状态变化时的告警策略'
    : '修改告警规则的触发条件与投递方式';

  const enabledChannelOptions = channels
    .filter((channel) => channel.id != null)
    .map((channel) => ({
      label: channel.channelType
        ? `${channel.name || '未命名通道'} (${channel.channelType})`
        : channel.name || '未命名通道',
      value: channel.id as number,
      disabled: channel.enabled === 0,
    }));

  const jobSelectOptions = jobOptions.map(
    (job) => ({
      label: getJobOptionLabel(job),
      value: job.id,
    }),
  );

  return (
    <Drawer
      open={open}
      onClose={handleClose}
      afterOpenChange={
        handleAfterOpenChange
      }
      width="min(640px, 100vw)"
      closable={false}
      maskClosable={!confirmLoading}
      keyboard={!confirmLoading}
      destroyOnClose
      styles={{
        body: {
          padding: 0,
          overflow: 'hidden',
        },
      }}
    >
      <div className="flex h-full min-h-0 flex-col bg-white">
        {/* 自定义头部 */}
        <header
          className={[
            'flex min-h-[76px] shrink-0',
            'items-center justify-between gap-4',
            'border-b border-slate-100',
            'bg-white px-6 py-4',
          ].join(' ')}
        >
          <div className="flex min-w-0 items-center gap-3">
            <div
              className={[
                'flex h-10 w-10 shrink-0',
                'items-center justify-center',
                'rounded-xl',
                'bg-[hsl(231_48%_48%/0.08)]',
                'text-[hsl(231_48%_48%)]',
              ].join(' ')}
            >
              <ShieldAlert className="h-5 w-5"/>
            </div>

            <div className="min-w-0">
              <h2 className="m-0 truncate text-base font-semibold text-slate-950">
                {drawerTitle}
              </h2>

              <p className="m-0 mt-1 truncate text-xs text-slate-400">
                {drawerDescription}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <Button
              type="primary"
              size="small"
              icon={
                <Check className="h-3.5 w-3.5"/>
              }
              loading={confirmLoading}
              onClick={handleSubmit}
              className="rounded-lg px-4 shadow-none"
            >
              <span className="hidden sm:inline">
                保存
              </span>
            </Button>

            <button
              type="button"
              aria-label="关闭抽屉"
              disabled={confirmLoading}
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
          <Spin spinning={loadingJobs}>
            <Form
              form={form}
              layout="vertical"
              requiredMark={false}
            >
              {/* 基本信息 */}
              <section className="border-b border-slate-100 pb-6">
                <div className="mb-5">
                  <h3 className="m-0 text-sm font-semibold text-slate-950">
                    基本信息
                  </h3>

                  <p className="m-0 mt-1 text-xs leading-5 text-slate-400">
                    设置规则名称、严重级别和启用状态。
                  </p>
                </div>

                <Form.Item
                  label={intl.formatMessage({
                    id: 'pages.alarm.field.name',
                    defaultMessage: '规则名称',
                  })}
                  name="name"
                  rules={[
                    {
                      required: true,
                      whitespace: true,
                      message: '请输入规则名称',
                    },
                  ]}
                >
                  <Input
                    maxLength={100}
                    placeholder={intl.formatMessage({
                      id: 'pages.alarm.placeholder.ruleName',
                      defaultMessage:
                        '请输入规则名称',
                    })}
                  />
                </Form.Item>

                <div className="grid gap-x-5 sm:grid-cols-[minmax(0,1fr)_120px]">
                  <Form.Item
                    label={intl.formatMessage({
                      id: 'pages.alarm.field.severity',
                      defaultMessage: '严重级别',
                    })}
                    name="severity"
                    rules={[
                      {
                        required: true,
                        message:
                          '请选择严重级别',
                      },
                    ]}
                  >
                    <Select
                      placeholder="请选择严重级别"
                      options={SEVERITY_OPTIONS}
                    />
                  </Form.Item>

                  <Form.Item
                    label={intl.formatMessage({
                      id: 'pages.alarm.field.enabled',
                      defaultMessage: '启用状态',
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
                    defaultMessage: '规则说明',
                  })}
                  name="description"
                  className="mb-0"
                >
                  <TextArea
                    maxLength={500}
                    showCount
                    placeholder="简单说明该规则的用途"
                    autoSize={{
                      minRows: 3,
                      maxRows: 6,
                    }}
                  />
                </Form.Item>
              </section>

              {/* 触发条件 */}
              <section className="border-b border-slate-100 py-6">
                <div className="mb-5">
                  <h3 className="m-0 text-sm font-semibold text-slate-950">
                    触发条件
                  </h3>

                  <p className="m-0 mt-1 text-xs leading-5 text-slate-400">
                    选择规则生效的任务范围和触发状态。
                  </p>
                </div>

                <Form.Item
                  label={intl.formatMessage({
                    id: 'pages.alarm.field.jobDefinition',
                    defaultMessage: '目标任务',
                  })}
                  name="targetJobs"
                  tooltip={intl.formatMessage({
                    id: 'pages.alarm.field.jobDefinition.tooltip',
                    defaultMessage:
                      '不选择表示全部任务，选择多个表示仅对这些任务生效',
                  })}
                >
                  <Select
                    mode="multiple"
                    showSearch
                    allowClear
                    optionFilterProp="label"
                    maxTagCount="responsive"
                    placeholder="不选表示全部任务"
                    options={jobSelectOptions}
                    onChange={
                      handleTargetJobsChange
                    }
                  />
                </Form.Item>

                <Form.Item
                  label={intl.formatMessage({
                    id: 'pages.alarm.field.triggerStatuses',
                    defaultMessage: '触发状态',
                  })}
                  name="triggerStatuses"
                  rules={[
                    {
                      required: true,
                      message:
                        '请选择触发状态',
                    },
                  ]}
                >
                  <Select
                    mode="multiple"
                    showSearch
                    allowClear
                    optionFilterProp="label"
                    maxTagCount="responsive"
                    placeholder="任务进入这些状态时触发告警"
                    options={JOB_STATUS_OPTIONS}
                  />
                </Form.Item>

                <Form.Item noStyle shouldUpdate>
                  {({getFieldValue}) => {
                    const selectedTargets:
                      | number[]
                      | undefined =
                      getFieldValue(
                        'targetJobs',
                      );

                    const excludeOptions =
                      selectedTargets &&
                      selectedTargets.length > 0
                        ? jobOptions
                          .filter((job) =>
                            selectedTargets.includes(
                              job.id,
                            ),
                          )
                          .map((job) => ({
                            label:
                              getJobOptionLabel(
                                job,
                              ),
                            value: job.id,
                          }))
                        : jobSelectOptions;

                    return (
                      <Form.Item
                        label={intl.formatMessage({
                          id: 'pages.alarm.field.excludes',
                          defaultMessage:
                            '排除任务',
                        })}
                        name="excludes"
                        tooltip={intl.formatMessage({
                          id: 'pages.alarm.field.excludes.tooltip',
                          defaultMessage:
                            '从目标任务范围中排除不需要告警的任务',
                        })}
                        className="mb-0"
                      >
                        <Select
                          mode="multiple"
                          showSearch
                          allowClear
                          optionFilterProp="label"
                          maxTagCount="responsive"
                          placeholder="请选择不需要发送告警的任务"
                          options={
                            excludeOptions
                          }
                        />
                      </Form.Item>
                    );
                  }}
                </Form.Item>
              </section>

              {/* 投递配置 */}
              <section className="pt-6">
                <div className="mb-5">
                  <h3 className="m-0 text-sm font-semibold text-slate-950">
                    投递配置
                  </h3>

                  <p className="m-0 mt-1 text-xs leading-5 text-slate-400">
                    选择规则触发后需要发送消息的告警通道。
                  </p>
                </div>

                <Form.Item
                  label={intl.formatMessage({
                    id: 'pages.alarm.field.channelIds',
                    defaultMessage: '告警通道',
                  })}
                  name="channelIds"
                  tooltip={intl.formatMessage({
                    id: 'pages.alarm.field.channelIds.tooltip',
                    defaultMessage:
                      '可以同时关联一个或多个告警通道',
                  })}
                  className="mb-0"
                >
                  <Select
                    mode="multiple"
                    showSearch
                    allowClear
                    optionFilterProp="label"
                    maxTagCount="responsive"
                    placeholder="请选择告警通道"
                    options={
                      enabledChannelOptions
                    }
                  />
                </Form.Item>

                {enabledChannelOptions.length ===
                0 && (
                  <p className="m-0 mt-2 text-xs text-orange-500">
                    暂无可用告警通道，请先创建并启用告警通道。
                  </p>
                )}
              </section>
            </Form>
          </Spin>
        </div>
      </div>
    </Drawer>
  );
});

AddOrEditRuleModal.displayName =
  'AddOrEditRuleModal';

export default AddOrEditRuleModal;

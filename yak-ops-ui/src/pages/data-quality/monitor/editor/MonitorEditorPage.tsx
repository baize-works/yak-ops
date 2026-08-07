import {
  dataSourceCatalogApi,
  fetchDataSourceAll,
} from '@/pages/data-source/service';
import type { DataSourceRecord } from '@/pages/data-source/types';
import { API_SUCCESS_CODE } from '@/services/http/response';
import { BRAND_THEME } from '@/styles/brand';
import { history, useLocation, useModel, useParams } from '@umijs/max';
import { Button, ConfigProvider, Form, Input, Spin, message } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { qualityMonitorApi, qualityTemplateApi } from '../../service';
import type {
  CatalogColumn,
  CommonApiResponse,
  SaveMonitorPayload,
  TemplateView,
} from '../../types';
import { BasicConfig } from './BasicConfig';
import { SectionNavigator } from './EditorLayout';
import { IssueStrategy } from './IssueStrategy';
import {
  buildSettings,
  DEFAULT_RUNTIME,
  DEFAULT_STRATEGY,
  monitorRules,
  runtimeFromSettings,
  strategyFromSettings,
  validateEditorSettings,
  type EditorRule,
  type IssueStrategyState,
  type RuntimeFormState,
} from './model';
import { QualityRuleEditor, validateRules } from './RuleEditor';
import { RuntimeSettings } from './RuntimeSettings';
import { useSectionNavigation } from './useSectionNavigation';

const unwrap = <T,>(response: CommonApiResponse<T>) => {
  if (response.code !== API_SUCCESS_CODE) {
    throw new Error(response.message || response.msg || '请求失败');
  }
  return response.data;
};

const MonitorEditorPage = () => {
  const params = useParams<{ id?: string }>();
  const location = useLocation();
  const { initialState } = useModel('@@initialState');
  const currentUser = initialState?.currentUser as
    | { realName?: string; username?: string }
    | undefined;
  const editing = Boolean(params.id);
  const query = useMemo(
    () => new URLSearchParams(location.search),
    [location.search],
  );
  const [form] = Form.useForm<SaveMonitorPayload>();
  const { pageRootRef, activeSection, locateSection } = useSectionNavigation();

  const [dataSources, setDataSources] = useState<DataSourceRecord[]>([]);
  const [columns, setColumns] = useState<CatalogColumn[]>([]);
  const [templates, setTemplates] = useState<TemplateView[]>([]);
  const [rules, setRules] = useState<EditorRule[]>([]);
  const [runtime, setRuntime] = useState<RuntimeFormState>(DEFAULT_RUNTIME);
  const [strategy, setStrategy] =
    useState<IssueStrategyState>(DEFAULT_STRATEGY);
  const [nextRunTime, setNextRunTime] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const dataSourceId = Form.useWatch('dataSourceId', form);
  const storedDataSourceName = Form.useWatch('dataSourceName', form);
  const databaseName = Form.useWatch('databaseName', form);
  const schemaName = Form.useWatch('schemaName', form);
  const tableName = Form.useWatch('tableName', form);

  const selectedSource = useMemo(
    () =>
      dataSources.find((item) => Number(item.id) === Number(dataSourceId)),
    [dataSourceId, dataSources],
  );

  useEffect(() => {
    const initialize = async () => {
      try {
        const [sourceResponse, templateResponse] = await Promise.all([
          fetchDataSourceAll(),
          qualityTemplateApi.list(),
        ]);
        setDataSources(unwrap(sourceResponse).bizData || []);
        setTemplates(unwrap(templateResponse).records || []);

        if (editing) {
          const [monitorResponse, settingsResponse] = await Promise.all([
            qualityMonitorApi.detail(params.id!),
            qualityMonitorApi.settings(params.id!),
          ]);
          const monitor = unwrap(monitorResponse);
          const settings = unwrap(settingsResponse);
          form.setFieldsValue({
            name: monitor.name,
            description: monitor.description,
            dataSourceId: monitor.dataSourceId,
            dataSourceName: monitor.dataSourceName,
            databaseName: monitor.databaseName,
            schemaName: monitor.schemaName,
            tableName: monitor.tableName,
            whereClause: monitor.whereClause,
            owner: monitor.owner,
            enabled: monitor.enabled,
          });
          setRules(monitorRules(monitor));
          setRuntime(runtimeFromSettings(settings));
          setStrategy(strategyFromSettings(settings));
          setNextRunTime(settings.nextRunTime);
        } else {
          form.setFieldsValue({
            dataSourceId: Number(query.get('dataSourceId')) || undefined,
            dataSourceName: query.get('dataSourceName') || undefined,
            databaseName: query.get('databaseName') || undefined,
            schemaName: query.get('schemaName') || undefined,
            tableName: query.get('tableName') || undefined,
            owner:
              currentUser?.realName || currentUser?.username || 'system',
            enabled: true,
          });
        }
      } catch (error: any) {
        message.error(error?.message || '页面初始化失败');
      } finally {
        setLoading(false);
      }
    };
    void initialize();
  }, [
    currentUser?.realName,
    currentUser?.username,
    editing,
    form,
    params.id,
    query,
  ]);

  useEffect(() => {
    if (!dataSourceId || !tableName) {
      setColumns([]);
      return;
    }
    dataSourceCatalogApi
      .listColumns(dataSourceId, databaseName, schemaName, tableName)
      .then((response) => setColumns(unwrap(response)))
      .catch((error) =>
        message.error(error?.message || '字段加载失败'),
      );
  }, [dataSourceId, databaseName, schemaName, tableName]);

  const save = async () => {
    try {
      const values = await form.validateFields();
      if (!values.dataSourceId || !values.tableName) {
        throw new Error('监控对象无效，请从数据表监控页面重新创建');
      }
      validateEditorSettings(runtime, strategy);
      validateRules(rules);
      const source = dataSources.find(
        (item) => Number(item.id) === Number(values.dataSourceId),
      );
      const payload: SaveMonitorPayload = {
        ...values,
        dataSourceId: Number(values.dataSourceId),
        dataSourceName: source?.name || values.dataSourceName,
        settings: buildSettings(runtime, strategy),
        rules: rules.map(
          ({
            key: _key,
            templateCode: _code,
            ruleType: _type,
            scope: _scope,
            dimension: _dimension,
            ...rule
          }) => rule,
        ),
      };
      setSaving(true);
      const result = editing
        ? unwrap(await qualityMonitorApi.update(params.id!, payload))
        : unwrap(await qualityMonitorApi.create(payload));
      message.success(editing ? '质量监控已更新' : '质量监控已创建');
      history.push(`/data-quality/monitor/${result.id}`);
    } catch (error: any) {
      if (!error?.errorFields) {
        message.error(error?.message || '保存失败');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <ConfigProvider theme={BRAND_THEME}>
      <div className="h-[calc(100vh-64px)] overflow-hidden bg-[#f7f8fa] text-[#161823]">
        <div
          ref={pageRootRef}
          className="h-full overflow-y-auto overscroll-contain scroll-smooth"
        >
          <div className="mx-auto grid w-full max-w-[1280px] grid-cols-1 gap-6 px-6 pb-6 pt-6 max-xl:max-w-[1040px] xl:grid-cols-[minmax(0,1fr)_176px]">
            <div className="min-w-0">
              <Spin spinning={loading}>
                <Form form={form} requiredMark={false}>
                  <Form.Item name="dataSourceId" hidden>
                    <Input />
                  </Form.Item>
                  <Form.Item name="dataSourceName" hidden>
                    <Input />
                  </Form.Item>
                  <Form.Item name="databaseName" hidden>
                    <Input />
                  </Form.Item>
                  <Form.Item name="schemaName" hidden>
                    <Input />
                  </Form.Item>
                  <Form.Item name="tableName" hidden>
                    <Input />
                  </Form.Item>

                  <main className="space-y-5 pb-4">
                    <BasicConfig
                      dataSourceId={dataSourceId}
                      dataSourceName={selectedSource?.name || storedDataSourceName}
                      databaseName={databaseName}
                      schemaName={schemaName}
                      tableName={tableName}
                    />
                    <QualityRuleEditor
                      rules={rules}
                      onChange={setRules}
                      columns={columns}
                      templates={templates}
                    />
                    <RuntimeSettings
                      value={runtime}
                      onChange={setRuntime}
                      nextRunTime={nextRunTime}
                    />
                    <IssueStrategy value={strategy} onChange={setStrategy} />
                  </main>
                </Form>
              </Spin>

              <footer className="sticky bottom-0 z-50 overflow-hidden rounded-t-lg border border-b-0 border-[#eaecf0] bg-white shadow-[0_-8px_16px_rgba(0,0,0,0.06)]">
                <div className="flex min-h-[76px] items-center gap-3 px-8 py-4">
                  <Button
                    type="primary"
                    loading={saving}
                    disabled={!dataSourceId || !tableName}
                    className="!h-9 !min-w-[120px] !rounded-lg"
                    onClick={save}
                  >
                    保存配置
                  </Button>
                  <Button
                    disabled={saving}
                    className="!h-9 !min-w-[120px] !border-0 !bg-[#f2f3f5]"
                    onClick={() => history.back()}
                  >
                    取消
                  </Button>
                </div>
              </footer>
            </div>

            <aside className="hidden xl:block">
              <div className="sticky top-6">
                <SectionNavigator
                  activeKey={activeSection}
                  onSelect={locateSection}
                />
              </div>
            </aside>
          </div>
        </div>
      </div>
    </ConfigProvider>
  );
};

export default MonitorEditorPage;

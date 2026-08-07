import { API_SUCCESS_CODE } from '@/services/http/response';
import { BRAND_THEME } from '@/styles/brand';
import { history, useParams } from '@umijs/max';
import { ConfigProvider, Modal, Spin, message } from 'antd';
import dayjs from 'dayjs';
import { useCallback, useEffect, useState } from 'react';
import {
  qualityMonitorApi,
  qualityWorkspaceApi,
} from '../../service';
import type {
  MonitorReportView,
  MonitorWorkspaceView,
  OperationLogPageView,
  RuleView,
} from '../../types';
import MonitorListTab from './MonitorListTab';
import OperationLogDrawer from './OperationLogDrawer';
import QualityReportTab from './QualityReportTab';
import RuleManagementTab from './RuleManagementTab';
import WorkspaceHeader from './WorkspaceHeader';
import { toSavePayload, type WorkspaceTab } from './model';

const unwrap = <T,>(response: {
  code: number;
  data: T;
  message?: string;
  msg?: string;
}) => {
  if (response.code !== API_SUCCESS_CODE) {
    throw new Error(response.message || response.msg || '请求失败');
  }
  return response.data;
};

const EMPTY_OPERATION_LOG: OperationLogPageView = {
  records: [],
  total: 0,
  current: 1,
  pageSize: 10,
};

const MonitorDetailPage = () => {
  const params = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('rules');
  const [workspace, setWorkspace] = useState<MonitorWorkspaceView>();
  const [report, setReport] = useState<MonitorReportView>();
  const [reportDate, setReportDate] = useState(
    dayjs().subtract(1, 'day').format('YYYY-MM-DD'),
  );
  const [operationLog, setOperationLog] = useState<OperationLogPageView>(
    EMPTY_OPERATION_LOG,
  );
  const [loading, setLoading] = useState(true);
  const [reportLoading, setReportLoading] = useState(false);
  const [logLoading, setLogLoading] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const [running, setRunning] = useState(false);
  const [savingRules, setSavingRules] = useState(false);

  const loadWorkspace = useCallback(async () => {
    if (!params.id) return;
    setLoading(true);
    try {
      setWorkspace(unwrap(await qualityWorkspaceApi.workspace(params.id)));
    } catch (error: any) {
      message.error(error?.message || '质量监控工作台加载失败');
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  const loadReport = useCallback(
    async (date: string) => {
      if (!params.id) return;
      setReportLoading(true);
      try {
        setReport(
          unwrap(await qualityWorkspaceApi.report(params.id, { date })),
        );
      } catch (error: any) {
        message.error(error?.message || '质量报告加载失败');
      } finally {
        setReportLoading(false);
      }
    },
    [params.id],
  );

  const loadOperationLog = useCallback(
    async (current = operationLog.current, pageSize = operationLog.pageSize) => {
      if (!params.id) return;
      setLogLoading(true);
      try {
        setOperationLog(
          unwrap(
            await qualityWorkspaceApi.operationLogs(params.id, {
              current,
              pageSize,
            }),
          ),
        );
      } catch (error: any) {
        message.error(error?.message || '操作日志加载失败');
      } finally {
        setLogLoading(false);
      }
    },
    [operationLog.current, operationLog.pageSize, params.id],
  );

  useEffect(() => {
    void loadWorkspace();
  }, [loadWorkspace]);

  useEffect(() => {
    if (activeTab === 'report') {
      void loadReport(reportDate);
    }
  }, [activeTab, loadReport, reportDate]);

  const run = async () => {
    if (!params.id) return;
    setRunning(true);
    try {
      const result = unwrap(await qualityMonitorApi.run(params.id));
      message.success(`质量检查已提交：${result.executionNo}`);
      window.setTimeout(() => void loadWorkspace(), 1800);
    } catch (error: any) {
      message.error(error?.message || '运行失败');
    } finally {
      setRunning(false);
    }
  };

  const updateRules = async (rules: RuleView[]) => {
    if (!workspace || !params.id) return;
    setSavingRules(true);
    try {
      unwrap(
        await qualityMonitorApi.update(
          params.id,
          toSavePayload(workspace.monitor, workspace.settings, rules),
        ),
      );
      message.success('质量规则已更新');
      await loadWorkspace();
      if (activeTab === 'report') {
        await loadReport(reportDate);
      }
    } catch (error: any) {
      message.error(error?.message || '质量规则更新失败');
      throw error;
    } finally {
      setSavingRules(false);
    }
  };

  const removeMonitor = () => {
    if (!params.id) return;
    Modal.confirm({
      title: '删除质量监控？',
      content: '删除后将保留历史执行记录，但不再允许继续运行。',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          unwrap(await qualityMonitorApi.remove(params.id));
          message.success('质量监控已删除');
          history.push('/data-quality/table-config');
        } catch (error: any) {
          message.error(error?.message || '删除失败');
        }
      },
    });
  };

  const openLog = () => {
    setLogOpen(true);
    void loadOperationLog(1, operationLog.pageSize);
  };

  return (
    <ConfigProvider theme={BRAND_THEME}>
      <div className="flex h-[calc(100vh-64px)] min-h-[620px] flex-col overflow-hidden bg-white">
        <WorkspaceHeader
          workspace={workspace}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onBack={() => history.push('/data-quality/table-config')}
        />

        <Spin spinning={loading} wrapperClassName="min-h-0 flex-1 overflow-hidden">
          {workspace ? (
            <div className="flex h-full min-h-0 flex-col">
              {activeTab === 'rules' ? (
                <RuleManagementTab
                  workspace={workspace}
                  running={running}
                  savingRules={savingRules}
                  onRun={run}
                  onEditMonitor={() =>
                    history.push(`/data-quality/monitor/${params.id}/edit`)
                  }
                  onOpenLog={openLog}
                  onRefresh={loadWorkspace}
                  onRemoveMonitor={removeMonitor}
                  onUpdateRules={updateRules}
                />
              ) : null}

              {activeTab === 'monitors' ? (
                <MonitorListTab
                  workspace={workspace}
                  running={running}
                  onRun={run}
                  onEdit={() =>
                    history.push(`/data-quality/monitor/${params.id}/edit`)
                  }
                  onRefresh={loadWorkspace}
                  onRemove={removeMonitor}
                  onOpenLog={openLog}
                />
              ) : null}

              {activeTab === 'report' ? (
                <QualityReportTab
                  report={report}
                  loading={reportLoading}
                  reportDate={reportDate}
                  onDateChange={setReportDate}
                />
              ) : null}
            </div>
          ) : null}
        </Spin>

        <OperationLogDrawer
          open={logOpen}
          loading={logLoading}
          data={operationLog}
          onClose={() => setLogOpen(false)}
          onPageChange={(current, pageSize) =>
            void loadOperationLog(current, pageSize)
          }
        />
      </div>
    </ConfigProvider>
  );
};

export default MonitorDetailPage;

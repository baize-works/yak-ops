import { CopyOutlined } from "@ant-design/icons";
import { history, useIntl } from "@umijs/max";
import { Divider, Empty, Table, Tooltip, message } from "antd";
import { TableRowSelection } from "antd/es/table/interface";
import moment from "moment";
import { useEffect, useState } from "react";
import { linkupJobDefinitionApi } from "../../api";
import { batchJobExecutorApi } from "../../type";
import ActionColumn from "./components/ActionColumn";
import AdvancedSearchForm from "./components/AdvancedSearchForm";
import BottomActionBar from "./components/BottomActionBar";
import DataSourceSyncPlan from "./components/DataSourceSyncPlan";
import ExecutionStatus from "./components/ExecutionStatus";
import Footer from "./components/Footer";
import ScheduleInfo from "./components/ScheduleInfo";
import TaskStatus from "./components/TaskStatus";

interface Props {
  goDetail: (value: any, item?: any) => void;
}

const DEFAULT_TIME_RANGE = [
  moment().subtract(4, "days"),
  moment().add(1, "days"),
];

const RUNNING_STATUS_SET = new Set([
  "INITIALIZING",
  "CREATED",
  "PENDING",
  "SCHEDULED",
  "RUNNING",
  "FAILING",
  "DOING_SAVEPOINT",
  "CANCELING",
]);

const parseSearchParamsFromUrl = () => {
  const params = new URLSearchParams(window.location.search);

  const createTimeStart = params.get("createTimeStart");
  const createTimeEnd = params.get("createTimeEnd");

  return {
    jobName: params.get("jobName") || undefined,
    id: params.get("id") || undefined,
    status: params.get("status") || undefined,
    sourceType: params.get("sourceType") || undefined,
    sinkType: params.get("sinkType") || undefined,
    sourceTable: params.get("sourceTable") || undefined,
    sinkTable: params.get("sinkTable") || undefined,
    createTime:
      createTimeStart && createTimeEnd
        ? [
            moment(createTimeStart, "YYYY-MM-DD HH:mm:ss"),
            moment(createTimeEnd, "YYYY-MM-DD HH:mm:ss"),
          ]
        : DEFAULT_TIME_RANGE,
  };
};

const parsePaginationFromUrl = () => {
  const params = new URLSearchParams(window.location.search);

  return {
    current: Number(params.get("current") || 1),
    pageSize: Number(params.get("pageSize") || 10),
    total: 0,
  };
};

const App: React.FC<Props> = ({ goDetail }) => {
  const intl = useIntl();

  const [taskList, setTaskList] = useState<any[]>([]);
  const [searchParams, setSearchParams] = useState<any>(() =>
    parseSearchParamsFromUrl()
  );
  const [pagination, setPagination] = useState(() => parsePaginationFromUrl());
  const [loading, setLoading] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  const copyToClipboard = async (text: string | number) => {
    const value = String(text);

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(value);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = value;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }

      message.success("任务定义ID已复制");
    } catch {
      message.error("复制失败，请手动复制");
    }
  };

  const syncUrlParams = (
    params: any,
    pageInfo: { current: number; pageSize: number }
  ) => {
    const query = new URLSearchParams();

    if (params?.jobName) query.set("jobName", params.jobName);
    if (params?.id) query.set("id", params.id);
    if (params?.status) query.set("status", params.status);
    if (params?.sourceType) query.set("sourceType", params.sourceType);
    if (params?.sinkType) query.set("sinkType", params.sinkType);
    if (params?.sourceTable) query.set("sourceTable", params.sourceTable);
    if (params?.sinkTable) query.set("sinkTable", params.sinkTable);

    if (params?.createTime?.length === 2) {
      query.set(
        "createTimeStart",
        moment(params.createTime[0]).format("YYYY-MM-DD HH:mm:ss")
      );
      query.set(
        "createTimeEnd",
        moment(params.createTime[1]).format("YYYY-MM-DD HH:mm:ss")
      );
    }

    query.set("current", String(pageInfo.current || 1));
    query.set("pageSize", String(pageInfo.pageSize || 10));

    history.replace({
      search: `?${query.toString()}`,
    });
  };

  const fetchTaskList = async () => {
    setLoading(true);

    const transformedParams = { ...searchParams };

    if (transformedParams?.createTime?.length === 2) {
      transformedParams.createTimeStart = moment(
        transformedParams.createTime[0]
      ).format("YYYY-MM-DD HH:mm:ss");
      transformedParams.createTimeEnd = moment(
        transformedParams.createTime[1]
      ).format("YYYY-MM-DD HH:mm:ss");
      delete transformedParams.createTime;
    }

    try {
      const data = await linkupJobDefinitionApi.page({
        ...transformedParams,
        current: pagination.current,
        pageSize: pagination.pageSize,
      });

      setTaskList(data?.data?.bizData || []);
      setPagination((prev) => ({
        ...prev,
        total: data?.data?.pagination?.total || 0,
      }));
    } catch (error) {
      message.error("查询任务列表失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    syncUrlParams(searchParams, pagination);
  }, [searchParams, pagination.current, pagination.pageSize]);

  useEffect(() => {
    fetchTaskList();
  }, [searchParams, pagination.current, pagination.pageSize]);

  const baseColumns = [
    {
      title: intl.formatMessage({
        id: "pages.job.table.col.name",
        defaultMessage: "Name",
      }),
      dataIndex: "jobName",
      width: "12%",
      ellipsis: true,
      render: (_content: any, record: any) => (
        <div>
          <div>
            <em style={{ fontWeight: 500 }}>
              {intl.formatMessage({
                id: "pages.job.table.label.jobName",
                defaultMessage: "JobName",
              })}
            </em>
            : {record?.jobName}
          </div>
          <div>
            <em style={{ fontWeight: 500 }}>
              {intl.formatMessage({
                id: "pages.job.table.label.jobId",
                defaultMessage: "Job Definition ID",
              })}
            </em>
            :{" "}
            <span style={{ fontSize: "12px", color: "gray" }}>
              {record?.id}
            </span>{" "}
            <Tooltip title="复制任务定义ID">
              <button
                type="button"
                style={{
                  border: "none",
                  background: "transparent",
                  padding: 0,
                  marginLeft: 4,
                  cursor: "pointer",
                  color: "#94a3b8",
                  lineHeight: 1,
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  copyToClipboard(record?.id);
                }}
              >
                <CopyOutlined style={{ fontSize: 12 }} />
              </button>
            </Tooltip>
          </div>
        </div>
      ),
    },
    {
      title: intl.formatMessage({
        id: "pages.job.table.col.syncPlan",
        defaultMessage: "Sync Plan",
      }),
      dataIndex: "",
      width: "21%",
      render: (_content: any, record: any) => (
        <DataSourceSyncPlan record={record} />
      ),
    },

    {
      title: intl.formatMessage({
        id: "pages.job.table.col.status",
        defaultMessage: "Status",
      }),
      dataIndex: "taskParams",
      width: "7%",
      render: (_content: any, record: any) => (
        <div className="flex w-full justify-center">
          <TaskStatus
            status={record?.lastJobStatus}
            errorMessage={record?.lastErrorMessage}
          />
        </div>
      ),
    },
    {
      title: intl.formatMessage({
        id: "pages.job.table.col.execution",
        defaultMessage: "Execution",
      }),
      dataIndex: "执行概况",
      width: "15%",
      render: (_content: any, record: any) => (
        <ExecutionStatus record={record} />
      ),
    },
    {
      title: intl.formatMessage({
        id: "pages.job.table.col.schedule",
        defaultMessage: "Schedule",
      }),
      dataIndex: "taskName",
      width: "20%",
      render: (_content: any, record: any) => <ScheduleInfo record={record} />,
    },
    {
      title: intl.formatMessage({
        id: "pages.job.table.col.createTime",
        defaultMessage: "CreateTime",
      }),
      dataIndex: "createTime",
      width: "10%",
    },
    {
      title: intl.formatMessage({
        id: "pages.job.table.col.operate",
        defaultMessage: "Operate",
      }),
      dataIndex: "",
      width: "14%",
      fixed: "right" as const,
      render: (record: any) => (
        <ActionColumn record={record} cbk={fetchTaskList} goDetail={goDetail} />
      ),
    },
  ];

  const onSelectChange = (newSelectedRowKeys: React.Key[]) => {
    setSelectedRowKeys(newSelectedRowKeys);
  };

  const rowSelection: TableRowSelection<any> = {
    selectedRowKeys,
    onChange: onSelectChange,
  };

  const handleSearch = (values: any) => {
    setSearchParams(values);
    setPagination((prev) => ({ ...prev, current: 1 }));
  };

  const handleReset = () => {
    setSearchParams({
      createTime: DEFAULT_TIME_RANGE,
    });
    setPagination((prev) => ({
      ...prev,
      current: 1,
    }));
  };

  const handlePaginationChange = (page: number, pageSize: number) => {
    setPagination((prev) => ({
      ...prev,
      current: page,
      pageSize,
    }));
  };

  const hasSelected = selectedRowKeys.length > 0;

  const getSelectedRows = () => {
    const selectedKeySet = new Set(selectedRowKeys.map(String));
    return taskList.filter((item) => selectedKeySet.has(String(item?.id)));
  };

  const isOnline = (record: any) => {
    return String(record?.releaseState || "").toUpperCase() === "ONLINE";
  };

  const isRunning = (record: any) => {
    return RUNNING_STATUS_SET.has(
      String(record?.lastJobStatus || "").toUpperCase()
    );
  };

  const buildJobLabel = (record: any) => {
    return `${record?.jobName || "-"}(${record?.id || "-"})`;
  };

  const buildLimitedJobLabels = (records: any[]) => {
    const labels = records.slice(0, 3).map(buildJobLabel).join("、");
    if (records.length <= 3) {
      return labels;
    }
    return `${labels} 等 ${records.length} 个任务`;
  };

  const getBatchActionState = () => {
    const selectedRows = getSelectedRows();

    if (selectedRows.length === 0) {
      return {
        startDisabled: true,
        stopDisabled: true,
        startTooltip: "请先选择任务",
        stopTooltip: "请先选择任务",
      };
    }

    const offlineRows = selectedRows.filter((item) => !isOnline(item));
    const runningRows = selectedRows.filter(isRunning);
    const notRunningRows = selectedRows.filter((item) => !isRunning(item));

    const startDisabled = offlineRows.length > 0 || runningRows.length > 0;
    const stopDisabled = notRunningRows.length > 0;

    let startTooltip: string | undefined;
    let stopTooltip: string | undefined;

    if (offlineRows.length > 0) {
      startTooltip = `存在未上线任务，请先上线后再启动：${buildLimitedJobLabels(
        offlineRows
      )}`;
    } else if (runningRows.length > 0) {
      startTooltip = `存在运行中的任务，请只选择未运行任务进行启动：${buildLimitedJobLabels(
        runningRows
      )}`;
    }

    if (notRunningRows.length > 0) {
      stopTooltip = `存在未运行任务，请只选择运行中的任务进行停止：${buildLimitedJobLabels(
        notRunningRows
      )}`;
    }

    return {
      startDisabled,
      stopDisabled,
      startTooltip,
      stopTooltip,
    };
  };

  const batchActionState = getBatchActionState();

  const validateBatchStart = () => {
    const selectedRows = getSelectedRows();

    if (selectedRows.length === 0) {
      message.warning("请先选择要启动的任务");
      return false;
    }

    const offlineRows = selectedRows.filter((item) => !isOnline(item));
    if (offlineRows.length > 0) {
      message.warning(
        `存在未上线任务，请先上线后再启动：${buildLimitedJobLabels(
          offlineRows
        )}`
      );
      return false;
    }

    const runningRows = selectedRows.filter(isRunning);
    if (runningRows.length > 0) {
      message.warning(
        `存在运行中的任务，请只选择未运行任务进行批量启动：${buildLimitedJobLabels(
          runningRows
        )}`
      );
      return false;
    }

    return true;
  };

  const validateBatchStop = () => {
    const selectedRows = getSelectedRows();

    if (selectedRows.length === 0) {
      message.warning("请先选择要停止的任务");
      return false;
    }

    const notRunningRows = selectedRows.filter((item) => !isRunning(item));
    if (notRunningRows.length > 0) {
      message.warning(
        `存在未运行的任务，请只选择运行中的任务进行批量停止：${buildLimitedJobLabels(
          notRunningRows
        )}`
      );
      return false;
    }

    return true;
  };

  const getErrorMessage = (error: any, fallback: string) => {
    return (
      error?.response?.data?.message ||
      error?.response?.data?.msg ||
      error?.data?.message ||
      error?.data?.msg ||
      error?.message ||
      fallback
    );
  };

  const onStartAll = async () => {
    if (!validateBatchStart()) {
      return;
    }

    try {
      const data = await batchJobExecutorApi.batchExecute(selectedRowKeys);

      if (data?.code === 0) {
        const result = data?.data;

        message.success(
          `批量启动完成：成功 ${result?.successCount || 0} 个，失败 ${
            result?.failedCount || 0
          } 个`
        );

        setSelectedRowKeys([]);
        fetchTaskList();
      } else {
        
      }
    } catch (error: any) {
      message.error(getErrorMessage(error, "Start all failed"));
    }
  };

  const onStopAll = async () => {
    if (!validateBatchStop()) {
      return;
    }

    try {
      const data = await batchJobExecutorApi.batchPause(selectedRowKeys);

      if (data?.code === 0) {
        const result = data?.data;

        message.success(
          `批量停止完成：成功 ${result?.successCount || 0} 个，失败 ${
            result?.failedCount || 0
          } 个`
        );

        setSelectedRowKeys([]);
        fetchTaskList();
      } else {
        message.error(data?.message || data?.msg || "Stop all failed");
      }
    } catch (error: any) {
      message.error(getErrorMessage(error, "Stop all failed"));
    }
  };

  return (
    <>
      <div
        style={{
          margin: "0px 16px",
          background: "white",
          padding: "0 16px 0 16px",
        }}
      >
        <div>
          <div className="config-manage-page">
            <div className="operate-bar">
              <div className="left">
                <AdvancedSearchForm
                  onSearch={handleSearch}
                  onReset={handleReset}
                  initialValues={searchParams}
                />
              </div>
            </div>

            <Divider style={{ margin: "16px 0" }} />

            <Table
              columns={baseColumns as any}
              dataSource={taskList}
              rowKey="id"
              bordered
              pagination={false}
              loading={loading}
              rowSelection={{ type: "checkbox", ...rowSelection }}
              scroll={{ x: "max-content", y: "calc(100vh - 470px)" }}
              className={[
                "[&_.ant-table]:!rounded-xl",
                "[&_.ant-table-thead>tr>th]:!bg-slate-50",
                "[&_.ant-table-thead>tr>th]:!font-bold",
                "[&_.ant-table-thead>tr>th]:!text-slate-700",
                "[&_.ant-table-tbody>tr>td]:!border-slate-100",
                "[&_.ant-table-tbody>tr:hover>td]:!bg-slate-50/70",
                "[&_.ant-pagination]:!px-1",
              ].join(" ")}
              locale={{
                emptyText: (
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description="暂无离线同步任务"
                  />
                ),
              }}
            />
          </div>
        </div>

        {taskList && taskList.length > 1 ? "" : <Footer />}
      </div>

      <BottomActionBar
        onStart={onStartAll}
        onStop={onStopAll}
        pagination={{
          ...pagination,
          onChange: handlePaginationChange,
        }}
        selectedCount={selectedRowKeys.length}
        disabled={!hasSelected}
        startDisabled={batchActionState.startDisabled}
        stopDisabled={batchActionState.stopDisabled}
        startTooltip={batchActionState.startTooltip}
        stopTooltip={batchActionState.stopTooltip}
      />
    </>
  );
};

export default App;

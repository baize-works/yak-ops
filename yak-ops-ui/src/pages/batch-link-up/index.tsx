import { API_SUCCESS_CODE } from "@/services/http/response";
import { CopyOutlined, DownOutlined, ReloadOutlined } from "@ant-design/icons";
import { history } from "@umijs/max";
import {
  Button,
  ConfigProvider,
  DatePicker,
  Divider,
  Empty,
  Input,
  message,
  Select,
  Table,
  Tooltip,
  Typography,
} from "antd";
import type { TableRowSelection } from "antd/es/table/interface";
import moment from "moment";
import React, { useEffect, useMemo, useState } from "react";

import { linkupJobDefinitionApi } from "./api";
import CreateSyncTaskDrawer from "./components/CreateSyncTaskModal";
import ActionColumn from "./components/SyncTaskList/components/ActionColumn";
import DataSourceSyncPlan from "./components/SyncTaskList/components/DataSourceSyncPlan";
import ExecutionStatus from "./components/SyncTaskList/components/ExecutionStatus";
import ScheduleInfo from "./components/SyncTaskList/components/ScheduleInfo";
import TaskStatus from "./components/SyncTaskList/components/TaskStatus";
import CustomPagination from "./CustomPagination";
import { generateDataSourceOptions } from "./DataSourceSelect";
import { batchJobExecutorApi } from "./type";

const { RangePicker } = DatePicker;
const { Title, Text } = Typography;

interface PaginationState {
  current: number;
  pageSize: number;
  total: number;
}

interface SearchState {
  jobName?: string;
  id?: string;
  status?: string;
  sourceType?: string;
  sinkType?: string;
  sourceTable?: string;
  sinkTable?: string;
  createTime?: moment.Moment[];
}

const createDefaultTimeRange = () => [
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

const parseSearchParamsFromUrl = (): SearchState => {
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
        : createDefaultTimeRange(),
  };
};

const parsePaginationFromUrl = (): PaginationState => {
  const params = new URLSearchParams(window.location.search);

  return {
    current: Number(params.get("current") || 1),
    pageSize: Number(params.get("pageSize") || 10),
    total: 0,
  };
};

const statusOptions = [
  { label: "运行中", value: "RUNNING" },
  { label: "已完成", value: "COMPLETED" },
  { label: "失败", value: "FAILED" },
];

const statusTabs = [
  { label: "全部任务", value: "ALL" },
  { label: "运行中", value: "RUNNING" },
  { label: "已完成", value: "COMPLETED" },
  { label: "失败", value: "FAILED" },
];

const BatchLinkUpPage: React.FC = () => {
  const initialSearchState = useMemo(() => parseSearchParamsFromUrl(), []);

  const [taskList, setTaskList] = useState<any[]>([]);
  const [searchParams, setSearchParams] =
    useState<SearchState>(initialSearchState);
  const [filterDraft, setFilterDraft] =
    useState<SearchState>(initialSearchState);
  const [pagination, setPagination] = useState<PaginationState>(() =>
    parsePaginationFromUrl()
  );
  const [loading, setLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [showMoreFilters, setShowMoreFilters] = useState(
    Boolean(
      initialSearchState.id ||
        initialSearchState.sourceTable ||
        initialSearchState.sinkTable
    )
  );

  const connectorOptions = useMemo(() => generateDataSourceOptions(), []);

  const syncUrlParams = (
    params: SearchState,
    pageInfo: {
      current: number;
      pageSize: number;
    }
  ) => {
    const query = new URLSearchParams();

    if (params.jobName) query.set("jobName", params.jobName);
    if (params.id) query.set("id", params.id);
    if (params.status) query.set("status", params.status);
    if (params.sourceType) query.set("sourceType", params.sourceType);
    if (params.sinkType) query.set("sinkType", params.sinkType);
    if (params.sourceTable) query.set("sourceTable", params.sourceTable);
    if (params.sinkTable) query.set("sinkTable", params.sinkTable);

    if (params.createTime?.length === 2) {
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

    history.replace({ search: `?${query.toString()}` });
  };

  const fetchTaskList = async () => {
    setLoading(true);
    const transformedParams: any = { ...searchParams };

    if (transformedParams.createTime?.length === 2) {
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
      setPagination((previous) => ({
        ...previous,
        total: data?.data?.pagination?.total || 0,
      }));
    } catch {
      message.error("查询离线同步任务失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    syncUrlParams(searchParams, pagination);
  }, [searchParams, pagination.current, pagination.pageSize]);

  useEffect(() => {
    fetchTaskList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, pagination.current, pagination.pageSize]);

  const handleCreated = () => {
    setCreateOpen(false);
    setSelectedRowKeys([]);

    if (pagination.current === 1) {
      void fetchTaskList();
      return;
    }

    setPagination((previous) => ({ ...previous, current: 1 }));
  };

  const goEdit = (id: string, item: any) => {
    if (!id) {
      message.warning("任务定义 ID 不能为空");
      return;
    }

    const mode = item?.mode;
    if (mode === "GUIDE_SINGLE") {
      history.push(`/sync/batch-link-up/${id}/config/single?scene=edit`);
      return;
    }
    if (mode === "GUIDE_MULTI") {
      history.push(`/sync/batch-link-up/${id}/config/multi?scene=edit`);
      return;
    }
    if (mode === "SCRIPT") {
      history.push(`/sync/batch-link-up/${id}/config/script?scene=edit`);
      return;
    }

    message.warning("暂不支持当前任务模式的编辑");
  };

  const copyToClipboard = async (value: string | number) => {
    const text = String(value);
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      message.success("任务定义 ID 已复制");
    } catch {
      message.error("复制失败，请手动复制");
    }
  };

  const handleSearch = () => {
    setSearchParams({ ...filterDraft });
    setPagination((previous) => ({ ...previous, current: 1 }));
  };

  const handleReset = () => {
    const resetState: SearchState = { createTime: createDefaultTimeRange() };
    setFilterDraft(resetState);
    setSearchParams(resetState);
    setPagination((previous) => ({ ...previous, current: 1 }));
  };

  const updateFilterDraft = (field: keyof SearchState, value: any) => {
    setFilterDraft((previous) => ({ ...previous, [field]: value }));
  };

  const handlePaginationChange = (page: number, pageSize: number) => {
    setPagination((previous) => ({ ...previous, current: page, pageSize }));
  };

  const rowSelection: TableRowSelection<any> = {
    selectedRowKeys,
    onChange: setSelectedRowKeys,
  };

  const getSelectedRows = () => {
    const selectedKeySet = new Set(selectedRowKeys.map(String));
    return taskList.filter((item) => selectedKeySet.has(String(item?.id)));
  };

  const isOnline = (record: any) =>
    String(record?.releaseState || "").toUpperCase() === "ONLINE";
  const isRunning = (record: any) =>
    RUNNING_STATUS_SET.has(String(record?.lastJobStatus || "").toUpperCase());
  const buildJobLabel = (record: any) =>
    `${record?.jobName || "-"}(${record?.id || "-"})`;

  const buildLimitedJobLabels = (records: any[]) => {
    const labels = records.slice(0, 3).map(buildJobLabel).join("、");
    return records.length <= 3
      ? labels
      : `${labels} 等 ${records.length} 个任务`;
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

    let startTooltip: string | undefined;
    let stopTooltip: string | undefined;

    if (offlineRows.length > 0) {
      startTooltip = `存在未上线任务，请先上线后再启动：${buildLimitedJobLabels(
        offlineRows
      )}`;
    } else if (runningRows.length > 0) {
      startTooltip = `存在运行中的任务，请只选择未运行任务：${buildLimitedJobLabels(
        runningRows
      )}`;
    }

    if (notRunningRows.length > 0) {
      stopTooltip = `存在未运行任务，请只选择运行中的任务：${buildLimitedJobLabels(
        notRunningRows
      )}`;
    }

    return {
      startDisabled: offlineRows.length > 0 || runningRows.length > 0,
      stopDisabled: notRunningRows.length > 0,
      startTooltip,
      stopTooltip,
    };
  };

  const batchActionState = getBatchActionState();

  const getErrorMessage = (error: any, fallback: string) =>
    error?.response?.data?.message ||
    error?.response?.data?.msg ||
    error?.data?.message ||
    error?.data?.msg ||
    error?.message ||
    fallback;

  const onStartAll = async () => {
    const selectedRows = getSelectedRows();

    if (selectedRows.length === 0) {
      message.warning("请先选择要启动的任务");
      return;
    }

    const offlineRows = selectedRows.filter((item) => !isOnline(item));
    if (offlineRows.length > 0) {
      message.warning(
        `存在未上线任务，请先上线后再启动：${buildLimitedJobLabels(
          offlineRows
        )}`
      );
      return;
    }

    const runningRows = selectedRows.filter(isRunning);
    if (runningRows.length > 0) {
      message.warning(
        `存在运行中的任务，请只选择未运行任务：${buildLimitedJobLabels(
          runningRows
        )}`
      );
      return;
    }

    try {
      const data = await batchJobExecutorApi.batchExecute(selectedRowKeys);
      if (data?.code !== API_SUCCESS_CODE) {
        message.error(data?.message || data?.msg || "批量启动失败");
        return;
      }
      const result = data?.data;
      message.success(
        `批量启动完成：成功 ${result?.successCount || 0} 个，失败 ${
          result?.failedCount || 0
        } 个`
      );
      setSelectedRowKeys([]);
      fetchTaskList();
    } catch (error: any) {
      message.error(getErrorMessage(error, "批量启动失败"));
    }
  };

  const onStopAll = async () => {
    const selectedRows = getSelectedRows();

    if (selectedRows.length === 0) {
      message.warning("请先选择要停止的任务");
      return;
    }

    const notRunningRows = selectedRows.filter((item) => !isRunning(item));
    if (notRunningRows.length > 0) {
      message.warning(
        `存在未运行任务，请只选择运行中的任务：${buildLimitedJobLabels(
          notRunningRows
        )}`
      );
      return;
    }

    try {
      const data = await batchJobExecutorApi.batchPause(selectedRowKeys);
      if (data?.code !== API_SUCCESS_CODE) {
        message.error(data?.message || data?.msg || "批量停止失败");
        return;
      }
      const result = data?.data;
      message.success(
        `批量停止完成：成功 ${result?.successCount || 0} 个，失败 ${
          result?.failedCount || 0
        } 个`
      );
      setSelectedRowKeys([]);
      fetchTaskList();
    } catch (error: any) {
      message.error(getErrorMessage(error, "批量停止失败"));
    }
  };

  const handleTabChange = (value: string | number) => {
    const nextStatus = value === "ALL" ? undefined : String(value);
    const nextDraft = { ...filterDraft, status: nextStatus };
    setFilterDraft(nextDraft);
    setSearchParams(nextDraft);
    setPagination((previous) => ({ ...previous, current: 1 }));
  };

  const currentTab = filterDraft.status || searchParams.status || "ALL";

  const compactContentClass = [
    "text-[12px]",
    "leading-5",
    "text-[#667085]",
    "[&_ul]:!my-0",
    "[&_ol]:!my-0",
    "[&_li]:!my-0",
    "[&_li]:!leading-5",
    "[&_p]:!my-0",
  ].join(" ");

  const columns = [
    {
      title: "名称 / ID",
      dataIndex: "jobName",
      width: 250,
      render: (_value: any, record: any) => (
        <div className="min-w-0 py-0.5">
          <div
            className="truncate text-[13px] font-medium leading-5 text-[#344054]"
            title={record?.jobName}
          >
            {record?.jobName || "-"}
          </div>

          <div className="mt-0.5 flex h-5 items-center gap-1 text-[11px] leading-5 text-[#98a2b3]">
            <span className="truncate">ID：{record?.id || "-"}</span>

            {record?.id && (
              <Tooltip title="复制任务定义 ID">
                <Button
                  type="text"
                  size="small"
                  icon={<CopyOutlined className="text-[11px]" />}
                  className={[
                    "!flex",
                    "!h-5",
                    "!w-5",
                    "!min-w-0",
                    "!items-center",
                    "!justify-center",
                    "!p-0",
                    "!text-[#98a2b3]",
                    "hover:!bg-[#f2f4f7]",
                    "hover:!text-[#475467]",
                  ].join(" ")}
                  onClick={(event) => {
                    event.stopPropagation();
                    copyToClipboard(record.id);
                  }}
                />
              </Tooltip>
            )}
          </div>
        </div>
      ),
    },
    {
      title: "数据源同步方案",
      dataIndex: "syncPlan",
      width: 290,
      render: (_value: any, record: any) => (
        <div className={compactContentClass}>
          <DataSourceSyncPlan record={record} />
        </div>
      ),
    },
    {
      title: "状态",
      dataIndex: "lastJobStatus",
      width: 100,
      align: "center" as const,
      render: (_value: any, record: any) => (
        <div className="flex min-h-6 items-center justify-center">
          <TaskStatus
            status={record?.lastJobStatus}
            errorMessage={record?.lastErrorMessage}
          />
        </div>
      ),
    },
    {
      title: "执行概况",
      dataIndex: "execution",
      width: 200,
      render: (_value: any, record: any) => (
        <div className={compactContentClass}>
          <ExecutionStatus record={record} />
        </div>
      ),
    },
    {
      title: "调度信息",
      dataIndex: "schedule",
      width: 225,
      render: (_value: any, record: any) => (
        <div className={compactContentClass}>
          <ScheduleInfo record={record} />
        </div>
      ),
    },
    {
      title: "创建时间",
      dataIndex: "createTime",
      width: 165,
      render: (value: string) => (
        <span className="whitespace-nowrap text-[12px] leading-5 text-[#98a2b3]">
          {value || "-"}
        </span>
      ),
    },
    {
      title: "操作",
      dataIndex: "operate",
      width: 190,
      fixed: "right" as const,
      render: (_value: any, record: any) => (
        <div className="flex min-h-7 items-center">
          <ActionColumn record={record} cbk={fetchTaskList} goDetail={goEdit} />
        </div>
      ),
    },
  ];

  return (
    <ConfigProvider
      theme={{
        token: {
          borderRadius: 10,
          colorBorder: "#f0f0f0",
          colorBgContainer: "#ffffff",
        },
        components: {
          Button: {
            borderRadius: 8,
          },
          Input: {
            activeShadow: "none",
          },
          Select: {
            activeOutlineColor: "transparent",
          },
        },
      }}
    >
      <div className="flex min-h-[calc(100vh-64px)] flex-col bg-white px-5 pt-4">
        <h1 style={{fontSize: 17}}>离线同步</h1>
        <div className="mx-auto flex w-full max-w-full flex-1 flex-col">
          <div className="mb-3">
            {/* 查询区域 */}
            <div className="border-b border-[#f0f0f0]">
              <div className="flex min-h-[44px] flex-wrap items-center gap-x-4 gap-y-2 py-2">
                <div className="flex min-w-[420px] flex-1 items-center gap-3">
                  <span className="shrink-0 text-[13px] text-[#344054]">
                    任务名称：
                  </span>

                  <Input
                    allowClear
                    value={filterDraft.jobName}
                    variant="filled"
                    onChange={(event) =>
                      updateFilterDraft(
                        "jobName",
                        event.target.value || undefined
                      )
                    }
                    onPressEnter={handleSearch}
                    placeholder="请输入任务名"
                    className="!h-8 min-w-[240px] flex-1"
                  />
                </div>

                <div className="flex min-w-[420px] flex-1 items-center gap-3">
                  <span className="shrink-0 text-[13px] text-[#344054]">
                    任务 ID：
                  </span>

                  <Input
                    allowClear
                    value={filterDraft.id}
                    variant="filled"
                    onChange={(event) =>
                      updateFilterDraft("id", event.target.value || undefined)
                    }
                    onPressEnter={handleSearch}
                    placeholder="请输入任务 ID"
                    className="!h-8 min-w-[240px] flex-1"
                  />
                </div>

                <div className="ml-auto flex shrink-0 items-center gap-2">
                  <Button
                    size="small"
                    className="!h-8 !px-4"
                    onClick={handleSearch}
                  >
                    搜索
                  </Button>

                  <Button
                    size="small"
                    className="!h-8 !px-4"
                    onClick={handleReset}
                  >
                    重置
                  </Button>

                  <Button
                    type="link"
                    size="small"
                    className="!h-8 !px-1"
                    onClick={() => setShowMoreFilters((current) => !current)}
                  >
                    {showMoreFilters ? "收起" : "展开"}

                    <DownOutlined
                      className={[
                        "ml-1 text-[10px] transition-transform",
                        showMoreFilters ? "rotate-180" : "",
                      ].join(" ")}
                    />
                  </Button>
                </div>
              </div>

              {showMoreFilters && (
                <div className="flex flex-wrap items-center gap-4 pb-3">
                  <div className="flex min-w-[300px] items-center gap-3">
                    <span className="shrink-0 text-[13px] text-[#344054]">
                      来源类型：
                    </span>

                    <Select
                      variant="filled"
                      allowClear
                      showSearch
                      value={filterDraft.sourceType}
                      onChange={(value) =>
                        updateFilterDraft("sourceType", value)
                      }
                      options={connectorOptions}
                      placeholder="请选择来源类型"
                      className="w-[200px]"
                    />
                  </div>

                  <div className="flex min-w-[300px] items-center gap-3">
                    <span className="shrink-0 text-[13px] text-[#344054]">
                      目标类型：
                    </span>

                    <Select
                      variant="filled"
                      allowClear
                      showSearch
                      value={filterDraft.sinkType}
                      onChange={(value) => updateFilterDraft("sinkType", value)}
                      options={connectorOptions}
                      placeholder="请选择目标类型"
                      className="w-[200px]"
                    />
                  </div>

                  <div className="flex min-w-[360px] items-center gap-3">
                    <span className="shrink-0 text-[13px] text-[#344054]">
                      创建时间：
                    </span>

                    <RangePicker
                      variant="filled"
                      value={filterDraft.createTime as any}
                      onChange={(value) =>
                        updateFilterDraft("createTime", value || undefined)
                      }
                      className="w-[280px]"
                    />
                  </div>

                  <div className="flex min-w-[360px] items-center gap-3">
                    <span className="shrink-0 text-[13px] text-[#344054]">
                      来源表：
                    </span>

                    <Input
                      variant="filled"
                      allowClear
                      value={filterDraft.sourceTable}
                      onChange={(event) =>
                        updateFilterDraft(
                          "sourceTable",
                          event.target.value || undefined
                        )
                      }
                      onPressEnter={handleSearch}
                      placeholder="请输入来源表"
                      className="w-[260px]"
                    />
                  </div>

                  <div className="flex min-w-[360px] items-center gap-3">
                    <span className="shrink-0 text-[13px] text-[#344054]">
                      目标表：
                    </span>

                    <Input
                      allowClear
                      variant="filled"
                      value={filterDraft.sinkTable}
                      onChange={(event) =>
                        updateFilterDraft(
                          "sinkTable",
                          event.target.value || undefined
                        )
                      }
                      onPressEnter={handleSearch}
                      placeholder="请输入目标表"
                      className="w-[260px]"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 操作区域 */}
            <div className="flex min-h-[48px] items-center justify-between">
              <div className="flex items-center gap-3">
                {/* <Button
                  size="small"
                  icon={<ReloadOutlined spin={loading} />}
                  className="!h-8 !w-8 !px-0"
                  onClick={fetchTaskList}
                /> */}
              </div>

              <div className="flex items-center gap-2" style={{marginBottom: 4}}>
                <Button
                  type="primary"
                  size="small"
                  danger
                  className="!h-7"
                  style={{ marginTop: 12 }}
                  onClick={() => setCreateOpen(true)}
                >
                  <span style={{ fontSize: 13 }}>新建同步任务</span>
                </Button>
              </div>
            </div>

            {/* 提示区域 */}
            <div className="flex min-h-9 items-center rounded-sm bg-[#fff7e6] px-3 text-[12px] text-[#475467]">
              <span className="mr-2 text-[14px] text-[#faad14]">▲</span>

              <span className="font-medium text-[#344054]">【提示】</span>

              <span>
                任务交互升级，增加了“发布”动作，在“启动”任务前，需要先保证已经进行了“发布”。
              </span>
            </div>
          </div>
          <Divider style={{ marginTop: 4, marginBottom: 16 }} />
          <div className="flex-1">
            <Table
              columns={columns as any}
              dataSource={taskList}
              rowKey="id"
              bordered
              size="small"
              pagination={false}
              loading={loading}
              rowSelection={{
                type: "checkbox",
                columnWidth: 48,
                ...rowSelection,
              }}
              scroll={{ x: "max-content" }}
              className={[
                "compact-sync-task-table",

                // 表格整体
                "[&_.ant-table]:!text-[13px]",
                "[&_.ant-table-container]:!border-[#eaecf0]",
                "[&_.ant-table-cell]:!align-middle",

                // 表头
                "[&_.ant-table-thead>tr>th]:!h-10",
                "[&_.ant-table-thead>tr>th]:!bg-[#f8f9fb]",
                "[&_.ant-table-thead>tr>th]:!px-4",
                "[&_.ant-table-thead>tr>th]:!py-2",
                "[&_.ant-table-thead>tr>th]:!text-[12px]",
                "[&_.ant-table-thead>tr>th]:!font-medium",
                "[&_.ant-table-thead>tr>th]:!text-[#667085]",
                "[&_.ant-table-thead>tr>th]:!border-[#eaecf0]",

                // 表体
                "[&_.ant-table-tbody>tr>td]:!px-4",
                "[&_.ant-table-tbody>tr>td]:!py-2.5",
                "[&_.ant-table-tbody>tr>td]:!border-[#f0f2f5]",
                "[&_.ant-table-tbody>tr>td]:!text-[#667085]",
                "[&_.ant-table-tbody>tr:hover>td]:!bg-[#fafbfc]",

                // 固定操作列
                "[&_.ant-table-cell-fix-right]:!bg-white",
                "[&_.ant-table-tbody>tr:hover_.ant-table-cell-fix-right]:!bg-[#fafbfc]",

                // 复选框
                "[&_.ant-checkbox-inner]:!h-4",
                "[&_.ant-checkbox-inner]:!w-4",

                // 空状态
                "[&_.ant-table-placeholder>td]:!h-[240px]",
              ].join(" ")}
              locale={{
                emptyText: (
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description={
                      <span className="text-[12px] text-[#98a2b3]">
                        暂无离线同步任务
                      </span>
                    }
                  />
                ),
              }}
            />
          </div>

          <div className="sticky bottom-0 z-20 mt-auto flex min-h-[56px] items-center justify-end border border-t-0 border-[#e5e7eb] bg-white px-5 py-3 shadow-[0_-4px_12px_rgba(16,24,40,0.04)]">
            <CustomPagination
              total={pagination.total}
              current={pagination.current}
              pageSize={pagination.pageSize}
              onChange={handlePaginationChange}
            />
          </div>
        </div>

        <CreateSyncTaskDrawer
          open={createOpen}
          onCancel={() => setCreateOpen(false)}
          onCreated={handleCreated}
        />
      </div>
    </ConfigProvider>
  );
};

export default BatchLinkUpPage;

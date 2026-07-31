import { API_SUCCESS_CODE } from '@/services/http/response';
import {
  ArrowRight,
  ChevronDown,
  Copy,
  PauseCircle,
  PlayCircle,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { history } from "@umijs/max";
import {
  DatePicker,
  Empty,
  Input,
  message,
  Select,
  Table,
  Tooltip,
} from "antd";
import type { TableRowSelection } from "antd/es/table/interface";
import moment from "moment";
import React, {
  useEffect,
  useMemo,
  useState,
} from "react";
import { linkupJobDefinitionApi } from "./api";
import CreateSyncTaskDrawer from "./components/CreateSyncTaskModal";
import ActionColumn from "./components/SyncTaskList/components/ActionColumn";
import DataSourceSyncPlan from "./components/SyncTaskList/components/DataSourceSyncPlan";
import ExecutionStatus from "./components/SyncTaskList/components/ExecutionStatus";
import ScheduleInfo from "./components/SyncTaskList/components/ScheduleInfo";
import TaskStatus from "./components/SyncTaskList/components/TaskStatus";

import { generateDataSourceOptions } from "./DataSourceSelect";
import { batchJobExecutorApi } from "./type";
import CustomPagination from "./CustomPagination";

const { RangePicker } = DatePicker;

interface ConnectorType {
  dbType: string;
  connectorType: string;
  pluginName: string;
}

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

const DEFAULT_CONNECTOR: ConnectorType = {
  dbType: "MYSQL",
  connectorType: "Jdbc",
  pluginName: "JDBC-MYSQL",
};

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
  const params = new URLSearchParams(
    window.location.search
  );

  const createTimeStart =
    params.get("createTimeStart");
  const createTimeEnd =
    params.get("createTimeEnd");

  return {
    jobName:
      params.get("jobName") || undefined,
    id: params.get("id") || undefined,
    status:
      params.get("status") || undefined,
    sourceType:
      params.get("sourceType") || undefined,
    sinkType:
      params.get("sinkType") || undefined,
    sourceTable:
      params.get("sourceTable") || undefined,
    sinkTable:
      params.get("sinkTable") || undefined,
    createTime:
      createTimeStart && createTimeEnd
        ? [
            moment(
              createTimeStart,
              "YYYY-MM-DD HH:mm:ss"
            ),
            moment(
              createTimeEnd,
              "YYYY-MM-DD HH:mm:ss"
            ),
          ]
        : createDefaultTimeRange(),
  };
};

const parsePaginationFromUrl =
  (): PaginationState => {
    const params = new URLSearchParams(
      window.location.search
    );

    return {
      current: Number(
        params.get("current") || 1
      ),
      pageSize: Number(
        params.get("pageSize") || 10
      ),
      total: 0,
    };
  };

const BatchLinkUpPage: React.FC = () => {
  const [sourceType, setSourceType] =
    useState<ConnectorType>(
      DEFAULT_CONNECTOR
    );

  const [targetType, setTargetType] =
    useState<ConnectorType>(
      DEFAULT_CONNECTOR
    );

  const initialSearchState = useMemo(
    () => parseSearchParamsFromUrl(),
    []
  );

  const [taskList, setTaskList] =
    useState<any[]>([]);

  const [searchParams, setSearchParams] =
    useState<SearchState>(
      initialSearchState
    );

  const [filterDraft, setFilterDraft] =
    useState<SearchState>(
      initialSearchState
    );

  const [pagination, setPagination] =
    useState<PaginationState>(() =>
      parsePaginationFromUrl()
    );

  const [loading, setLoading] =
    useState(false);

  const [createOpen, setCreateOpen] =
    useState(false);

  const [selectedRowKeys, setSelectedRowKeys] =
    useState<React.Key[]>([]);

  const [showMoreFilters, setShowMoreFilters] =
    useState(
      Boolean(
        initialSearchState.id ||
          initialSearchState.sourceTable ||
          initialSearchState.sinkTable
      )
    );

  const connectorOptions = useMemo(
    () => generateDataSourceOptions(),
    []
  );

  const statusOptions = [
    {
      label: "运行中",
      value: "RUNNING",
    },
    {
      label: "已完成",
      value: "COMPLETED",
    },
    {
      label: "失败",
      value: "FAILED",
    },
  ];

  const syncUrlParams = (
    params: SearchState,
    pageInfo: {
      current: number;
      pageSize: number;
    }
  ) => {
    const query = new URLSearchParams();

    if (params.jobName) {
      query.set(
        "jobName",
        params.jobName
      );
    }

    if (params.id) {
      query.set("id", params.id);
    }

    if (params.status) {
      query.set(
        "status",
        params.status
      );
    }

    if (params.sourceType) {
      query.set(
        "sourceType",
        params.sourceType
      );
    }

    if (params.sinkType) {
      query.set(
        "sinkType",
        params.sinkType
      );
    }

    if (params.sourceTable) {
      query.set(
        "sourceTable",
        params.sourceTable
      );
    }

    if (params.sinkTable) {
      query.set(
        "sinkTable",
        params.sinkTable
      );
    }

    if (
      params.createTime?.length === 2
    ) {
      query.set(
        "createTimeStart",
        moment(
          params.createTime[0]
        ).format("YYYY-MM-DD HH:mm:ss")
      );

      query.set(
        "createTimeEnd",
        moment(
          params.createTime[1]
        ).format("YYYY-MM-DD HH:mm:ss")
      );
    }

    query.set(
      "current",
      String(pageInfo.current || 1)
    );

    query.set(
      "pageSize",
      String(pageInfo.pageSize || 10)
    );

    history.replace({
      search: `?${query.toString()}`,
    });
  };

  const fetchTaskList = async () => {
    setLoading(true);

    const transformedParams: any = {
      ...searchParams,
    };

    if (
      transformedParams.createTime?.length === 2
    ) {
      transformedParams.createTimeStart =
        moment(
          transformedParams.createTime[0]
        ).format("YYYY-MM-DD HH:mm:ss");

      transformedParams.createTimeEnd =
        moment(
          transformedParams.createTime[1]
        ).format("YYYY-MM-DD HH:mm:ss");

      delete transformedParams.createTime;
    }

    try {
      const data =
        await linkupJobDefinitionApi.page({
          ...transformedParams,
          current: pagination.current,
          pageSize: pagination.pageSize,
        });

      setTaskList(
        data?.data?.bizData || []
      );

      setPagination((previous) => ({
        ...previous,
        total:
          data?.data?.pagination?.total ||
          0,
      }));
    } catch {
      message.error(
        "查询离线同步任务失败"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    syncUrlParams(
      searchParams,
      pagination
    );
  }, [
    searchParams,
    pagination.current,
    pagination.pageSize,
  ]);

  useEffect(() => {
    fetchTaskList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    searchParams,
    pagination.current,
    pagination.pageSize,
  ]);

  const handleSourceChange = (
    value: string,
    option: any
  ) => {
    setSourceType({
      dbType: value,
      connectorType:
        option?.connectorType,
      pluginName:
        option?.pluginName,
    });
  };

  const handleTargetChange = (
    value: string,
    option: any
  ) => {
    setTargetType({
      dbType: value,
      connectorType:
        option?.connectorType,
      pluginName:
        option?.pluginName,
    });
  };

  const goCreate = () => {
    setCreateOpen(true);
  };

  const handleCreated = () => {
    setCreateOpen(false);
    setSelectedRowKeys([]);

    if (pagination.current === 1) {
      void fetchTaskList();
      return;
    }

    setPagination((previous) => ({
      ...previous,
      current: 1,
    }));
  };

  const goEdit = (
    id: string,
    item: any
  ) => {
    if (!id) {
      message.warning(
        "任务定义 ID 不能为空"
      );
      return;
    }

    const mode = item?.mode;

    if (mode === "GUIDE_SINGLE") {
      history.push(
        `/sync/batch-link-up/${id}/config/single?scene=edit`
      );
      return;
    }

    if (mode === "GUIDE_MULTI") {
      history.push(
        `/sync/batch-link-up/${id}/config/multi?scene=edit`
      );
      return;
    }

    if (mode === "SCRIPT") {
      history.push(
        `/sync/batch-link-up/${id}/config/script?scene=edit`
      );
      return;
    }

    message.warning(
      "暂不支持当前任务模式的编辑"
    );
  };

  const copyToClipboard = async (
    value: string | number
  ) => {
    const text = String(value);

    try {
      if (
        navigator.clipboard &&
        window.isSecureContext
      ) {
        await navigator.clipboard.writeText(
          text
        );
      } else {
        const textarea =
          document.createElement("textarea");

        textarea.value = text;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";

        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }

      message.success(
        "任务定义 ID 已复制"
      );
    } catch {
      message.error(
        "复制失败，请手动复制"
      );
    }
  };

  const handleSearch = () => {
    setSearchParams({
      ...filterDraft,
    });

    setPagination((previous) => ({
      ...previous,
      current: 1,
    }));
  };

  const handleReset = () => {
    const resetState: SearchState = {
      createTime:
        createDefaultTimeRange(),
    };

    setFilterDraft(resetState);
    setSearchParams(resetState);

    setPagination((previous) => ({
      ...previous,
      current: 1,
    }));
  };

  const updateFilterDraft = (
    field: keyof SearchState,
    value: any
  ) => {
    setFilterDraft((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const handlePaginationChange = (
    page: number,
    pageSize: number
  ) => {
    setPagination((previous) => ({
      ...previous,
      current: page,
      pageSize,
    }));
  };

  const rowSelection:
    TableRowSelection<any> = {
      selectedRowKeys,
      onChange: setSelectedRowKeys,
  };

  const getSelectedRows = () => {
    const selectedKeySet = new Set(
      selectedRowKeys.map(String)
    );

    return taskList.filter((item) =>
      selectedKeySet.has(
        String(item?.id)
      )
    );
  };

  const isOnline = (record: any) =>
    String(
      record?.releaseState || ""
    ).toUpperCase() === "ONLINE";

  const isRunning = (record: any) =>
    RUNNING_STATUS_SET.has(
      String(
        record?.lastJobStatus || ""
      ).toUpperCase()
    );

  const buildJobLabel = (
    record: any
  ) =>
    `${record?.jobName || "-"}(${
      record?.id || "-"
    })`;

  const buildLimitedJobLabels = (
    records: any[]
  ) => {
    const labels = records
      .slice(0, 3)
      .map(buildJobLabel)
      .join("、");

    return records.length <= 3
      ? labels
      : `${labels} 等 ${records.length} 个任务`;
  };

  const getBatchActionState = () => {
    const selectedRows =
      getSelectedRows();

    if (selectedRows.length === 0) {
      return {
        startDisabled: true,
        stopDisabled: true,
        startTooltip:
          "请先选择任务",
        stopTooltip:
          "请先选择任务",
      };
    }

    const offlineRows =
      selectedRows.filter(
        (item) => !isOnline(item)
      );

    const runningRows =
      selectedRows.filter(isRunning);

    const notRunningRows =
      selectedRows.filter(
        (item) => !isRunning(item)
      );

    let startTooltip:
      | string
      | undefined;

    let stopTooltip:
      | string
      | undefined;

    if (offlineRows.length > 0) {
      startTooltip =
        `存在未上线任务，请先上线后再启动：${buildLimitedJobLabels(
          offlineRows
        )}`;
    } else if (
      runningRows.length > 0
    ) {
      startTooltip =
        `存在运行中的任务，请只选择未运行任务：${buildLimitedJobLabels(
          runningRows
        )}`;
    }

    if (
      notRunningRows.length > 0
    ) {
      stopTooltip =
        `存在未运行任务，请只选择运行中的任务：${buildLimitedJobLabels(
          notRunningRows
        )}`;
    }

    return {
      startDisabled:
        offlineRows.length > 0 ||
        runningRows.length > 0,
      stopDisabled:
        notRunningRows.length > 0,
      startTooltip,
      stopTooltip,
    };
  };

  const batchActionState =
    getBatchActionState();

  const getErrorMessage = (
    error: any,
    fallback: string
  ) =>
    error?.response?.data?.message ||
    error?.response?.data?.msg ||
    error?.data?.message ||
    error?.data?.msg ||
    error?.message ||
    fallback;

  const onStartAll = async () => {
    const selectedRows =
      getSelectedRows();

    if (selectedRows.length === 0) {
      message.warning(
        "请先选择要启动的任务"
      );
      return;
    }

    const offlineRows =
      selectedRows.filter(
        (item) => !isOnline(item)
      );

    if (offlineRows.length > 0) {
      message.warning(
        `存在未上线任务，请先上线后再启动：${buildLimitedJobLabels(
          offlineRows
        )}`
      );
      return;
    }

    const runningRows =
      selectedRows.filter(isRunning);

    if (runningRows.length > 0) {
      message.warning(
        `存在运行中的任务，请只选择未运行任务：${buildLimitedJobLabels(
          runningRows
        )}`
      );
      return;
    }

    try {
      const data =
        await batchJobExecutorApi.batchExecute(
          selectedRowKeys
        );

      if (data?.code !== API_SUCCESS_CODE) {
        message.error(
          data?.message ||
            data?.msg ||
            "批量启动失败"
        );
        return;
      }

      const result = data?.data;

      message.success(
        `批量启动完成：成功 ${
          result?.successCount || 0
        } 个，失败 ${
          result?.failedCount || 0
        } 个`
      );

      setSelectedRowKeys([]);
      fetchTaskList();
    } catch (error: any) {
      message.error(
        getErrorMessage(
          error,
          "批量启动失败"
        )
      );
    }
  };

  const onStopAll = async () => {
    const selectedRows =
      getSelectedRows();

    if (selectedRows.length === 0) {
      message.warning(
        "请先选择要停止的任务"
      );
      return;
    }

    const notRunningRows =
      selectedRows.filter(
        (item) => !isRunning(item)
      );

    if (
      notRunningRows.length > 0
    ) {
      message.warning(
        `存在未运行任务，请只选择运行中的任务：${buildLimitedJobLabels(
          notRunningRows
        )}`
      );
      return;
    }

    try {
      const data =
        await batchJobExecutorApi.batchPause(
          selectedRowKeys
        );

      if (data?.code !== API_SUCCESS_CODE) {
        message.error(
          data?.message ||
            data?.msg ||
            "批量停止失败"
        );
        return;
      }

      const result = data?.data;

      message.success(
        `批量停止完成：成功 ${
          result?.successCount || 0
        } 个，失败 ${
          result?.failedCount || 0
        } 个`
      );

      setSelectedRowKeys([]);
      fetchTaskList();
    } catch (error: any) {
      message.error(
        getErrorMessage(
          error,
          "批量停止失败"
        )
      );
    }
  };

  const columns = [
    {
      title: "任务信息",
      dataIndex: "jobName",
      width: 230,
      render: (
        _value: any,
        record: any
      ) => (
        <div className="min-w-0">
          <div
            className="
              truncate text-[13px]
              font-semibold text-[#161823]
            "
            title={record?.jobName}
          >
            {record?.jobName || "-"}
          </div>

          <div
            className="
              mt-1 flex items-center
              gap-1 text-[11px]
              text-[rgba(22,24,35,0.42)]
            "
          >
            <span className="truncate">
              ID：{record?.id || "-"}
            </span>

            <Tooltip title="复制任务定义 ID">
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  copyToClipboard(
                    record?.id
                  );
                }}
                className="
                  flex h-5 w-5 shrink-0
                  items-center justify-center
                  rounded border-0
                  bg-transparent
                  text-[rgba(22,24,35,0.35)]
                  transition
                  hover:bg-[#f2f3f5]
                  hover:text-[#161823]
                "
              >
                <Copy
                  size={12}
                  strokeWidth={1.8}
                />
              </button>
            </Tooltip>
          </div>
        </div>
      ),
    },
    {
      title: "同步方向",
      dataIndex: "syncPlan",
      width: 310,
      render: (
        _value: any,
        record: any
      ) => (
        <DataSourceSyncPlan
          record={record}
        />
      ),
    },
    {
      title: "任务状态",
      dataIndex: "lastJobStatus",
      width: 120,
      align: "center" as const,
      render: (
        _value: any,
        record: any
      ) => (
        <div className="flex justify-center">
          <TaskStatus
            status={
              record?.lastJobStatus
            }
            errorMessage={
              record?.lastErrorMessage
            }
          />
        </div>
      ),
    },
    {
      title: "执行概况",
      dataIndex: "execution",
      width: 220,
      render: (
        _value: any,
        record: any
      ) => (
        <ExecutionStatus
          record={record}
        />
      ),
    },
    {
      title: "调度信息",
      dataIndex: "schedule",
      width: 250,
      render: (
        _value: any,
        record: any
      ) => (
        <ScheduleInfo
          record={record}
        />
      ),
    },
    {
      title: "创建时间",
      dataIndex: "createTime",
      width: 170,
      render: (value: string) => (
        <span
          className="
            whitespace-nowrap
            text-[12px]
            text-[rgba(22,24,35,0.55)]
          "
        >
          {value || "-"}
        </span>
      ),
    },
    {
      title: "操作",
      dataIndex: "operate",
      width: 190,
      fixed: "right" as const,
      render: (
        _value: any,
        record: any
      ) => (
        <ActionColumn
          record={record}
          cbk={fetchTaskList}
          goDetail={goEdit}
        />
      ),
    },
  ];

  return (
    <div
      className="
        min-h-full bg-[#f7f8fa]
        p-4 text-[#161823]
      "
    >
      <div
        className="
          overflow-hidden rounded-[12px]
          border border-black/[0.035]
          bg-white
          shadow-[0_6px_28px_rgba(22,24,35,0.035)]
        "
      >
        <header
          className="
            flex h-[76px] items-center
            px-7
          "
        >
          <h1
            className="
              m-0 text-[22px] font-bold
              tracking-[-0.35px]
            "
          >
            离线任务
          </h1>
        </header>

        <section
          className="
            mx-7 overflow-hidden
            rounded-[11px]
            border border-[#ebecef]
            bg-[radial-gradient(circle_at_88%_16%,rgba(88,101,242,0.10),transparent_31%),linear-gradient(110deg,#fbfbff_0%,#f7f8ff_100%)]
            px-4 py-4
          "
        >
          <div
            className="
              grid
              grid-cols-[minmax(260px,1fr)_48px_minmax(260px,1fr)_132px]
              items-center gap-3
              max-xl:grid-cols-1
            "
          >
            <div
              className="
                group flex h-12 items-center
                rounded-[9px]
                border border-black/[0.075]
                bg-white px-4
                shadow-[0_4px_14px_rgba(22,24,35,0.035)]
                transition
                hover:border-[#c9cdfa]
                hover:shadow-[0_6px_18px_rgba(22,24,35,0.055)]
              "
            >
              <span
                className="
                  mr-3 shrink-0
                  text-[11px] font-medium
                  text-[rgba(22,24,35,0.40)]
                "
              >
                来源
              </span>

              <span
                className="
                  mr-3 h-5 w-px
                  bg-black/[0.06]
                "
              />

              <Select
                value={sourceType.dbType}
                onChange={
                  handleSourceChange
                }
                options={connectorOptions}
                bordered={false}
                showSearch
                className="
                  min-w-0 flex-1
                  [&_.ant-select-selector]:!px-0
                  [&_.ant-select-selection-item]:!font-medium
                  [&_.ant-select-selection-item]:!text-[#161823]
                "
              />
            </div>

            <div
              className="
                flex items-center justify-center
                text-[rgba(22,24,35,0.34)]
                max-xl:justify-start
              "
            >
              <span
                className="
                  flex h-8 w-8 items-center
                  justify-center rounded-full
                  border border-black/[0.05]
                  bg-white
                  shadow-[0_3px_10px_rgba(22,24,35,0.05)]
                "
              >
                <ArrowRight
                  size={15}
                  strokeWidth={1.9}
                />
              </span>
            </div>

            <div
              className="
                group flex h-12 items-center
                rounded-[9px]
                border border-black/[0.075]
                bg-white px-4
                shadow-[0_4px_14px_rgba(22,24,35,0.035)]
                transition
                hover:border-[#c9cdfa]
                hover:shadow-[0_6px_18px_rgba(22,24,35,0.055)]
              "
            >
              <span
                className="
                  mr-3 shrink-0
                  text-[11px] font-medium
                  text-[rgba(22,24,35,0.40)]
                "
              >
                去向
              </span>

              <span
                className="
                  mr-3 h-5 w-px
                  bg-black/[0.06]
                "
              />

              <Select
                value={targetType.dbType}
                onChange={
                  handleTargetChange
                }
                options={connectorOptions}
                bordered={false}
                showSearch
                className="
                  min-w-0 flex-1
                  [&_.ant-select-selector]:!px-0
                  [&_.ant-select-selection-item]:!font-medium
                  [&_.ant-select-selection-item]:!text-[#161823]
                "
              />
            </div>

            <button
              type="button"
              disabled={
                !sourceType || !targetType
              }
              onClick={goCreate}
              className="
                flex h-12 items-center
                justify-center gap-2
                rounded-[9px] border-0
                px-4 text-[14px]
                font-semibold text-white
                bg-[linear-gradient(102deg,#fe516e_0%,#fe2c55_100%)]
                shadow-[0_8px_20px_rgba(254,44,85,0.20)]
                
                disabled:cursor-not-allowed
                disabled:opacity-45
              "
            >
              <Plus
                size={16}
                strokeWidth={2.1}
              />
              创建任务
            </button>
          </div>
        </section>

        <section className="px-7 pb-7 pt-6">
          <div
            className="
              overflow-hidden rounded-[11px]
              border border-black/[0.065]
              bg-white
            "
          >
            <div
              className="
                flex min-h-[68px]
                items-center justify-between
                gap-4 px-5
              "
            >
              <div>
                <div
                  className="
                    flex items-center gap-2
                  "
                >
                  <h2
                    className="
                      m-0 text-[16px]
                      font-semibold
                    "
                  >
                    任务列表
                  </h2>

                  <span
                    className="
                      inline-flex h-5 min-w-5
                      items-center justify-center
                      rounded-full bg-[#f2f3f5]
                      px-1.5 text-[10px]
                      font-medium
                      text-[rgba(22,24,35,0.52)]
                    "
                  >
                    {pagination.total}
                  </span>
                </div>
              </div>

              <button
                type="button"
                title="刷新任务列表"
                onClick={fetchTaskList}
                className="
                  flex h-8 w-8
                  items-center justify-center
                  rounded-[7px]
                  border border-black/[0.07]
                  bg-white
                  text-[rgba(22,24,35,0.42)]
                  transition
                  hover:border-[#ffc4d0]
                  hover:bg-[#fff7f8]
                  hover:text-[#fe2c55]
                "
              >
                <RefreshCw
                  size={14}
                  strokeWidth={1.8}
                  className={
                    loading
                      ? "animate-spin"
                      : ""
                  }
                />
              </button>
            </div>

            <div
              className="
                border-y border-black/[0.055]
                bg-[#fafafa] px-4 py-3
              "
            >
              <div
                className="
                  grid
                  grid-cols-[minmax(200px,1.35fr)_minmax(125px,0.78fr)_minmax(140px,0.9fr)_minmax(140px,0.9fr)_minmax(235px,1.2fr)_auto]
                  items-center gap-2.5
                  max-2xl:grid-cols-3
                  max-xl:grid-cols-2
                "
              >
                <Input
                  allowClear
                  value={filterDraft.jobName}
                  onChange={(event) =>
                    updateFilterDraft(
                      "jobName",
                      event.target.value ||
                        undefined
                    )
                  }
                  onPressEnter={handleSearch}
                  prefix={
                    <Search
                      size={14}
                      strokeWidth={1.8}
                      className="
                        text-[rgba(22,24,35,0.30)]
                      "
                    />
                  }
                  placeholder="搜索任务名称"
                  className="
                    h-9 rounded-[7px]
                    border-black/[0.075]
                    bg-white text-[12px]
                    shadow-none
                    hover:border-black/[0.14]
                    focus:border-[#aeb5f5]
                  "
                />

                <Select
                  allowClear
                  value={filterDraft.status}
                  onChange={(value) =>
                    updateFilterDraft(
                      "status",
                      value
                    )
                  }
                  options={statusOptions}
                  placeholder="任务状态"
                  className="
                    h-9 w-full
                    [&_.ant-select-selector]:!h-9
                    [&_.ant-select-selector]:!rounded-[7px]
                    [&_.ant-select-selector]:!border-black/[0.075]
                    [&_.ant-select-selector]:!bg-white
                    [&_.ant-select-selection-item]:!leading-[34px]
                    [&_.ant-select-selection-placeholder]:!leading-[34px]
                  "
                />

                <Select
                  allowClear
                  showSearch
                  value={
                    filterDraft.sourceType
                  }
                  onChange={(value) =>
                    updateFilterDraft(
                      "sourceType",
                      value
                    )
                  }
                  options={connectorOptions}
                  placeholder="来源类型"
                  className="
                    h-9 w-full
                    [&_.ant-select-selector]:!h-9
                    [&_.ant-select-selector]:!rounded-[7px]
                    [&_.ant-select-selector]:!border-black/[0.075]
                    [&_.ant-select-selector]:!bg-white
                    [&_.ant-select-selection-item]:!leading-[34px]
                    [&_.ant-select-selection-placeholder]:!leading-[34px]
                  "
                />

                <Select
                  allowClear
                  showSearch
                  value={
                    filterDraft.sinkType
                  }
                  onChange={(value) =>
                    updateFilterDraft(
                      "sinkType",
                      value
                    )
                  }
                  options={connectorOptions}
                  placeholder="目标类型"
                  className="
                    h-9 w-full
                    [&_.ant-select-selector]:!h-9
                    [&_.ant-select-selector]:!rounded-[7px]
                    [&_.ant-select-selector]:!border-black/[0.075]
                    [&_.ant-select-selector]:!bg-white
                    [&_.ant-select-selection-item]:!leading-[34px]
                    [&_.ant-select-selection-placeholder]:!leading-[34px]
                  "
                />

                <RangePicker
                  value={
                    filterDraft.createTime as any
                  }
                  onChange={(value) =>
                    updateFilterDraft(
                      "createTime",
                      value || undefined
                    )
                  }
                  className="
                    h-9 w-full rounded-[7px]
                    border-black/[0.075]
                    bg-white text-[12px]
                    hover:border-black/[0.14]
                  "
                />

                <div
                  className="
                    flex items-center
                    justify-end gap-2
                    max-2xl:justify-start
                  "
                >
                  <button
                    type="button"
                    onClick={handleSearch}
                    className="
                      flex h-9 items-center
                      justify-center gap-1.5
                      rounded-[7px] border-0
                      bg-[#161823] px-4
                      text-[11px] font-semibold
                      text-white transition
                      hover:bg-[#2b2d38]
                    "
                  >
                    <Search
                      size={13}
                      strokeWidth={2}
                    />
                    查询
                  </button>

                  <button
                    type="button"
                    onClick={handleReset}
                    className="
                      flex h-9 items-center
                      justify-center gap-1.5
                      rounded-[7px]
                      border border-black/[0.075]
                      bg-white px-3
                      text-[11px] font-medium
                      text-[rgba(22,24,35,0.55)]
                      transition
                      hover:border-black/[0.14]
                      hover:text-[#161823]
                    "
                  >
                    <RotateCcw
                      size={13}
                      strokeWidth={1.9}
                    />
                    重置
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setShowMoreFilters(
                        (current) => !current
                      )
                    }
                    className="
                      flex h-9 items-center
                      justify-center gap-1
                      rounded-[7px]
                      border border-transparent
                      bg-transparent px-2
                      text-[10px] font-medium
                      text-[rgba(22,24,35,0.42)]
                      transition
                      hover:bg-white
                      hover:text-[#161823]
                    "
                  >
                    <SlidersHorizontal
                      size={13}
                      strokeWidth={1.8}
                    />
                    {showMoreFilters
                      ? "收起"
                      : "更多"}
                    <ChevronDown
                      size={11}
                      strokeWidth={1.8}
                      className={[
                        "transition-transform",
                        showMoreFilters
                          ? "rotate-180"
                          : "",
                      ].join(" ")}
                    />
                  </button>
                </div>
              </div>

              {showMoreFilters && (
                <div
                  className="
                    mt-3 grid
                    grid-cols-3 gap-2.5
                    border-t border-black/[0.05]
                    pt-3 max-xl:grid-cols-1
                  "
                >
                  <Input
                    allowClear
                    value={filterDraft.id}
                    onChange={(event) =>
                      updateFilterDraft(
                        "id",
                        event.target.value ||
                          undefined
                      )
                    }
                    onPressEnter={handleSearch}
                    placeholder="任务定义 ID"
                    className="
                      h-9 rounded-[7px]
                      border-black/[0.075]
                      bg-white text-[12px]
                    "
                  />

                  <Input
                    allowClear
                    value={
                      filterDraft.sourceTable
                    }
                    onChange={(event) =>
                      updateFilterDraft(
                        "sourceTable",
                        event.target.value ||
                          undefined
                      )
                    }
                    onPressEnter={handleSearch}
                    placeholder="来源表，支持模糊匹配"
                    className="
                      h-9 rounded-[7px]
                      border-black/[0.075]
                      bg-white text-[12px]
                    "
                  />

                  <Input
                    allowClear
                    value={
                      filterDraft.sinkTable
                    }
                    onChange={(event) =>
                      updateFilterDraft(
                        "sinkTable",
                        event.target.value ||
                          undefined
                      )
                    }
                    onPressEnter={handleSearch}
                    placeholder="目标表，支持模糊匹配"
                    className="
                      h-9 rounded-[7px]
                      border-black/[0.075]
                      bg-white text-[12px]
                    "
                  />
                </div>
              )}
            </div>

            <Table
              columns={columns as any}
              dataSource={taskList}
              rowKey="id"
              pagination={false}
              loading={loading}
              rowSelection={{
                type: "checkbox",
                ...rowSelection,
              }}
              scroll={{
                x: "max-content",
              }}
              className={[
                "[&_.ant-table]:!rounded-none",
                "[&_.ant-table-container]:!border-0",
                "[&_.ant-table-thead>tr>th]:!h-11",
                "[&_.ant-table-thead>tr>th]:!border-b",
                "[&_.ant-table-thead>tr>th]:!border-black/[0.055]",
                "[&_.ant-table-thead>tr>th]:!bg-[#fcfcfd]",
                "[&_.ant-table-thead>tr>th]:!text-[11px]",
                "[&_.ant-table-thead>tr>th]:!font-semibold",
                "[&_.ant-table-thead>tr>th]:!text-[rgba(22,24,35,0.60)]",
                "[&_.ant-table-tbody>tr>td]:!border-black/[0.04]",
                "[&_.ant-table-tbody>tr>td]:!py-3",
                "[&_.ant-table-tbody>tr:hover>td]:!bg-[#fafbfc]",
                "[&_.ant-table-placeholder>td]:!h-[280px]",
                "[&_.ant-checkbox-checked_.ant-checkbox-inner]:!border-[#fe2c55]",
                "[&_.ant-checkbox-checked_.ant-checkbox-inner]:!bg-[#fe2c55]",
              ].join(" ")}
              locale={{
                emptyText: (
                  <Empty
                    image={
                      Empty.PRESENTED_IMAGE_SIMPLE
                    }
                    description={
                      <span
                        className="
                          text-[12px]
                          text-[rgba(22,24,35,0.42)]
                        "
                      >
                        暂无离线同步任务
                      </span>
                    }
                  />
                ),
              }}
            />

            <div
              className="
                flex min-h-[58px]
                items-center justify-between
                gap-4 border-t
                border-black/[0.055]
                bg-[#fcfcfd] px-4 py-3
              "
            >
              <div className="flex items-center gap-2.5">
                <Tooltip
                  title={
                    batchActionState.startTooltip
                  }
                >
                  <span>
                    <button
                      type="button"
                      onClick={onStartAll}
                      disabled={
                        batchActionState.startDisabled
                      }
                      className="
                        flex h-8 min-w-[88px]
                        items-center justify-center
                        gap-1.5 rounded-[7px]
                        border-0 bg-[#161823]
                        px-3 text-[10px]
                        font-semibold text-white
                        transition hover:bg-[#2b2d38]
                        disabled:cursor-not-allowed
                        disabled:bg-[#d8d9de]
                      "
                    >
                      <PlayCircle
                        size={14}
                        strokeWidth={1.9}
                      />
                      批量启动
                    </button>
                  </span>
                </Tooltip>

                <Tooltip
                  title={
                    batchActionState.stopTooltip
                  }
                >
                  <span>
                    <button
                      type="button"
                      onClick={onStopAll}
                      disabled={
                        batchActionState.stopDisabled
                      }
                      className="
                        flex h-8 min-w-[88px]
                        items-center justify-center
                        gap-1.5 rounded-[7px]
                        border border-[#ffd3da]
                        bg-white px-3
                        text-[10px] font-semibold
                        text-[#e5484d] transition
                        hover:bg-[#fff5f6]
                        disabled:cursor-not-allowed
                        disabled:border-black/[0.055]
                        disabled:bg-[#f4f4f5]
                        disabled:text-[rgba(22,24,35,0.25)]
                      "
                    >
                      <PauseCircle
                        size={14}
                        strokeWidth={1.9}
                      />
                      批量停止
                    </button>
                  </span>
                </Tooltip>

                <span
                  className="
                    hidden text-[10px]
                    text-[rgba(22,24,35,0.34)]
                    md:inline
                  "
                >
                  {selectedRowKeys.length > 0
                    ? `已选择 ${selectedRowKeys.length} 条任务`
                    : "选择任务后可执行批量操作"}
                </span>
              </div>

              <CustomPagination
                total={pagination.total}
                current={pagination.current}
                pageSize={pagination.pageSize}
                onChange={
                  handlePaginationChange
                }
              />
            </div>
          </div>
        </section>
      </div>

      <CreateSyncTaskDrawer
        open={createOpen}
        source={sourceType}
        target={targetType}
        onCancel={() => setCreateOpen(false)}
        onCreated={handleCreated}
      />
    </div>
  );
};

export default BatchLinkUpPage;
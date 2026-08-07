import { Button, Empty, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { useMemo, type MouseEvent } from "react";
import {
  CheckResultTag,
  ExecutionStatusTag,
} from "../../components/QualityStatus";
import { dataQualityTableClassName } from "../../components/tableStyle";
import type {
  ExecutionWorkspaceListItem,
  RuleExecutionWorkspaceListItem,
} from "../types";

export type ExecutionViewMode = "EXECUTION" | "RULE";

interface Props {
  executionRecords: ExecutionWorkspaceListItem[];
  ruleRecords: RuleExecutionWorkspaceListItem[];
  loading: boolean;
  mode: ExecutionViewMode;
  onOpenExecution: (executionNo: string) => void;
  onOpenMonitor: (monitorId: number) => void;
}

const formatTime = (value?: string) =>
  value ? dayjs(value).format("YYYY-MM-DD HH:mm:ss") : "--";

const triggerLabel = (value: ExecutionWorkspaceListItem["triggerType"]) =>
  value === "SCHEDULE" ? "调度触发" : "手动触发";

const scopeLabel = (value: RuleExecutionWorkspaceListItem["scope"]) =>
  value === "TABLE" ? "表级" : "字段级";

const issueCount = (record: ExecutionWorkspaceListItem) =>
  record.failedRules + record.errorRules;

const ExecutionRecordTable = ({
  executionRecords,
  ruleRecords,
  loading,
  mode,
  onOpenExecution,
  onOpenMonitor,
}: Props) => {
  const executionColumns = useMemo<ColumnsType<ExecutionWorkspaceListItem>>(
    () => [
      {
        title: "ID / 监控名称",
        width: 270,
        fixed: "left",
        render: (_, record) => (
          <div className="min-w-0 py-0.5">
            <div className="truncate text-[11px] text-[#98a2b3]">
              {record.executionNo}
            </div>
            <button
              type="button"
              className="mt-1 block max-w-full cursor-pointer truncate border-0 bg-transparent p-0 text-left font-medium text-[#fe2c55]"
              onClick={(event: MouseEvent<HTMLButtonElement>) => {
                event.stopPropagation();
                onOpenExecution(record.executionNo);
              }}
            >
              {record.monitorName}
            </button>
          </div>
        ),
      },
      {
        title: "数据对象",
        width: 250,
        render: (_, record) => (
          <div className="min-w-0 py-0.5">
            <div className="truncate font-medium text-[#344054]">
              {record.objectName}
            </div>
            <div className="mt-1 truncate text-[11px] text-[#98a2b3]">
              数据源：{record.dataSourceName}
            </div>
          </div>
        ),
      },
      {
        title: "校验状态",
        dataIndex: "executionStatus",
        width: 110,
        render: (value) => <ExecutionStatusTag value={value} />,
      },
      {
        title: "质量结果",
        dataIndex: "checkResult",
        width: 110,
        render: (value) => <CheckResultTag value={value} />,
      },
      {
        title: "问题数量",
        width: 100,
        render: (_, record) =>
          issueCount(record) > 0 ? (
            <Tag color="error" className="!m-0">
              {issueCount(record)}
            </Tag>
          ) : (
            <span className="text-[#98a2b3]">0</span>
          ),
      },
      {
        title: "规则概况",
        width: 230,
        render: (_, record) => (
          <div className="flex items-center gap-3 text-xs">
            <span className="text-[#667085]">共 {record.totalRules}</span>
            <span className="text-[#245bdb]">通过 {record.passedRules}</span>
            <span className="text-[#d92d20]">未通过 {record.failedRules}</span>
            <span className="text-[#b54708]">异常 {record.errorRules}</span>
          </div>
        ),
      },
      {
        title: "触发信息",
        width: 200,
        render: (_, record) => (
          <div className="space-y-1 text-xs">
            <div className="text-[#344054]">
              {triggerLabel(record.triggerType)} · {record.operator || "system"}
            </div>
            <div className="text-[#98a2b3]">
              {formatTime(record.startedAt || record.queuedAt)}
            </div>
          </div>
        ),
      },
      {
        title: "结束时间",
        dataIndex: "finishedAt",
        width: 170,
        render: formatTime,
      },
      {
        title: "操作",
        width: 120,
        fixed: "right",
        render: (_, record) => (
          <div className="flex items-center">
            <Button
              type="link"
              size="small"
              onClick={(event) => {
                event.stopPropagation();
                onOpenExecution(record.executionNo);
              }}
            >
              详情
            </Button>
            <Button
              type="link"
              size="small"
              onClick={(event) => {
                event.stopPropagation();
                onOpenMonitor(record.monitorId);
              }}
            >
              规则
            </Button>
          </div>
        ),
      },
    ],
    [onOpenExecution, onOpenMonitor]
  );

  const ruleColumns = useMemo<ColumnsType<RuleExecutionWorkspaceListItem>>(
    () => [
      {
        title: "ID / 规则名称",
        width: 270,
        fixed: "left",
        render: (_, record) => (
          <div className="min-w-0 py-0.5">
            <div className="truncate text-[11px] text-[#98a2b3]">
              {record.ruleId} · {record.executionNo}
            </div>
            <button
              type="button"
              className="mt-1 block max-w-full cursor-pointer truncate border-0 bg-transparent p-0 text-left font-medium text-[#fe2c55]"
              onClick={(event: MouseEvent<HTMLButtonElement>) => {
                event.stopPropagation();
                onOpenExecution(record.executionNo);
              }}
            >
              {record.ruleName}
            </button>
          </div>
        ),
      },
      {
        title: "质量维度",
        dataIndex: "dimension",
        width: 110,
      },
      {
        title: "校验状态",
        dataIndex: "executionStatus",
        width: 110,
        render: (value) => <ExecutionStatusTag value={value} />,
      },
      {
        title: "问题处置",
        width: 110,
        render: (_, record) =>
          ["NOT_PASSED", "ERROR"].includes(record.checkResult) ? (
            <span className="text-[#d92d20]">存在问题</span>
          ) : (
            <span className="text-[#98a2b3]">-</span>
          ),
      },
      {
        title: "结束时间",
        dataIndex: "finishedAt",
        width: 170,
        render: formatTime,
      },
      {
        title: "表名",
        width: 180,
        render: (_, record) => (
          <div className="min-w-0">
            <div className="truncate text-[#344054]">{record.tableName}</div>
            <div className="mt-1 truncate text-[11px] text-[#98a2b3]">
              {record.dataSourceName}
            </div>
          </div>
        ),
      },
      {
        title: "关联范围",
        dataIndex: "scope",
        width: 110,
        render: (value) => (
          <Tag className="!m-0 !border-0 !bg-[#fff0f3] !text-[#fe2c55]">
            {scopeLabel(value)}
          </Tag>
        ),
      },
      {
        title: "规则模板",
        dataIndex: "templateCode",
        width: 170,
      },
      {
        title: "重要程度",
        width: 110,
        render: () => <span className="text-[#98a2b3]">--</span>,
      },
      {
        title: "监控阈值",
        dataIndex: "expectedValue",
        width: 180,
        render: (value) => value || "--",
      },
      {
        title: "监控值",
        dataIndex: "metricValue",
        width: 150,
        render: (value) => value || "--",
      },
      {
        title: "质量结果",
        dataIndex: "checkResult",
        width: 110,
        render: (value) => <CheckResultTag value={value} />,
      },
      {
        title: "操作",
        width: 120,
        fixed: "right",
        render: (_, record) => (
          <div className="flex items-center">
            <Button
              type="link"
              size="small"
              onClick={(event) => {
                event.stopPropagation();
                onOpenExecution(record.executionNo);
              }}
            >
              详情
            </Button>
            <Button
              type="link"
              size="small"
              onClick={(event) => {
                event.stopPropagation();
                onOpenMonitor(record.monitorId);
              }}
            >
              规则
            </Button>
          </div>
        ),
      },
    ],
    [onOpenExecution, onOpenMonitor]
  );

  const emptyText = (
    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无运行记录" />
  );
  const tableClassName = dataQualityTableClassName(
    "[&_.ant-table-container]:!rounded-none [&_.ant-table-container]:!border-x-0"
  );

  if (mode === "RULE") {
    return (
      <Table<RuleExecutionWorkspaceListItem>
        rowKey={(record) => `${record.executionNo}-${record.id}`}
        size="small"
        bordered
        loading={loading}
        pagination={false}
        scroll={{ x: 1900 }}
        dataSource={ruleRecords}
        columns={ruleColumns}
        locale={{ emptyText }}
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
        onRow={(record) => ({
          onClick: () => onOpenExecution(record.executionNo),
          className: "cursor-pointer",
        })}
      />
    );
  }

  return (
    <Table<ExecutionWorkspaceListItem>
      rowKey="executionNo"
      size="small"
      bordered
      loading={loading}
      pagination={false}
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
      scroll={{ x: 1460 }}
      dataSource={executionRecords}
      columns={executionColumns}
      locale={{ emptyText }}
      onRow={(record) => ({
        onClick: () => onOpenExecution(record.executionNo),
        className: "cursor-pointer",
      })}
    />
  );
};

export default ExecutionRecordTable;

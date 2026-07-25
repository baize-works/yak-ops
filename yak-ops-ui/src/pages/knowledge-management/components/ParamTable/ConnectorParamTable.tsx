import { Empty, Space, Table, Tag, Typography } from "antd";
import type { ColumnsType, TablePaginationConfig } from "antd/es/table";
import React from "react";
import { BLUE, BORDER_COLOR } from "../../constants/ui";
import { MenuKey, ParamItem } from "../../types";

const { Text } = Typography;

interface Props {
  activeMenu: MenuKey;
  dataSource: ParamItem[];
  loading?: boolean;
  pagination?: false | TablePaginationConfig;
  onEdit: (record: ParamItem) => void;
  onDelete: (record: ParamItem) => void;
}

const pillStyle: React.CSSProperties = {
  borderRadius: 999,
  paddingInline: 10,
  fontSize: 12,
  lineHeight: "20px",
};

const softCodeStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  maxWidth: "100%",
  padding: "2px 10px",
  borderRadius: 10,
  background: "#F5F7FA",
  border: "1px solid #EAECF0",
  color: "#344054",
  fontSize: 12,
  lineHeight: "20px",
  fontFamily:
    'ui-monospace, SFMono-Regular, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
};

const actionStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 500,
  cursor: "pointer",
  padding: "4px 10px",
  borderRadius: 8,
  border: "none",
  outline: "none",
  transition: "all 180ms cubic-bezier(0.22, 1, 0.36, 1)",
  transform: "translateY(0) scale(1)",
};

const ConnectorParamTable: React.FC<Props> = ({
  dataSource,
  loading = false,
  pagination,
  onEdit,
  onDelete,
}) => {
  const columns: ColumnsType<ParamItem> = [
    {
      title: "LinkUp连接器",
      dataIndex: "connectorName",
      key: "connectorName",
      width: 170,
      render: (_, record) => {
        if (record.type !== "connector") {
          return <Text type="secondary">-</Text>;
        }

        return (
          <div className="min-w-0 py-1">
            <div className="flex items-center gap-2">
              <span
                className="truncate text-[14px] font-semibold leading-[22px]"
                style={{ color: "#245BDB" }}
                title={record.connectorName || "-"}
              >
                {record.connectorName || "-"}
              </span>
            </div>

            {record.connectorType ? (
              <div className="mt-1 text-[12px] leading-5 text-[#98A2B3]">
                类型：{record.connectorType}
              </div>
            ) : null}
          </div>
        );
      },
    },
    {
      title: "参数名",
      dataIndex: "paramName",
      key: "paramName",
      width: 170,
      render: (_, record) => (
        <div className="min-w-0">
          <div className="truncate text-[14px] font-semibold leading-[22px] text-[#101828]">
            {record.paramName || "-"}
          </div>
        </div>
      ),
    },
    {
      title: "说明",
      dataIndex: "paramDesc",
      key: "paramDesc",
      ellipsis: true,
      render: (value: string) => (
        <Text className="text-[13px] leading-6 text-[#475467]">
          {value || "-"}
        </Text>
      ),
    },
    {
      title: "类型",
      dataIndex: "paramType",
      key: "paramType",
      width: 130,
      render: (_, record) =>
        record.type === "connector" ? (
          <Tag
            bordered
            style={{
              marginInlineEnd: 0,
              borderRadius: 10,
              paddingInline: 10,
              color: "#175CD3",
              background: "#EFF8FF",
              borderColor: "#B2DDFF",
              fontSize: 12,
            }}
          >
            {record.paramType || "-"}
          </Tag>
        ) : (
          <Text type="secondary">-</Text>
        ),
    },
    {
      title: "是否必填",
      dataIndex: "required",
      key: "required",
      width: 120,
      render: (_, record) =>
        record.type === "connector" ? (
          record.required ? (
            <Tag
              bordered
              style={{
                marginInlineEnd: 0,
                borderRadius: 10,
                paddingInline: 10,
                color: "#D92D20",
                background: "#FEF3F2",
                borderColor: "#FECDCA",
                fontSize: 12,
                fontWeight: 500,
              }}
            >
              必填
            </Tag>
          ) : (
            <Tag
              bordered
              style={{
                marginInlineEnd: 0,
                borderRadius: 10,
                paddingInline: 10,
                color: "#475467",
                background: "#F8FAFC",
                borderColor: "#E4E7EC",
                fontSize: 12,
              }}
            >
              非必填
            </Tag>
          )
        ) : (
          <Text type="secondary">-</Text>
        ),
    },
    {
      title: "默认值",
      dataIndex: "defaultValue",
      key: "defaultValue",
      width: 180,
      ellipsis: true,
      render: (value?: string) =>
        value ? (
          <span style={softCodeStyle} title={value}>
            {value}
          </span>
        ) : (
          <Text type="secondary">-</Text>
        ),
    },
    {
      title: "示例值",
      dataIndex: "exampleValue",
      key: "exampleValue",
      width: 170,
      ellipsis: true,
      render: (value?: string) =>
        value ? (
          <span style={softCodeStyle} title={value}>
            {value}
          </span>
        ) : (
          <Text type="secondary">-</Text>
        ),
    },
    {
      title: "操作",
      key: "action",
      width: 150,
      fixed: "right",
      render: (_: unknown, record: ParamItem) => (
        <Space size={8}>
          <button
            type="button"
            className="connector-param-table__action connector-param-table__action--edit"
            onClick={() => onEdit(record)}
            style={{
              ...actionStyle,
              color: BLUE,
              background: "#F5F8FF",
            }}
          >
            编辑
          </button>

          <button
            type="button"
            className="connector-param-table__action connector-param-table__action--delete"
            onClick={() => onDelete(record)}
            style={{
              ...actionStyle,
              color: "#D92D20",
              background: "#FEF3F2",
            }}
          >
            删除
          </button>
        </Space>
      ),
    },
  ];

  return (
    <div
      className="overflow-hidden rounded-[16px] bg-white"
      style={{
        border: `1px solid ${BORDER_COLOR}`,
        boxShadow: "0 4px 18px rgba(16, 24, 40, 0.04)",
      }}
    >
      <Table<ParamItem>
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={dataSource}
        pagination={
          pagination ?? {
            pageSize: 10,
            showSizeChanger: false,
            showTotal: (total) => `共 ${total} 条`,
          }
        }
        locale={{
          emptyText: (
            <div className="py-14">
              <Empty description="暂无 Connector 参数" />
            </div>
          ),
        }}
        scroll={{ x: 1280, y: "calc(100vh - 430px)" }}
        rowClassName={() => "connector-param-table-row"}
      />

      <style>
        {`
          .ant-table-wrapper .ant-table-thead > tr > th {
            background: #f8fafc;
            color: #344054;
            font-weight: 600;
            font-size: 13px;
            border-bottom: 1px solid #eef2f6;
          }

          .ant-table-wrapper .ant-table-tbody > tr > td {
            border-bottom: 1px solid #f2f4f7;
            vertical-align: middle;
          }

          .ant-table-wrapper .connector-param-table-row:hover > td {
            background: #fafcff !important;
          }

          .ant-table-wrapper .ant-table-pagination {
            margin: 16px 16px 18px;
          }
        `}
      </style>
    </div>
  );
};

export default ConnectorParamTable;

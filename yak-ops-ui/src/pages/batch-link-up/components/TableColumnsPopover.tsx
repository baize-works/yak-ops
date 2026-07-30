import { API_SUCCESS_CODE } from '@/services/http/response';
import React, { useState } from "react";
import { Popover, Table, message } from "antd";
import "../index.less";
import { dataSourceCatalogApi } from "@/pages/data-source/service";

interface TableColumnsPopoverProps {
  sourceId?: string | number;
  table: string;
  type: "source" | "sink";
  children: React.ReactNode;
}

const TABLE_COLUMNS = [
  {
    title: "Index",
    dataIndex: "key",
    key: "key",
  },
  {
    title: "Name",
    dataIndex: "fieldName",
    key: "name",
    width: "18%",
    ellipsis: true,
  },
  {
    title: "Type",
    dataIndex: "fieldType",
    key: "fieldType",
    width: "18%",
    ellipsis: true,
  },
  {
    title: "Comment",
    dataIndex: "fieldComment",
    key: "fieldComment",
    width: "18%",
    ellipsis: true,
  },
  {
    title: "Nullable",
    dataIndex: "isNullable",
    key: "isNullable",
    width: "18%",
  },
  {
    title: "Key",
    dataIndex: "fieldKey",
    key: "fieldKey",
    width: "15%",
  },
];

const TableColumnsPopover: React.FC<TableColumnsPopoverProps> = ({
  sourceId,
  table,
  type,
  children,
}) => {
  const [columns, setColumns] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchColumns = async () => {
    if (!sourceId) {
      message.warning("DatasourceId is missing");
      return;
    }

    try {
      setLoading(true);

      const params = {
        taskExecuteType: "SINGLE_TABLE",
        table_path: table,
        query: "",
        read_mode: "table"
      };

      const res = await dataSourceCatalogApi.listColumn(sourceId, params);

      if (res?.code === API_SUCCESS_CODE) {
        setColumns(res.data || []);
      } else {
        
      }
    } catch (e) {
      message.error("Load columns failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Popover
      content={
        <div style={{ width: "60vh" }}>
          <Table
            rowKey="fieldName"
            dataSource={columns}
            columns={TABLE_COLUMNS}
            pagination={false}
            loading={loading}
            bordered
            scroll={{ y: "35vh" }}
          />
        </div>
      }
      title="Column Info"
      trigger="click"
      placement={type === "source" ? "bottomLeft" : "bottomRight"}
    >
      <div onClick={fetchColumns}>{children}</div>
    </Popover>
  );
};

export default TableColumnsPopover;
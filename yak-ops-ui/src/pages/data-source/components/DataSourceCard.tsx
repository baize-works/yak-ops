import {ArrowRightOutlined, DeleteOutlined, DisconnectOutlined,} from "@ant-design/icons";
import {Button, Card} from "antd";
import React from "react";
import {environmentTagConfigMap} from "../constants";
import DatabaseIcons from "../icon/DatabaseIcons";
import type {DataSourceRecord} from "../types";
import DataSourceStatus from "./DataSourceStatus";

interface DataSourceCardProps {
  record: DataSourceRecord;
  onEdit: (record: DataSourceRecord) => void;
  onDelete: (record: DataSourceRecord) => void;
  onTestConnection: (record: DataSourceRecord) => void;
}

const DataSourceCard: React.FC<DataSourceCardProps> = ({
                                                         record,
                                                         onEdit,
                                                         onDelete,
                                                         onTestConnection,
                                                       }) => {
  const environmentConfig = environmentTagConfigMap[
  record.environment || ""
    ] || {
    text: record.environmentName || "-",
    color: "#8c8c8c",
    backgroundColor: "#fafafa",
    icon: null,
  };

  return (
    <Card
      bodyStyle={{padding: 0}}
      className={[
        "group relative overflow-hidden rounded-3xl border border-[#F0F0F0]",
        "bg-white shadow-[0_8px_24px_rgba(15,23,42,0.04)]",
        "!transition-shadow !duration-200 !ease-out",
        "hover:!translate-y-0 hover:!transform-none",
        "hover:shadow-[0_10px_20px_rgba(15,23,42,0.06)]",
      ].join(" ")}
    >
      <div className="relative h-[88px] bg-[hsl(210_40%_96.1%)]">
        <div
          className={[
            "absolute left-6 bottom-[-24px] z-[2]",
            "flex h-16 w-16 items-center justify-center rounded-full",
            "border-4 border-white bg-white",
            "shadow-[0_4px_12px_rgba(0,0,0,0.12)]",
          ].join(" ")}
        >
          <DatabaseIcons dbType={record.dbType} width="28" height="28"/>
        </div>

        <div className="absolute right-5 top-4">
          <span
            className={[
              "inline-flex items-center gap-1.5 rounded-full",
              "px-2.5 py-1 text-xs font-medium leading-none",
            ].join(" ")}
            style={{
              background: environmentConfig.backgroundColor,
              color: environmentConfig.color,
            }}
          >
            {environmentConfig.icon}
            {record.environmentName || environmentConfig.text}
          </span>
        </div>

        <div
          className={[
            "absolute left-3 top-3 z-[3] flex gap-2",
            "opacity-0 translate-y-[-6px] pointer-events-none",
            "transition-all duration-200 ease-out",
            "group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto",
          ].join(" ")}
        >
          <button
            type="button"
            className={[
              "flex h-[30px] w-[30px] items-center justify-center rounded-full",
              "border border-[#E8E8E8] bg-white text-xs text-[#262626]",
              "shadow-[0_6px_18px_rgba(0,0,0,0.08)]",
              "transition-all duration-200 ease-out",
              "hover:scale-[1.06] hover:border-[#FFCCC7] hover:bg-[#FFF2F0] hover:text-[#FF4D4F]",
            ].join(" ")}
            onClick={(event) => {
              event.stopPropagation();
              onDelete(record);
            }}
          >
            <DeleteOutlined/>
          </button>

          <button
            type="button"
            className={[
              "flex h-[30px] w-[30px] items-center justify-center rounded-full",
              "border border-[#E8E8E8] bg-white text-xs text-[#262626]",
              "shadow-[0_6px_18px_rgba(0,0,0,0.08)]",
              "transition-all duration-200 ease-out",
              "hover:scale-[1.06] hover:bg-[#F5F5F5] hover:text-[#1677FF]",
            ].join(" ")}
            onClick={(event) => {
              event.stopPropagation();
              onTestConnection(record);
            }}
          >
            <DisconnectOutlined/>
          </button>
        </div>
      </div>

      <div className="px-6 pb-5 pt-9">
        <div
          className="mb-2 truncate text-lg font-bold text-[#1F1F1F]"
          title={record.name}
        >
          {record.name || "-"}
        </div>

        <div
          className="mb-3 truncate text-[13px] text-[#262626]"
          title={record.jdbcUrl}
        >
          {record.jdbcUrl || "-"}
        </div>

        <div className="mb-4">
          <DataSourceStatus status={record.connStatus}/>
        </div>

        <div className="mb-4 mt-3 text-xs text-[#8C8C8C]">
          <span className="font-medium text-[#595959]">
            {record.updateTime || "-"}
          </span>
        </div>

        <Button
          block
          type="default"
          className={[
            "group/detail relative h-[42px] overflow-hidden rounded-full p-0",
            "border border-[#D9D9D9] bg-white font-bold",
            "transition-all duration-300 ease-out",
            "hover:!border-[hsl(231_48%_48%)]",
          ].join(" ")}
          onClick={() => onEdit(record)}
        >
          <span
            className={[
              "absolute inset-0 z-[1] flex items-center justify-center rounded-full bg-white",
              "transition-all duration-300 ease-out",
              "group-hover/detail:translate-y-1.5 group-hover/detail:opacity-0",
            ].join(" ")}
          >
            查看详情
          </span>

          <span
            className={[
              "absolute inset-0 z-[2] flex items-center justify-center gap-2 rounded-full",
              "bg-[hsl(231_48%_48%)] text-white opacity-0",
              "transition-all duration-300 ease-out",
              "group-hover/detail:opacity-100",
            ].join(" ")}
          >
            <span
              className={[
                "translate-x-[-4px] transition-transform duration-300 ease-out",
                "group-hover/detail:translate-x-0",
              ].join(" ")}
            >
              查看详情
            </span>

            <span
              className={[
                "translate-x-[-8px] opacity-0 transition-all duration-300 ease-out",
                "group-hover/detail:translate-x-0 group-hover/detail:opacity-100",
              ].join(" ")}
            >
              <ArrowRightOutlined/>
            </span>
          </span>
        </Button>
      </div>
    </Card>
  );
};

export default DataSourceCard;

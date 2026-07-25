import {Tag} from "antd";
import type {ClientItem} from "./types";

export const STEP_THEME = {
  base: {
    pill: "bg-[#EEF4FF] text-[#175CD3]",
    dot: "bg-[#175CD3] text-white",

    pillDone: "bg-[#F5F8FF] text-[#175CD3]",
    dotDone: "bg-[#5B8DEF] text-white",

    pillInactive: "bg-[#F9FAFB] text-[#98A2B3]",
    dotInactive: "bg-[#EAECF0] text-[#98A2B3]",
  },
  client: {
    pill: "bg-[#EEF4FF] text-[#175CD3]",
    dot: "bg-[#175CD3] text-white",

    pillInactive: "bg-[#F9FAFB] text-[#98A2B3]",
    dotInactive: "bg-[#EAECF0] text-[#98A2B3]",
  },
};

export const mockSourceClients: ClientItem[] = [
  {id: "s1", name: "InfluxDB-Client-01", type: "InfluxDB", status: "online"},
  {id: "s2", name: "InfluxDB-Client-02", type: "InfluxDB", status: "untested"},
];

export const mockTargetClients: ClientItem[] = [
  {id: "t1", name: "ClickHouse-Client-01", type: "ClickHouse", status: "online"},
  {id: "t2", name: "ClickHouse-Client-02", type: "ClickHouse", status: "untested"},
];

export const getStatusTag = (status?: ClientItem["status"]) => {
  switch (status) {
    case "online":
      return <Tag color="success">已连通</Tag>;
    case "offline":
      return <Tag color="error">不可用</Tag>;
    default:
      return <Tag>未测试</Tag>;
  }
};

export const getDbLabel = (item: any) => {
  if (!item) return "-";
  return item?.dbType || item?.pluginName || item?.connectorType || "-";
};

import { SendOutlined } from "@ant-design/icons";
import { Select } from "antd";
import { useMemo } from "react";
import MysqlIcon from "../data-source/icon/MysqlIcon";
import OracleIcon from "../data-source/icon/OracleIcon";
import PostgreSQL from "../data-source/icon/PsSqlIcon";
import DorisIcon from "../data-source/icon/DorisIcon";
import KingBaseIcon from "../data-source/icon/KingBaseIcon";
import DaMengIcon from "../data-source/icon/DamengIcon";
import "./index.less";
// 类型定义
interface DataSourceType {
  value: string;
  label: React.ReactNode;
  icon?: React.ReactNode;
  connectorType?: string;
  pluginName?: string;
}
// 生成数据源选项配置
export const generateDataSourceOptions = (): DataSourceType[] => [
  {
    value: "MYSQL",
    connectorType: "Jdbc",
    pluginName: "JDBC-MYSQL",
    label: (
      <div style={{ display: "flex", alignItems: "center" }}>
        <MysqlIcon height="24px" width="24px" />
        <span style={{ marginLeft: 8 }}>MYSQL</span>
      </div>
    ),
  },
  {
    value: "ORACLE",
    connectorType: "Jdbc",
    pluginName: "JDBC-ORACLE",
    label: (
      <div style={{ display: "flex", alignItems: "center" }}>
        <OracleIcon />
        <span style={{ marginLeft: 8 }}>ORACLE</span>
      </div>
    ),
  },
  {
    value: "POSTGRE_SQL",
    connectorType: "Jdbc",
    pluginName: "JDBC-POSTGRESQL",
    label: (
      <div style={{ display: "flex", alignItems: "center" }}>
        <PostgreSQL />
        <span style={{ marginLeft: 8 }}>PostGreSQL</span>
      </div>
    ),
  },
  {
    value: "DORIS",
    connectorType: "Doris",
    pluginName: "DORIS",
    label: (
      <div style={{ display: "flex", alignItems: "center" }}>
        <DorisIcon />
        <span style={{ marginLeft: 8 }}>Doris</span>
      </div>
    ),
  },
  {
    value: "KINGBASE",
    connectorType: "Jdbc",
    pluginName: "JDBC-KINGBASE",
    label: (
      <div style={{ display: "flex", alignItems: "center" }}>
        <KingBaseIcon />
        <span style={{ marginLeft: 8 }}>KINGBASE</span>
      </div>
    ),
  },
  {
    value: "DAMENG",
    connectorType: "Jdbc",
    pluginName: "JDBC-DAMENG",
    label: (
      <div style={{ display: "flex", alignItems: "center" }}>
        <DaMengIcon />
        <span style={{ marginLeft: 8 }}>DAMENG</span>
      </div>
    ),
  },
];


// 数据源选择器组件
interface DataSourceSelectProps {
  value: any;
  onChange: (value: string, option: any) => void;
  placeholder: string;
  prefix: string;
  dataSourceOptions: any[],
  width?: string;
}

export const DataSourceSelect: React.FC<DataSourceSelectProps> = ({
  value,
  onChange,
  placeholder,
  prefix,
  dataSourceOptions,
  width = "42%",
}) => {
  return (
    <Select
      showSearch
      className="custom-ant-select-selector"
      placeholder={placeholder}
      value={value?.dbType}
      optionFilterProp="label"
      onChange={onChange}
      suffixIcon={<SendOutlined />}
      style={{ width: width, borderRadius: 24 }}
      prefix={<span style={{ fontSize: 12,fontWeight: 500 }}>{prefix}</span>}
      filterOption={(input, option) => {
        const labelText =
          typeof option?.label === "string" ? option.label : "MYSQL";
        return labelText.toLowerCase().includes(input.toLowerCase());
      }}
      options={dataSourceOptions}
    />
  );
};

export default DataSourceSelect;

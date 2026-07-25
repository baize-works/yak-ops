import {DbTypeValue, TableItem} from "./types";

export const DEFAULT_DB_TYPE: DbTypeValue = {
  dbType: "MYSQL",
  connectorType: "Jdbc",
};

export const DEFAULT_FORM_VALUES = {
  matchMode: "1",
  fetchSize: 8000,
  splitSize: 8096,
  schemaSaveMode: "CREATE_SCHEMA_WHEN_NOT_EXIST",
  dataSaveMode: "APPEND_DATA",
  batchSize: 10000,
  enableUpsert: true,
  fieldIde: "ORIGINAL",
};

export const SCHEMA_SAVE_MODE_OPTIONS = [
  {label: "不存在则创建", value: "CREATE_SCHEMA_WHEN_NOT_EXIST"},
  {label: "重新创建", value: "RECREATE_SCHEMA"},
  {label: "不存在则报错", value: "ERROR_WHEN_SCHEMA_NOT_EXIST"},
  {label: "忽略", value: "IGNORE"},
];

export const DATA_SAVE_MODE_OPTIONS = [
  {label: "追加数据", value: "APPEND_DATA"},
  {label: "清空后写入", value: "DROP_DATA"},
];

export const FIELD_IDE_OPTIONS = [
  {label: "保持原样", value: "ORIGINAL"},
  {label: "转大写", value: "UPPERCASE"},
  {label: "转小写", value: "LOWERCASE"},
];

export const buildDataSourceOptions = (list: any[] = []) => {
  return list.map((item) => ({
    label: item.name || item.dataSourceName || item.id,
    value: item.id,
    ...item,
  }));
};

export const buildTableItems = (list: any[] = []): TableItem[] => {
  return list.map((item: any) => {
    const tableName = typeof item === "string" ? item : item.value;
    return {
      key: String(tableName),
      title: String(item.label ?? tableName),
      rawTitle: String(tableName).toLowerCase(),
    };
  });
};

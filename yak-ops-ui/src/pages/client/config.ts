export const statusFilters = [
  {
    label: "Live",
    value: 1,
  },
  {
    label: "Down",
    value: 2,
  },
];

export const engineTypeOptions = [
  {label: "Zeta", value: "ZETA"},
  {label: "Spark", value: "SPARK"},
  {label: "Flink", value: "FLINK"},
];

export const sortTypes = [
  {
    label: "升序",
    value: "asc",
  },
  {
    label: "降序",
    value: "desc",
  },
];

export const sortFieldOptions = [
  {
    label: "接入时间",
    value: "createTime",
  },
  {
    label: "心跳时间",
    value: "heartbeatTime",
  },
  {
    label: "健康状态",
    value: "healthStatus",
  },
];


export const healthStatusTextMap: Record<number, string> = {
  1: "运行中",
  2: "离线",
};

export const clientStatusTextMap: Record<number, string> = {
  1: "启用",
  2: "停用",
};

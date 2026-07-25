import type {ChartRow, ChartSortBy, ChartSortOrder} from "./types";

export const defaultThemeColors = [
  "#ffa001",
  "#ffb400",
  "#ffc107",
  "#ffca27",
  "#ffd550",
  "#fee180",
];

export const toNumber = (value: unknown) => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
};

export const getFieldText = (
  row: ChartRow,
  field?: string,
  fallback = ""
) => {
  if (!field) return fallback;
  return String(row[field] ?? fallback);
};

export const sortAxisChartData = ({
                                    data,
                                    xField,
                                    yField,
                                    sortBy = "data",
                                    sortOrder = "asc",
                                  }: {
  data: ChartRow[];
  xField?: string;
  yField?: string;
  sortBy?: ChartSortBy;
  sortOrder?: ChartSortOrder;
}) => {
  if (!xField || !yField) return [];

  const rows = [...data];

  if (sortBy === "x") {
    rows.sort((a, b) => {
      const aValue = getFieldText(a, xField);
      const bValue = getFieldText(b, xField);

      return sortOrder === "asc"
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    });
  }

  if (sortBy === "y") {
    rows.sort((a, b) => {
      const aValue = toNumber(a[yField]);
      const bValue = toNumber(b[yField]);

      return sortOrder === "asc" ? aValue - bValue : bValue - aValue;
    });
  }

  return rows;
};

export const sortCategoryValueData = ({
                                        data,
                                        categoryField,
                                        valueField,
                                        sortBy = "data",
                                        sortOrder = "asc",
                                      }: {
  data: ChartRow[];
  categoryField?: string;
  valueField?: string;
  sortBy?: ChartSortBy;
  sortOrder?: ChartSortOrder;
}) => {
  if (!categoryField || !valueField) return [];

  const rows = [...data];

  if (sortBy === "x") {
    rows.sort((a, b) => {
      const aValue = getFieldText(a, categoryField);
      const bValue = getFieldText(b, categoryField);

      return sortOrder === "asc"
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    });
  }

  if (sortBy === "y") {
    rows.sort((a, b) => {
      const aValue = toNumber(a[valueField]);
      const bValue = toNumber(b[valueField]);

      return sortOrder === "asc" ? aValue - bValue : bValue - aValue;
    });
  }

  return rows;
};

export const getCommonTooltip = () => {
  return {
    borderWidth: 0,
    backgroundColor: "rgba(15, 23, 42, 0.88)",
    textStyle: {
      color: "#fff",
      fontSize: 12,
    },
    padding: [8, 10],
  };
};

export const getCommonTitle = (title?: string) => {
  if (!title) return undefined;

  return {
    text: title,
    left: 16,
    top: 12,
    textStyle: {
      fontSize: 14,
      fontWeight: 600,
      color: "#0f172a",
    },
  };
};

export const getCommonLegend = (showLegend?: boolean) => {
  return {
    show: showLegend,
    top: 14,
    right: 20,
    itemWidth: 10,
    itemHeight: 10,
    textStyle: {
      color: "#64748b",
      fontSize: 12,
    },
  };
};

import HttpUtils from "@/utils/HttpUtils";
import {TaskType, TimeRange} from "./types";

export const fetchSummaryData = async (
  timeRange: TimeRange,
  taskType: TaskType
) => {
  const taskTypeParam = taskType === "BATCH" ? "" : taskType;
  const response = await HttpUtils.get(
    `/api/v1/job/metrics/summary?timeRange=${timeRange}&taskType=${taskTypeParam}`
  );

  if (response?.code === 0) {
    return response.data;
  }
  throw new Error(response?.message || "Error");
};

export const fetchChartData = async (
  timeRange: TimeRange,
  taskType: TaskType
) => {
  const taskTypeParam = taskType === "BATCH" ? "" : taskType;
  const response = await HttpUtils.get(
    `/api/v1/job/metrics/charts?timeRange=${timeRange}&taskType=${taskTypeParam}`
  );

  if (response?.code === 0) {
    return response.data;
  }
  throw new Error(response?.message || "Error");
};

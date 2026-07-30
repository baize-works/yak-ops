import { API_SUCCESS_CODE } from '@/services/http/response';
import { linkupJobInstanceApi } from "@/pages/batch-link-up/api";
import { HistoryItem } from "@/pages/batch-link-up/type";
import { message } from "antd";
import dayjs from "dayjs";
import { useCallback, useEffect, useMemo, useState } from "react";


export type TimeRangeType = "最近一天" | "最近三天" | "最近一周" | "自定义";

interface UseTaskHistoryParams {
  selectedItem: any;
  statusFilter: string;
}

export const useTaskHistory = ({
  selectedItem,
  statusFilter,
}: UseTaskHistoryParams) => {
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(false);

  const [keyword, setKeyword] = useState("");
  const [debouncedKeyword, setDebouncedKeyword] = useState("");
  const [timeRangeType, setTimeRangeType] =
    useState<TimeRangeType>("最近一天");

  const [customTimeRange, setCustomTimeRange] = useState<
    [dayjs.Dayjs | null, dayjs.Dayjs | null] | null
  >(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedKeyword(keyword.trim());
    }, 400);

    return () => window.clearTimeout(timer);
  }, [keyword]);

  const getTimeRangeParams = useCallback(() => {
    const now = dayjs();

    switch (timeRangeType) {
      case "最近一天":
        return {
          queryStartTime: now.subtract(1, "day").format("YYYY-MM-DD HH:mm:ss"),
          queryEndTime: now.format("YYYY-MM-DD HH:mm:ss"),
        };

      case "最近三天":
        return {
          queryStartTime: now.subtract(3, "day").format("YYYY-MM-DD HH:mm:ss"),
          queryEndTime: now.format("YYYY-MM-DD HH:mm:ss"),
        };

      case "最近一周":
        return {
          queryStartTime: now.subtract(7, "day").format("YYYY-MM-DD HH:mm:ss"),
          queryEndTime: now.format("YYYY-MM-DD HH:mm:ss"),
        };

      case "自定义":
        return {
          queryStartTime: customTimeRange?.[0]
            ?.startOf("day")
            .format("YYYY-MM-DD HH:mm:ss"),
          queryEndTime: customTimeRange?.[1]
            ?.endOf("day")
            .format("YYYY-MM-DD HH:mm:ss"),
        };

      default:
        return {
          queryStartTime: undefined,
          queryEndTime: undefined,
        };
    }
  }, [timeRangeType, customTimeRange]);

  const fetchHistory = useCallback(async () => {
    if (!selectedItem?.id) {
      setHistoryItems([]);
      return;
    }

    const { queryStartTime, queryEndTime } = getTimeRangeParams();

    setLoading(true);

    try {
      const data = await linkupJobInstanceApi.page({
        pageNum: 1,
        pageSize: 20,
        jobDefinitionId: selectedItem.id,
        keyword: debouncedKeyword || undefined,
        jobStatus:
          statusFilter && statusFilter !== "all" ? statusFilter : undefined,
        queryStartTime,
        queryEndTime,
      });

      if (data?.code === API_SUCCESS_CODE) {
        setHistoryItems(data?.data?.bizData || []);
      } else {
        
      }
    } catch (error) {
      
    } finally {
      setLoading(false);
    }
  }, [
    selectedItem?.id,
    debouncedKeyword,
    statusFilter,
    getTimeRangeParams,
  ]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const statusCountMap = useMemo(() => {
    return historyItems.reduce(
      (acc, item) => {
        const status = item.jobStatus || "UNKNOWN";
        acc[status] = (acc[status] || 0) + 1;
        acc.all += 1;
        return acc;
      },
      {
        all: 0,
        FINISHED: 0,
        FAILED: 0,
        RUNNING: 0,
        PENDING: 0,
      } as Record<string, number>
    );
  }, [historyItems]);

  return {
    historyItems,
    loading,

    keyword,
    setKeyword,

    timeRangeType,
    setTimeRangeType,

    customTimeRange,
    setCustomTimeRange,

    statusCountMap,
    fetchHistory,
  };
};
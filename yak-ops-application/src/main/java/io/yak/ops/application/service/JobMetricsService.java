package io.yak.ops.application.service;

import lombok.NonNull;
import io.yak.ops.application.modal.ParsedJobMetrics;
import io.yak.ops.common.enums.TimeRange;
import io.yak.ops.dao.entity.JobMetrics;
import io.yak.ops.dao.entity.JobTableMetrics;
import io.yak.ops.application.model.vo.OverviewChartsVO;
import io.yak.ops.application.model.vo.OverviewSummaryVO;

import java.util.List;

public interface JobMetricsService {

    /**
     * Fetch and parse metrics from SeaTunnel Engine.
     */
    ParsedJobMetrics getJobMetricsFromEngine(@NonNull Long clientId,
                                             @NonNull String jobEngineId);

    /**
     * Save pipeline level metrics.
     */
    void saveMetricsBatch(@NonNull List<JobMetrics> metricsList);

    /**
     * Save table level metrics.
     */
    void saveTableMetricsBatch(@NonNull List<JobTableMetrics> metricsList);

    OverviewSummaryVO summary(TimeRange timeRange, String taskType);

    OverviewChartsVO charts(TimeRange timeRange, String taskType);
}

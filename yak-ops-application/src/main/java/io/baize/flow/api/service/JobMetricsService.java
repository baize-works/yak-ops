package io.baize.flow.api.service;

import lombok.NonNull;
import io.baize.flow.api.modal.ParsedJobMetrics;
import io.baize.flow.common.enums.TimeRange;
import io.baize.flow.dao.entity.JobMetrics;
import io.baize.flow.dao.entity.JobTableMetrics;
import io.baize.flow.web.contract.vo.OverviewChartsVO;
import io.baize.flow.web.contract.vo.OverviewSummaryVO;

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
package io.yak.ops.api.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.Parameters;
import io.swagger.v3.oas.annotations.tags.Tag;
import javax.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import io.yak.ops.api.exceptions.ApiException;
import io.yak.ops.application.service.JobMetricsService;
import io.yak.ops.common.enums.TimeRange;
import io.yak.ops.application.model.response.Result;
import io.yak.ops.application.model.vo.OverviewChartsVO;
import io.yak.ops.application.model.vo.OverviewSummaryVO;
import org.springframework.web.bind.annotation.*;

import static io.yak.ops.plugin.spi.enums.Status.QUERY_JOB_METRICS_CHARTS_ERROR;
import static io.yak.ops.plugin.spi.enums.Status.QUERY_JOB_METRICS_SUMMARY_ERROR;

@Slf4j
@RestController
@Tag(name = "JOB_METRICS_TAG")
@RequestMapping("/api/v1/job/metrics")
public class JobMetricsController {

    @Resource
    private JobMetricsService linkupJobMetricsService;

    /**
     * Retrieves job summary statistics.
     */
    @GetMapping("/summary")
    @Operation(summary = "queryJobMetricsSummary", description = "QUERY_JOB_METRICS_SUMMARY_NOTES")
    @Parameters({
            @Parameter(name = "timeRange", description = "JOB_METRICS_TIME_RANGE", required = false),
            @Parameter(name = "taskType", description = "JOB_METRICS_TASK_TYPE", required = false)
    })
    @ApiException(QUERY_JOB_METRICS_SUMMARY_ERROR)
    public Result<OverviewSummaryVO> summary(
            @RequestParam(value = "timeRange", defaultValue = "H24") TimeRange timeRange,
            @RequestParam(value = "taskType", required = false, defaultValue = "BATCH") String taskType) {
        return Result.buildSuc(linkupJobMetricsService.summary(timeRange, taskType));
    }

    /**
     * Retrieves job chart data.
     */
    @GetMapping("/charts")
    @Operation(summary = "queryJobMetricsCharts", description = "QUERY_JOB_METRICS_CHARTS_NOTES")
    @Parameters({
            @Parameter(name = "timeRange", description = "JOB_METRICS_TIME_RANGE", required = false),
            @Parameter(name = "taskType", description = "JOB_METRICS_TASK_TYPE", required = false)
    })
    @ApiException(QUERY_JOB_METRICS_CHARTS_ERROR)
    public Result<OverviewChartsVO> charts(
            @RequestParam(value = "timeRange", defaultValue = "H24") TimeRange timeRange,
            @RequestParam(value = "taskType", required = false, defaultValue = "BATCH") String taskType) {
        return Result.buildSuc(linkupJobMetricsService.charts(timeRange, taskType));
    }
}

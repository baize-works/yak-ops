package io.baize.flow.api.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.Parameters;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import io.baize.flow.api.exceptions.ApiException;
import io.baize.flow.api.service.JobScheduleService;
import io.baize.flow.web.contract.response.Result;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;

import static io.baize.flow.plugin.spi.enums.Status.QUERY_JOB_SCHEDULE_EXECUTION_TIMES_ERROR;
import static io.baize.flow.plugin.spi.enums.Status.START_JOB_SCHEDULE_ERROR;
import static io.baize.flow.plugin.spi.enums.Status.STOP_JOB_SCHEDULE_ERROR;

@Slf4j
@RestController
@Validated
@Tag(name = "JOB_SCHEDULE_TAG")
@RequestMapping("/api/v1/job/schedule")
public class JobScheduleController {

    @Resource
    private JobScheduleService seatunnelJobScheduleService;

    /**
     * Retrieves the next 5 execution times based on the cron expression.
     */
    @GetMapping("/last5-execution-times")
    @Operation(summary = "queryLast5ExecutionTimes", description = "QUERY_LAST_5_EXECUTION_TIMES_NOTES")
    @Parameters({
            @Parameter(name = "cron", description = "CRON_EXPRESSION", required = true)
    })
    @ApiException(QUERY_JOB_SCHEDULE_EXECUTION_TIMES_ERROR)
    public Result<List<String>> getLast5ExecutionTimes(
            @RequestParam("cron") String cronExpression) {
        return Result.buildSuc(seatunnelJobScheduleService.getLast5ExecutionTimesByCron(cronExpression));
    }

    /**
     * Stops a job schedule by schedule ID.
     */
    @GetMapping("/stop-schedule")
    @Operation(summary = "stopJobSchedule", description = "STOP_JOB_SCHEDULE_NOTES")
    @Parameters({
            @Parameter(name = "scheduleId", description = "SCHEDULE_ID", required = true)
    })
    @ApiException(STOP_JOB_SCHEDULE_ERROR)
    public Result<Boolean> stopSchedule(
            @RequestParam("scheduleId") Long scheduleId) {
        return Result.buildSuc(seatunnelJobScheduleService.stopSchedule(scheduleId));
    }

    /**
     * Starts a job schedule by schedule ID.
     */
    @GetMapping("/start-schedule")
    @Operation(summary = "startJobSchedule", description = "START_JOB_SCHEDULE_NOTES")
    @Parameters({
            @Parameter(name = "scheduleId", description = "SCHEDULE_ID", required = true)
    })
    @ApiException(START_JOB_SCHEDULE_ERROR)
    public Result<Boolean> startSchedule(
            @RequestParam("scheduleId") Long scheduleId) {
        return Result.buildSuc(seatunnelJobScheduleService.startSchedule(scheduleId));
    }
}
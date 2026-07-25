package io.baize.flow.api.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.Parameters;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import io.baize.flow.api.exceptions.ApiException;
import io.baize.flow.application.service.BatchJobExecutorService;
import io.baize.flow.domain.enums.RunMode;
import io.baize.flow.web.contract.dto.command.BatchJobDefinitionOperateCommand;
import io.baize.flow.web.contract.response.Result;
import io.baize.flow.web.contract.vo.BatchJobOperateResultVO;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import static io.baize.flow.plugin.spi.enums.Status.JOB_DEFINITION_EXECUTE_ERROR;

@Slf4j
@RestController
@Tag(name = "JOB_EXECUTOR_TAG")
@RequestMapping("/api/v1/executor")
public class BatchJobExecutorController {

    @Resource
    private BatchJobExecutorService jobExecutorService;

    /**
     * Executes a SeaTunnel job by job definition ID.
     */
    @GetMapping("/execute")
    @Operation(summary = "executeJob", description = "EXECUTE_JOB_NOTES")
    @Parameters({
            @Parameter(name = "jobDefineId", description = "JOB_DEFINITION_ID", required = true)
    })
    @ApiException(JOB_DEFINITION_EXECUTE_ERROR)
    public Result<Long> execute(@RequestParam("jobDefineId") Long jobDefineId) {
        Long jobInstanceId = jobExecutorService.jobExecute(jobDefineId, RunMode.MANUAL);
        return Result.buildSuc(jobInstanceId);
    }

    /**
     * Pause / stop a running SeaTunnel job instance.
     */
    @GetMapping("/pause")
    @Operation(summary = "pauseJob", description = "PAUSE_JOB_NOTES")
    @Parameters({
            @Parameter(name = "jobInstanceId", description = "JOB_INSTANCE_ID", required = true)
    })
    @ApiException(JOB_DEFINITION_EXECUTE_ERROR)
    public Result<Long> pause(@RequestParam("jobInstanceId") Long jobInstanceId) {
        Long id = jobExecutorService.jobPause(jobInstanceId);
        return Result.buildSuc(id);
    }

    /**
     * Batch execute SeaTunnel jobs by job definition IDs.
     */
    @PostMapping("/batch-execute")
    @Operation(summary = "batchExecuteJob", description = "BATCH_EXECUTE_JOB_NOTES")
    @ApiException(JOB_DEFINITION_EXECUTE_ERROR)
    public Result<BatchJobOperateResultVO> batchExecute(
            @RequestBody @Validated BatchJobDefinitionOperateCommand command) {
        BatchJobOperateResultVO result = jobExecutorService.batchExecute(
                command.getJobDefinitionIds(),
                RunMode.MANUAL
        );
        return Result.buildSuc(result);
    }

    /**
     * Batch pause running SeaTunnel jobs by job definition IDs.
     */
    @PostMapping("/batch-pause")
    @Operation(summary = "batchPauseJob", description = "BATCH_PAUSE_JOB_NOTES")
    @ApiException(JOB_DEFINITION_EXECUTE_ERROR)
    public Result<BatchJobOperateResultVO> batchPause(
            @RequestBody @Validated BatchJobDefinitionOperateCommand command) {
        BatchJobOperateResultVO result = jobExecutorService.batchPause(
                command.getJobDefinitionIds()
        );
        return Result.buildSuc(result);
    }
}
package io.yak.ops.api.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.Parameters;
import io.swagger.v3.oas.annotations.tags.Tag;
import javax.annotation.Resource;
import javax.validation.constraints.NotNull;
import lombok.extern.slf4j.Slf4j;
import io.yak.ops.api.exceptions.ApiException;
import io.yak.ops.application.service.BatchJobInstanceService;
import io.yak.ops.web.contract.dto.SeaTunnelJobInstanceDTO;
import io.yak.ops.web.contract.response.PaginationResult;
import io.yak.ops.web.contract.response.Result;
import io.yak.ops.web.contract.vo.JobInstanceVO;
import io.yak.ops.web.contract.vo.JobTableMetricsVO;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;

import static io.yak.ops.plugin.spi.enums.Status.BATCH_JOB_INSTANCE_NOT_EXIST;
import static io.yak.ops.plugin.spi.enums.Status.QUERY_BATCH_JOB_INSTANCE_ERROR;
import static io.yak.ops.plugin.spi.enums.Status.QUERY_BATCH_JOB_INSTANCE_LOG_ERROR;

/**
 * Batch Job Instance Controller
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/job/batch-instance")
@Validated
@Tag(name = "BATCH_JOB_INSTANCE_TAG")
public class BatchJobInstanceController {

    @Resource
    private BatchJobInstanceService seatunnelJobInstanceService;

    @PostMapping("/page")
    @Operation(summary = "queryBatchJobInstancePaging", description = "QUERY_BATCH_JOB_INSTANCE_PAGING_NOTES")
    @ApiException(QUERY_BATCH_JOB_INSTANCE_ERROR)
    public PaginationResult<JobInstanceVO> paging(@RequestBody SeaTunnelJobInstanceDTO dto) {
        return seatunnelJobInstanceService.paging(dto);
    }

    @GetMapping("/{id}")
    @Operation(summary = "selectBatchJobInstanceById", description = "SELECT_BATCH_JOB_INSTANCE_BY_ID_NOTES")
    @Parameters({
            @Parameter(name = "id", description = "BATCH_JOB_INSTANCE_ID", required = true)
    })
    @ApiException(BATCH_JOB_INSTANCE_NOT_EXIST)
    public Result<JobInstanceVO> selectById(@PathVariable("id") @NotNull Long id) {
        return Result.buildSuc(seatunnelJobInstanceService.selectById(id));
    }

    @GetMapping("/{instanceId}/table-metrics")
    @Operation(summary = "queryBatchJobInstanceTableMetrics", description = "QUERY_BATCH_JOB_INSTANCE_TABLE_METRICS_NOTES")
    @Parameters({
            @Parameter(name = "instanceId", description = "BATCH_JOB_INSTANCE_ID", required = true)
    })
    @ApiException(QUERY_BATCH_JOB_INSTANCE_ERROR)
    public Result<List<JobTableMetricsVO>> listTableMetrics(
            @PathVariable("instanceId") @NotNull Long instanceId) {
        return Result.buildSuc(seatunnelJobInstanceService.listTableMetrics(instanceId));
    }

    @GetMapping("/{instanceId}/log")
    @Operation(summary = "queryBatchJobInstanceLog", description = "QUERY_BATCH_JOB_INSTANCE_LOG_NOTES")
    @Parameters({
            @Parameter(name = "instanceId", description = "BATCH_JOB_INSTANCE_ID", required = true)
    })
    @ApiException(QUERY_BATCH_JOB_INSTANCE_LOG_ERROR)
    public Result<String> getLog(@PathVariable("instanceId") Long instanceId) {
        return Result.buildSuc(seatunnelJobInstanceService.getLogContent(instanceId));
    }
}

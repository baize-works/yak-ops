package io.yak.ops.business.sync.offline.controller;

import com.fasterxml.jackson.databind.JsonNode;
import io.yak.framework.common.PagingResult;
import io.yak.framework.common.Result;
import io.yak.ops.business.sync.offline.config.ConditionalOnOfflineSyncEnabled;
import io.yak.ops.business.sync.offline.engine.LinkUpClient;
import io.yak.ops.business.sync.offline.engine.LinkUpClient.LinkUpNodeResponse;
import io.yak.ops.business.sync.offline.service.OfflineJobExecutionService;
import io.yak.ops.common.bean.dto.sync.offline.OfflineBatchOperationDTO;
import io.yak.ops.common.bean.dto.sync.offline.OfflineJobExecutionQueryDTO;
import io.yak.ops.common.bean.vo.sync.offline.OfflineBatchOperationVO;
import io.yak.ops.common.bean.vo.sync.offline.OfflineJobExecutionDetailVO;
import io.yak.ops.common.bean.vo.sync.offline.OfflineJobExecutionVO;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** 离线执行命令和执行历史查询接口。 */
@ConditionalOnOfflineSyncEnabled
@RestController
public class OfflineJobExecutionController {

  private final OfflineJobExecutionService service;
  private final LinkUpClient linkUpClient;

  public OfflineJobExecutionController(
      OfflineJobExecutionService service,
      LinkUpClient linkUpClient) {
    this.service = service;
    this.linkUpClient = linkUpClient;
  }

  @GetMapping({"/api/v1/job/batch-execution/health", "/api/v1/executor/health"})
  public Result<LinkUpNodeResponse> health() {
    return Result.success(linkUpClient.node());
  }

  @GetMapping({"/api/v1/job/batch-execution/execute", "/api/v1/executor/execute"})
  public Result<OfflineJobExecutionVO> execute(@RequestParam Long jobDefineId) {
    return Result.success(service.execute(jobDefineId));
  }

  @PostMapping("/api/v1/job/batch-execution/{jobDefineId}/execute")
  public Result<OfflineJobExecutionVO> executeByPath(@PathVariable Long jobDefineId) {
    return Result.success(service.execute(jobDefineId));
  }

  @GetMapping({"/api/v1/job/batch-execution/pause", "/api/v1/executor/pause"})
  public Result<OfflineJobExecutionVO> pause(@RequestParam Long jobInstanceId) {
    return Result.success(service.cancel(jobInstanceId));
  }

  @PostMapping("/api/v1/job/batch-execution/{jobInstanceId}/cancel")
  public Result<OfflineJobExecutionVO> cancelByPath(@PathVariable Long jobInstanceId) {
    return Result.success(service.cancel(jobInstanceId));
  }

  @PostMapping("/api/v1/job/batch-execution/{jobInstanceId}/retry")
  public Result<OfflineJobExecutionVO> retry(@PathVariable Long jobInstanceId) {
    return Result.success(service.retry(jobInstanceId));
  }

  @PostMapping({"/api/v1/job/batch-execution/batch-execute", "/api/v1/executor/batch-execute"})
  public Result<OfflineBatchOperationVO> batchExecute(
      @Valid @RequestBody OfflineBatchOperationDTO requestDTO) {
    return Result.success(service.batchExecute(requestDTO));
  }

  @PostMapping({"/api/v1/job/batch-execution/batch-pause", "/api/v1/executor/batch-pause"})
  public Result<OfflineBatchOperationVO> batchPause(
      @Valid @RequestBody OfflineBatchOperationDTO requestDTO) {
    return Result.success(service.batchCancel(requestDTO));
  }

  @PostMapping("/api/v1/job/batch-instance/page")
  public PagingResult<OfflineJobExecutionVO> instancePage(
      @Valid @RequestBody(required = false) OfflineJobExecutionQueryDTO queryDTO) {
    return PagingResult.success(service.page(queryDTO));
  }

  @GetMapping("/api/v1/job/batch-instance/{id}")
  public Result<OfflineJobExecutionDetailVO> instance(@PathVariable Long id) {
    return Result.success(service.detail(id));
  }

  @GetMapping("/api/v1/job/batch-instance/{id}/table-metrics")
  public Result<JsonNode> tableMetrics(@PathVariable Long id) {
    return Result.success(service.tableMetrics(id));
  }

  @GetMapping("/api/v1/job/batch-instance/{id}/log")
  public Result<String> instanceLog(@PathVariable Long id) {
    return Result.success(service.logs(id));
  }

  @GetMapping("/api/v1/devops/client/instance/{id}/logs")
  public Result<String> compatibilityLog(
      @PathVariable Long id,
      @RequestParam(defaultValue = "BATCH") String jobMode) {
    if (!"BATCH".equalsIgnoreCase(jobMode)) {
      throw new IllegalArgumentException("当前接口仅支持 BATCH 离线任务日志");
    }
    return Result.success(service.logs(id));
  }
}

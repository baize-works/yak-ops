package io.yak.ops.business.sync.offline.controller;

import io.yak.ops.business.sync.offline.config.ConditionalOnOfflineSyncEnabled;
import com.fasterxml.jackson.databind.JsonNode;
import io.yak.ops.business.sync.offline.engine.LinkUpClient;
import io.yak.ops.business.sync.offline.model.response.OfflineApiResponse;
import io.yak.ops.business.sync.offline.service.OfflineJobExecutionService;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** 离线同步执行、实例与历史 executor 兼容接口。 */
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
  public OfflineApiResponse<JsonNode> health() {
    return OfflineApiResponse.success(linkUpClient.health());
  }

  @GetMapping({"/api/v1/job/batch-execution/execute", "/api/v1/executor/execute"})
  public OfflineApiResponse<Map<String, Object>> execute(@RequestParam Long jobDefineId) {
    return OfflineApiResponse.success(service.execute(jobDefineId));
  }

  @PostMapping("/api/v1/job/batch-execution/{jobDefineId}/execute")
  public OfflineApiResponse<Map<String, Object>> executeByPath(@PathVariable Long jobDefineId) {
    return OfflineApiResponse.success(service.execute(jobDefineId));
  }

  @GetMapping({"/api/v1/job/batch-execution/pause", "/api/v1/executor/pause"})
  public OfflineApiResponse<Map<String, Object>> pause(@RequestParam Long jobInstanceId) {
    return OfflineApiResponse.success(service.cancel(jobInstanceId));
  }

  @PostMapping("/api/v1/job/batch-execution/{jobInstanceId}/cancel")
  public OfflineApiResponse<Map<String, Object>> cancelByPath(@PathVariable Long jobInstanceId) {
    return OfflineApiResponse.success(service.cancel(jobInstanceId));
  }

  @PostMapping({"/api/v1/job/batch-execution/batch-execute", "/api/v1/executor/batch-execute"})
  public OfflineApiResponse<Map<String, Object>> batchExecute(@RequestBody JsonNode request) {
    return OfflineApiResponse.success(service.batchExecute(request));
  }

  @PostMapping({"/api/v1/job/batch-execution/batch-pause", "/api/v1/executor/batch-pause"})
  public OfflineApiResponse<Map<String, Object>> batchPause(@RequestBody JsonNode request) {
    return OfflineApiResponse.success(service.batchCancel(request));
  }

  @PostMapping("/api/v1/job/batch-instance/page")
  public OfflineApiResponse<Map<String, Object>> instancePage(
      @RequestBody(required = false) JsonNode request) {
    return OfflineApiResponse.success(service.page(request));
  }

  @GetMapping("/api/v1/job/batch-instance/{id}")
  public OfflineApiResponse<Map<String, Object>> instance(@PathVariable Long id) {
    return OfflineApiResponse.success(service.detail(id));
  }

  @GetMapping("/api/v1/job/batch-instance/{id}/table-metrics")
  public OfflineApiResponse<Object> tableMetrics(@PathVariable Long id) {
    return OfflineApiResponse.success(service.tableMetrics(id));
  }

  @GetMapping("/api/v1/job/batch-instance/{id}/log")
  public OfflineApiResponse<String> instanceLog(@PathVariable Long id) {
    return OfflineApiResponse.success(service.logs(id));
  }

  @GetMapping("/api/v1/devops/client/instance/{id}/logs")
  public OfflineApiResponse<String> compatibilityLog(
      @PathVariable Long id,
      @RequestParam(defaultValue = "BATCH") String jobMode) {
    if (!"BATCH".equalsIgnoreCase(jobMode)) {
      throw new IllegalArgumentException("当前接口仅支持 BATCH 离线任务日志");
    }
    return OfflineApiResponse.success(service.logs(id));
  }
}

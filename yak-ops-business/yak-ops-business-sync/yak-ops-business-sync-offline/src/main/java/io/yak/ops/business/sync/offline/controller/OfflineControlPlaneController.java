package io.yak.ops.business.sync.offline.controller;

import io.yak.framework.common.Result;
import io.yak.ops.business.sync.offline.config.ConditionalOnOfflineSyncEnabled;
import io.yak.ops.business.sync.offline.repository.OfflineExecutionControlRepository;
import io.yak.ops.business.sync.offline.repository.OfflineExecutionControlRepository.ExecutionEventRecord;
import io.yak.ops.business.sync.offline.repository.OfflineNodeRepository.NodeRecord;
import io.yak.ops.business.sync.offline.service.OfflineJobDefinitionService;
import io.yak.ops.business.sync.offline.service.OfflineWorkerRegistry;
import java.util.List;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** 离线同步控制面的节点、版本、事件和告警查询接口。 */
@ConditionalOnOfflineSyncEnabled
@RestController
@RequestMapping("/api/v1/job/batch-control")
public class OfflineControlPlaneController {

  private final OfflineWorkerRegistry workerRegistry;
  private final OfflineJobDefinitionService definitionService;
  private final OfflineExecutionControlRepository repository;

  public OfflineControlPlaneController(
      OfflineWorkerRegistry workerRegistry,
      OfflineJobDefinitionService definitionService,
      OfflineExecutionControlRepository repository) {
    this.workerRegistry = workerRegistry;
    this.definitionService = definitionService;
    this.repository = repository;
  }

  @GetMapping("/node")
  public Result<NodeRecord> node() {
    return Result.success(workerRegistry.currentNode());
  }

  @GetMapping("/definitions/{definitionId}/versions")
  public Result<List<Map<String, Object>>> versions(@PathVariable Long definitionId) {
    return Result.success(definitionService.listVersionSummaries(definitionId));
  }

  @GetMapping("/executions/{executionId}/events")
  public Result<List<ExecutionEventRecord>> events(@PathVariable Long executionId) {
    return Result.success(repository.listExecutionEvents(executionId));
  }

  @GetMapping("/definitions/{definitionId}/alerts")
  public Result<List<Map<String, Object>>> alerts(@PathVariable Long definitionId) {
    return Result.success(repository.listAlerts(definitionId));
  }
}

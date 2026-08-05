package io.yak.ops.business.sync.offline.controller;

import io.yak.framework.common.Result;
import io.yak.ops.business.sync.offline.config.ConditionalOnOfflineSyncEnabled;
import io.yak.ops.business.sync.offline.repository.OfflineExecutionControlRepository;
import io.yak.ops.business.sync.offline.repository.OfflineExecutionControlRepository.ExecutionEventRecord;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** 离线同步执行事件查询接口。 */
@ConditionalOnOfflineSyncEnabled
@RestController
@RequestMapping("/api/v1/job/batch-control")
@RequiredArgsConstructor
public class OfflineControlPlaneController {
  private final OfflineExecutionControlRepository repository;

  @GetMapping("/executions/{executionId}/events")
  public Result<List<ExecutionEventRecord>> events(@PathVariable Long executionId) {
    return Result.success(repository.listExecutionEvents(executionId));
  }
}

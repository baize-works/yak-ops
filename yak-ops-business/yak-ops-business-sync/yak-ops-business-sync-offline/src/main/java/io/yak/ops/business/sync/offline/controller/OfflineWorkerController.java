package io.yak.ops.business.sync.offline.controller;

import io.yak.framework.common.Result;
import io.yak.ops.business.sync.offline.config.ConditionalOnOfflineSyncEnabled;
import io.yak.ops.business.sync.offline.worker.OfflineWorkerModels.CreateRequest;
import io.yak.ops.business.sync.offline.worker.OfflineWorkerModels.OptionView;
import io.yak.ops.business.sync.offline.worker.OfflineWorkerModels.PageView;
import io.yak.ops.business.sync.offline.worker.OfflineWorkerModels.QueryRequest;
import io.yak.ops.business.sync.offline.worker.OfflineWorkerModels.SchedulingRequest;
import io.yak.ops.business.sync.offline.worker.OfflineWorkerModels.UpdateRequest;
import io.yak.ops.business.sync.offline.worker.OfflineWorkerModels.VerifyRequest;
import io.yak.ops.business.sync.offline.worker.OfflineWorkerModels.WorkerView;
import io.yak.ops.business.sync.offline.worker.OfflineWorkerService;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Link-Up 离线 Worker 管理接口。
 *
 * @author weifuwan
 */
@ConditionalOnOfflineSyncEnabled
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/offline/workers")
public class OfflineWorkerController {

  private final OfflineWorkerService service;

  @PostMapping("/verify")
  public Result<WorkerView> verify(@Valid @RequestBody VerifyRequest request) {
    return Result.success(service.verify(request.getBaseUrl()));
  }

  @PostMapping
  public Result<WorkerView> create(@Valid @RequestBody CreateRequest request) {
    return Result.success(service.create(request));
  }

  @PutMapping("/{nodeId}")
  public Result<WorkerView> update(
      @PathVariable String nodeId,
      @Valid @RequestBody UpdateRequest request) {
    return Result.success(service.update(nodeId, request));
  }

  @GetMapping("/{nodeId}")
  public Result<WorkerView> detail(@PathVariable String nodeId) {
    return Result.success(service.get(nodeId));
  }

  @PostMapping("/page")
  public Result<PageView> page(@Valid @RequestBody(required = false) QueryRequest request) {
    return Result.success(service.page(request));
  }

  @GetMapping("/options")
  public Result<List<OptionView>> options() {
    return Result.success(service.options());
  }

  @PostMapping("/{nodeId}/refresh")
  public Result<WorkerView> refresh(@PathVariable String nodeId) {
    return Result.success(service.refresh(nodeId));
  }

  @PutMapping("/{nodeId}/scheduling-status")
  public Result<WorkerView> schedulingStatus(
      @PathVariable String nodeId,
      @Valid @RequestBody SchedulingRequest request) {
    return Result.success(
        service.changeSchedulingStatus(nodeId, request.getSchedulingStatus()));
  }

  @DeleteMapping("/{nodeId}")
  public Result<Boolean> delete(@PathVariable String nodeId) {
    return Result.success(service.delete(nodeId));
  }
}

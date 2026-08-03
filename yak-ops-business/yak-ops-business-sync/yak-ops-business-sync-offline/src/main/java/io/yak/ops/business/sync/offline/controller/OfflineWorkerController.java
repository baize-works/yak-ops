package io.yak.ops.business.sync.offline.controller;

import io.yak.framework.common.Result;
import io.yak.ops.business.sync.offline.config.ConditionalOnOfflineSyncEnabled;
import io.yak.ops.business.sync.offline.worker.OfflineWorkerCapabilityService;
import io.yak.ops.business.sync.offline.worker.OfflineWorkerModels.CapabilityView;
import io.yak.ops.business.sync.offline.worker.OfflineWorkerModels.CreateRequest;
import io.yak.ops.business.sync.offline.worker.OfflineWorkerModels.LeaseRevokeRequest;
import io.yak.ops.business.sync.offline.worker.OfflineWorkerModels.OptionView;
import io.yak.ops.business.sync.offline.worker.OfflineWorkerModels.PageView;
import io.yak.ops.business.sync.offline.worker.OfflineWorkerModels.QueryRequest;
import io.yak.ops.business.sync.offline.worker.OfflineWorkerModels.SchedulingRequest;
import io.yak.ops.business.sync.offline.worker.OfflineWorkerModels.UpdateRequest;
import io.yak.ops.business.sync.offline.worker.OfflineWorkerModels.VerifyRequest;
import io.yak.ops.business.sync.offline.worker.OfflineWorkerModels.WorkerView;
import io.yak.ops.business.sync.offline.worker.OfflineWorkerRegistrationService;
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
  private final OfflineWorkerCapabilityService capabilityService;
  private final OfflineWorkerRegistrationService registrationService;

  @PostMapping("/verify")
  public Result<WorkerView> verify(@Valid @RequestBody VerifyRequest request) {
    return Result.success(service.verify(request.getBaseUrl()));
  }

  @PostMapping
  public Result<WorkerView> create(@Valid @RequestBody CreateRequest request) {
    WorkerView worker = service.create(request);
    capabilityService.refreshQuietly(worker.getNodeId());
    return Result.success(capabilityService.enrich(service.get(worker.getNodeId())));
  }

  @PutMapping("/{nodeId}")
  public Result<WorkerView> update(
      @PathVariable String nodeId,
      @Valid @RequestBody UpdateRequest request) {
    service.update(nodeId, request);
    capabilityService.refreshQuietly(nodeId);
    return Result.success(capabilityService.enrich(service.get(nodeId)));
  }

  @GetMapping("/{nodeId}")
  public Result<WorkerView> detail(@PathVariable String nodeId) {
    return Result.success(capabilityService.enrich(service.get(nodeId)));
  }

  @PostMapping("/page")
  public Result<PageView> page(@Valid @RequestBody(required = false) QueryRequest request) {
    PageView page = service.page(request);
    if (page.getRecords() != null) {
      page.getRecords().forEach(capabilityService::enrich);
    }
    return Result.success(page);
  }

  @GetMapping("/options")
  public Result<List<OptionView>> options() {
    List<OptionView> options = service.options();
    options.forEach(capabilityService::enrich);
    return Result.success(options);
  }

  @PostMapping("/{nodeId}/refresh")
  public Result<WorkerView> refresh(@PathVariable String nodeId) {
    service.refresh(nodeId);
    capabilityService.refresh(nodeId, true);
    return Result.success(capabilityService.enrich(service.get(nodeId)));
  }

  @GetMapping("/{nodeId}/capabilities")
  public Result<CapabilityView> capabilities(@PathVariable String nodeId) {
    return Result.success(capabilityService.get(nodeId));
  }

  @PostMapping("/{nodeId}/capabilities/refresh")
  public Result<CapabilityView> refreshCapabilities(@PathVariable String nodeId) {
    return Result.success(capabilityService.refreshView(nodeId));
  }

  @PostMapping("/{nodeId}/lease/revoke")
  public Result<WorkerView> revokeLease(
      @PathVariable String nodeId,
      @RequestBody(required = false) LeaseRevokeRequest request) {
    registrationService.revoke(nodeId, request == null ? null : request.getReason());
    return Result.success(capabilityService.enrich(service.get(nodeId)));
  }

  @PutMapping("/{nodeId}/scheduling-status")
  public Result<WorkerView> schedulingStatus(
      @PathVariable String nodeId,
      @Valid @RequestBody SchedulingRequest request) {
    WorkerView worker = service.changeSchedulingStatus(nodeId, request.getSchedulingStatus());
    if (Boolean.TRUE.equals(worker.getEnabled())) {
      capabilityService.refreshQuietly(nodeId);
    }
    return Result.success(capabilityService.enrich(service.get(nodeId)));
  }

  @DeleteMapping("/{nodeId}")
  public Result<Boolean> delete(@PathVariable String nodeId) {
    return Result.success(service.delete(nodeId));
  }
}

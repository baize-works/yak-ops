package io.yak.ops.business.sync.realtime.controller;

import io.yak.ops.business.sync.realtime.config.ConditionalOnRealtimeSyncEnabled;
import io.yak.ops.business.sync.realtime.model.po.RealtimeDeploymentPO;
import io.yak.ops.business.sync.realtime.model.po.RealtimeJobPO;
import io.yak.ops.business.sync.realtime.model.request.JobSubmitRequest;
import io.yak.ops.business.sync.realtime.model.request.RealtimeJobRequest;
import io.yak.ops.business.sync.realtime.model.request.SavepointRequest;
import io.yak.ops.business.sync.realtime.model.response.DeploymentStatus;
import io.yak.ops.business.sync.realtime.model.response.RealtimeApiResponse;
import io.yak.ops.business.sync.realtime.model.response.RealtimeJobView;
import io.yak.ops.business.sync.realtime.model.response.SavepointResult;
import io.yak.ops.business.sync.realtime.model.response.ValidationResult;
import io.yak.ops.business.sync.realtime.service.RealtimeDeploymentService;
import io.yak.ops.business.sync.realtime.service.RealtimeJobService;
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

/** 实时同步任务定义与部署接口。 */
@ConditionalOnRealtimeSyncEnabled
@RestController
@RequestMapping("/api/v1/realtime-sync/jobs")
@RequiredArgsConstructor
public class RealtimeJobController {

  private final RealtimeJobService jobService;
  private final RealtimeDeploymentService deploymentService;

  @GetMapping
  public RealtimeApiResponse<List<RealtimeJobView>> list() {
    return RealtimeApiResponse.success(jobService.list().stream()
        .map(value -> RealtimeJobView.from(value, jobService.runtimeOptions(value)))
        .toList());
  }

  @GetMapping("/{id}")
  public RealtimeApiResponse<RealtimeJobView> get(@PathVariable Long id) {
    RealtimeJobPO value = jobService.get(id);
    return RealtimeApiResponse.success(
        RealtimeJobView.from(value, jobService.runtimeOptions(value)));
  }

  @PostMapping
  public RealtimeApiResponse<Long> create(@Valid @RequestBody RealtimeJobRequest request) {
    return RealtimeApiResponse.success(jobService.create(request));
  }

  @PutMapping("/{id}")
  public RealtimeApiResponse<Void> update(
      @PathVariable Long id, @Valid @RequestBody RealtimeJobRequest request) {
    jobService.update(id, request);
    return RealtimeApiResponse.success();
  }

  @DeleteMapping("/{id}")
  public RealtimeApiResponse<Void> delete(@PathVariable Long id) {
    jobService.delete(id);
    return RealtimeApiResponse.success();
  }

  @PostMapping("/{id}/validate")
  public RealtimeApiResponse<ValidationResult> validate(@PathVariable Long id) {
    return RealtimeApiResponse.success(jobService.validate(id));
  }

  @PostMapping("/{id}/submit")
  public RealtimeApiResponse<RealtimeDeploymentPO> submit(
      @PathVariable Long id, @RequestBody(required = false) JobSubmitRequest request) {
    return RealtimeApiResponse.success(
        deploymentService.submit(id, request == null ? new JobSubmitRequest() : request));
  }

  @PostMapping("/{id}/cancel")
  public RealtimeApiResponse<Void> cancel(@PathVariable Long id) {
    deploymentService.cancel(id);
    return RealtimeApiResponse.success();
  }

  @GetMapping("/{id}/status")
  public RealtimeApiResponse<DeploymentStatus> status(@PathVariable Long id) {
    return RealtimeApiResponse.success(deploymentService.status(id));
  }

  @PostMapping("/{id}/savepoints")
  public RealtimeApiResponse<SavepointResult> triggerSavepoint(
      @PathVariable Long id, @RequestBody(required = false) SavepointRequest request) {
    return RealtimeApiResponse.success(deploymentService.triggerSavepoint(
        id, request == null ? null : request.getTargetDirectory()));
  }

  @GetMapping("/{id}/deployments")
  public RealtimeApiResponse<List<RealtimeDeploymentPO>> deployments(@PathVariable Long id) {
    jobService.get(id);
    return RealtimeApiResponse.success(deploymentService.listByJob(id));
  }
}

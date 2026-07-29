package io.yak.ops.business.sync.realtime.controller;

import io.yak.ops.business.sync.realtime.config.ConditionalOnRealtimeSyncEnabled;
import io.yak.ops.business.sync.realtime.model.po.RealtimeEnvironmentPO;
import io.yak.ops.business.sync.realtime.model.request.RealtimeEnvironmentRequest;
import io.yak.ops.business.sync.realtime.model.response.RealtimeApiResponse;
import io.yak.ops.business.sync.realtime.model.response.RealtimeEnvironmentView;
import io.yak.ops.business.sync.realtime.model.response.ValidationResult;
import io.yak.ops.business.sync.realtime.service.RealtimeEnvironmentService;
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

/** 实时同步运行环境接口。 */
@ConditionalOnRealtimeSyncEnabled
@RestController
@RequestMapping("/api/v1/realtime-sync/environments")
@RequiredArgsConstructor
public class RealtimeEnvironmentController {

  private final RealtimeEnvironmentService service;

  @GetMapping
  public RealtimeApiResponse<List<RealtimeEnvironmentView>> list() {
    return RealtimeApiResponse.success(service.list().stream()
        .map(value -> RealtimeEnvironmentView.from(value, service.deploymentConfig(value)))
        .toList());
  }

  @GetMapping("/{id}")
  public RealtimeApiResponse<RealtimeEnvironmentView> get(@PathVariable Long id) {
    RealtimeEnvironmentPO value = service.get(id);
    return RealtimeApiResponse.success(
        RealtimeEnvironmentView.from(value, service.deploymentConfig(value)));
  }

  @PostMapping
  public RealtimeApiResponse<Long> create(
      @Valid @RequestBody RealtimeEnvironmentRequest request) {
    return RealtimeApiResponse.success(service.create(request));
  }

  @PutMapping("/{id}")
  public RealtimeApiResponse<Void> update(
      @PathVariable Long id, @Valid @RequestBody RealtimeEnvironmentRequest request) {
    service.update(id, request);
    return RealtimeApiResponse.success();
  }

  @DeleteMapping("/{id}")
  public RealtimeApiResponse<Void> delete(@PathVariable Long id) {
    service.delete(id);
    return RealtimeApiResponse.success();
  }

  @PostMapping("/{id}/check")
  public RealtimeApiResponse<ValidationResult> check(@PathVariable Long id) {
    return RealtimeApiResponse.success(service.check(id));
  }
}

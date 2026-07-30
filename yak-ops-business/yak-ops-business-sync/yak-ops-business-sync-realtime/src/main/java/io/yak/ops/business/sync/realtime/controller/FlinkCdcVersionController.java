package io.yak.ops.business.sync.realtime.controller;

import io.yak.ops.business.sync.realtime.config.ConditionalOnRealtimeSyncEnabled;
import io.yak.ops.business.sync.realtime.model.po.FlinkCdcVersionPO;
import io.yak.ops.business.sync.realtime.model.request.FlinkCdcVersionRequest;
import io.yak.ops.business.sync.realtime.model.response.RealtimeApiResponse;
import io.yak.ops.business.sync.realtime.service.FlinkCdcVersionService;
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

/** Flink CDC 版本管理接口。 */
@ConditionalOnRealtimeSyncEnabled
@RestController
@RequestMapping("/api/v1/realtime-sync/cdc-versions")
@RequiredArgsConstructor
public class FlinkCdcVersionController {

  private final FlinkCdcVersionService service;

  @GetMapping
  public RealtimeApiResponse<List<FlinkCdcVersionPO>> list() {
    return RealtimeApiResponse.success(service.list());
  }

  @GetMapping("/{id}")
  public RealtimeApiResponse<FlinkCdcVersionPO> get(@PathVariable Long id) {
    return RealtimeApiResponse.success(service.get(id));
  }

  @PostMapping
  public RealtimeApiResponse<Long> create(@Valid @RequestBody FlinkCdcVersionRequest request) {
    return RealtimeApiResponse.success(service.create(request));
  }

  @PutMapping("/{id}")
  public RealtimeApiResponse<Void> update(
      @PathVariable Long id, @Valid @RequestBody FlinkCdcVersionRequest request) {
    service.update(id, request);
    return RealtimeApiResponse.success();
  }

  @DeleteMapping("/{id}")
  public RealtimeApiResponse<Void> delete(@PathVariable Long id) {
    service.delete(id);
    return RealtimeApiResponse.success();
  }

  @PostMapping("/{id}/default")
  public RealtimeApiResponse<Void> setDefault(@PathVariable Long id) {
    service.setDefault(id);
    return RealtimeApiResponse.success();
  }
}

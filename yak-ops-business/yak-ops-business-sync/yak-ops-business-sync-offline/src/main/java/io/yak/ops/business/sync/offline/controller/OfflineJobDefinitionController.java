package io.yak.ops.business.sync.offline.controller;

import io.yak.ops.business.sync.offline.config.ConditionalOnOfflineSyncEnabled;
import com.fasterxml.jackson.databind.JsonNode;
import io.yak.ops.business.sync.offline.model.response.OfflineApiResponse;
import io.yak.ops.business.sync.offline.service.OfflineJobDefinitionService;
import java.util.Map;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** 离线同步任务定义接口，保持现有前端 batch-definition 契约。 */
@ConditionalOnOfflineSyncEnabled
@RestController
@RequestMapping("/api/v1/job/batch-definition")
public class OfflineJobDefinitionController {

  private final OfflineJobDefinitionService service;

  public OfflineJobDefinitionController(OfflineJobDefinitionService service) {
    this.service = service;
  }

  @GetMapping("/get-unique-id")
  public OfflineApiResponse<Long> nextId() {
    return OfflineApiResponse.success(service.nextId());
  }

  @PostMapping("/guide-single/saveOrUpdate")
  public OfflineApiResponse<Long> saveGuideSingle(@RequestBody JsonNode request) {
    return OfflineApiResponse.success(service.saveGuide(request));
  }

  @PostMapping("/guide-multi/saveOrUpdate")
  public OfflineApiResponse<Long> saveGuideMulti(@RequestBody JsonNode request) {
    return OfflineApiResponse.success(service.saveGuide(request));
  }

  @PostMapping("/script/saveOrUpdate")
  public OfflineApiResponse<Long> saveScript(@RequestBody JsonNode request) {
    return OfflineApiResponse.success(service.saveScript(request));
  }

  @PostMapping("/guide-single/build-config")
  public OfflineApiResponse<String> buildGuideSingleConfig(@RequestBody JsonNode request) {
    return OfflineApiResponse.success(service.buildGuideConfig(request));
  }

  @PostMapping("/guide-multi/build-config")
  public OfflineApiResponse<String> buildGuideMultiConfig(@RequestBody JsonNode request) {
    return OfflineApiResponse.success(service.buildGuideConfig(request));
  }

  @PostMapping("/script/build-config")
  public OfflineApiResponse<String> buildScriptConfig(@RequestBody JsonNode request) {
    return OfflineApiResponse.success(service.buildScriptConfig(request));
  }

  @PostMapping("/buildHoconConfig")
  public OfflineApiResponse<String> buildHoconConfig(@RequestBody JsonNode request) {
    String mode = request.path("basic").path("mode").asText(request.path("mode").asText());
    return OfflineApiResponse.success(
        "SCRIPT".equalsIgnoreCase(mode)
            ? service.buildScriptConfig(request)
            : service.buildGuideConfig(request));
  }

  @GetMapping("/{id}")
  public OfflineApiResponse<Map<String, Object>> get(@PathVariable Long id) {
    return OfflineApiResponse.success(service.get(id));
  }

  @GetMapping("/{id}/edit-detail")
  public OfflineApiResponse<JsonNode> editDetail(@PathVariable Long id) {
    return OfflineApiResponse.success(service.getEditDetail(id));
  }

  @PostMapping("/page")
  public OfflineApiResponse<Map<String, Object>> page(@RequestBody(required = false) JsonNode request) {
    return OfflineApiResponse.success(service.page(request));
  }

  @PutMapping("/{id}/online")
  public OfflineApiResponse<Boolean> online(@PathVariable Long id) {
    return OfflineApiResponse.success(service.online(id));
  }

  @PutMapping("/{id}/offline")
  public OfflineApiResponse<Boolean> offline(@PathVariable Long id) {
    return OfflineApiResponse.success(service.offline(id));
  }

  @DeleteMapping("/{id}")
  public OfflineApiResponse<Boolean> delete(@PathVariable Long id) {
    return OfflineApiResponse.success(service.delete(id));
  }
}

package io.yak.ops.business.sync.offline.controller;

import com.fasterxml.jackson.databind.JsonNode;
import io.yak.framework.common.PagingResult;
import io.yak.framework.common.Result;
import io.yak.ops.business.sync.offline.config.ConditionalOnOfflineSyncEnabled;
import io.yak.ops.business.sync.offline.service.OfflineJobDefinitionService;
import io.yak.ops.common.bean.dto.sync.offline.OfflineJobDefinitionDTO;
import io.yak.ops.common.bean.dto.sync.offline.OfflineJobDefinitionQueryDTO;
import io.yak.ops.common.bean.vo.sync.offline.OfflineJobDefinitionVO;
import jakarta.validation.Valid;
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
  public Result<Long> nextId() {
    return Result.success(service.nextId());
  }

  @PostMapping("/guide-single/saveOrUpdate")
  public Result<Long> saveGuideSingle(@RequestBody OfflineJobDefinitionDTO requestDTO) {
    return Result.success(service.saveGuide(requestDTO));
  }

  @PostMapping("/guide-multi/saveOrUpdate")
  public Result<Long> saveGuideMulti(@RequestBody OfflineJobDefinitionDTO requestDTO) {
    return Result.success(service.saveGuide(requestDTO));
  }

  @PostMapping("/script/saveOrUpdate")
  public Result<Long> saveScript(@RequestBody OfflineJobDefinitionDTO requestDTO) {
    return Result.success(service.saveScript(requestDTO));
  }

  @PostMapping("/guide-single/build-config")
  public Result<String> buildGuideSingleConfig(@RequestBody OfflineJobDefinitionDTO requestDTO) {
    return Result.success(service.buildGuideConfig(requestDTO));
  }

  @PostMapping("/guide-multi/build-config")
  public Result<String> buildGuideMultiConfig(@RequestBody OfflineJobDefinitionDTO requestDTO) {
    return Result.success(service.buildGuideConfig(requestDTO));
  }

  @PostMapping("/script/build-config")
  public Result<String> buildScriptConfig(@RequestBody OfflineJobDefinitionDTO requestDTO) {
    return Result.success(service.buildScriptConfig(requestDTO));
  }

  @PostMapping("/buildHoconConfig")
  public Result<String> buildHoconConfig(@RequestBody OfflineJobDefinitionDTO requestDTO) {
    String mode = requestDTO == null ? null : requestDTO.getMode();
    if (requestDTO != null
        && requestDTO.getBasic() != null
        && requestDTO.getBasic().getMode() != null) {
      mode = requestDTO.getBasic().getMode();
    }
    return Result.success(
        "SCRIPT".equalsIgnoreCase(mode)
            ? service.buildScriptConfig(requestDTO)
            : service.buildGuideConfig(requestDTO));
  }

  @GetMapping("/{id}")
  public Result<OfflineJobDefinitionVO> get(@PathVariable Long id) {
    return Result.success(service.get(id));
  }

  @GetMapping("/{id}/edit-detail")
  public Result<JsonNode> editDetail(@PathVariable Long id) {
    return Result.success(service.getEditDetail(id));
  }

  @PostMapping("/page")
  public PagingResult<OfflineJobDefinitionVO> page(
      @Valid @RequestBody(required = false) OfflineJobDefinitionQueryDTO queryDTO) {
    return PagingResult.success(service.page(queryDTO));
  }

  @PutMapping("/{id}/online")
  public Result<Boolean> online(@PathVariable Long id) {
    return Result.success(service.online(id));
  }

  @PutMapping("/{id}/offline")
  public Result<Boolean> offline(@PathVariable Long id) {
    return Result.success(service.offline(id));
  }

  @DeleteMapping("/{id}")
  public Result<Boolean> delete(@PathVariable Long id) {
    return Result.success(service.delete(id));
  }
}

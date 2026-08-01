package io.yak.ops.business.sync.offline.controller;

import io.yak.framework.common.Result;
import io.yak.ops.business.sync.offline.config.ConditionalOnOfflineSyncEnabled;
import io.yak.ops.business.sync.offline.form.ConnectorFormActionService;
import io.yak.ops.business.sync.offline.form.ConnectorFormActionService.ActionRequest;
import io.yak.ops.business.sync.offline.form.ConnectorFormActionService.ActionResult;
import io.yak.ops.business.sync.offline.form.ConnectorFormSchema;
import io.yak.ops.business.sync.offline.form.ConnectorFormSchemaService;
import io.yak.ops.business.sync.offline.form.ConnectorFormValidationService;
import io.yak.ops.business.sync.offline.form.ConnectorFormValidationService.ValidationRequest;
import io.yak.ops.business.sync.offline.form.ConnectorFormValidationService.ValidationResult;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Yak Ops Connector Form Schema、复杂交互与 Action 接口。
 *
 * @author weifuwan
 */
@ConditionalOnOfflineSyncEnabled
@RestController
@RequestMapping("/api/v1/job/batch-control/connectors")
@RequiredArgsConstructor
public class OfflineConnectorFormController {

  private final ConnectorFormSchemaService service;
  private final ConnectorFormValidationService validationService;
  private final ConnectorFormActionService actionService;

  @GetMapping("/form-schemas")
  public Result<List<ConnectorFormSchema>> list(
      @RequestParam(required = false) String role) {
    return Result.success(service.list(role));
  }

  @GetMapping("/{connectorId}/form-schema")
  public Result<ConnectorFormSchema> get(
      @PathVariable String connectorId,
      @RequestParam String role) {
    return Result.success(service.get(connectorId, role));
  }

  @PostMapping("/{connectorId}/form-schema/validate")
  public Result<ValidationResult> validate(
      @PathVariable String connectorId,
      @RequestParam String role,
      @RequestBody(required = false) ValidationRequest request) {
    return Result.success(validationService.validate(connectorId, role, request));
  }

  @PostMapping("/actions/{action}")
  public Result<ActionResult> action(
      @PathVariable String action,
      @RequestBody ActionRequest request) {
    return Result.success(actionService.execute(action, request));
  }

  @PostMapping("/schemas/refresh")
  public Result<Map<String, Object>> refresh() {
    int count = service.refresh();
    return Result.success(Map.of("refreshed", count));
  }
}

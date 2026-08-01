package io.yak.ops.business.sync.offline.controller;

import io.yak.framework.common.Result;
import io.yak.ops.business.sync.offline.config.ConditionalOnOfflineSyncEnabled;
import io.yak.ops.business.sync.offline.form.ConnectorFormSchema;
import io.yak.ops.business.sync.offline.form.ConnectorFormSchemaService;
import java.util.List;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Yak Ops Connector Form Schema 接口。 */
@ConditionalOnOfflineSyncEnabled
@RestController
@RequestMapping("/api/v1/job/batch-control/connectors")
public class OfflineConnectorFormController {

  private final ConnectorFormSchemaService service;

  public OfflineConnectorFormController(ConnectorFormSchemaService service) {
    this.service = service;
  }

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

  @PostMapping("/schemas/refresh")
  public Result<Map<String, Object>> refresh() {
    int count = service.refresh();
    return Result.success(Map.of("refreshed", count));
  }
}

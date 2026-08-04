package io.yak.ops.business.development.controller.v1;

import io.yak.framework.common.Result;
import io.yak.ops.business.development.api.DataDevelopmentPlatformApi.PlatformSnapshotView;
import io.yak.ops.business.development.api.DataDevelopmentPlatformApi.SaveEngineEndpointRequest;
import io.yak.ops.business.development.api.DataDevelopmentPlatformApi.SaveEnvironmentRequest;
import io.yak.ops.business.development.api.DataDevelopmentPlatformApi.SaveParameterTemplateRequest;
import io.yak.ops.business.development.api.DataDevelopmentPlatformApi.SaveSecretRequest;
import io.yak.ops.business.development.config.ConditionalOnDataDevelopmentEnabled;
import io.yak.ops.business.development.domain.DataDevelopmentPlatformModel.AuditEntry;
import io.yak.ops.business.development.domain.DataDevelopmentPlatformModel.EngineEndpoint;
import io.yak.ops.business.development.domain.DataDevelopmentPlatformModel.Environment;
import io.yak.ops.business.development.domain.DataDevelopmentPlatformModel.ParameterTemplate;
import io.yak.ops.business.development.domain.DataDevelopmentPlatformModel.PlatformOverview;
import io.yak.ops.business.development.domain.DataDevelopmentPlatformModel.SecretMetadata;
import io.yak.ops.business.development.service.DataDevelopmentPlatformService;
import jakarta.validation.Valid;
import java.security.Principal;
import java.util.List;
import java.util.Map;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Platform configuration, governance, health and audit API. */
@ConditionalOnDataDevelopmentEnabled
@RestController
@RequestMapping("/api/v1/data-development/platform")
public final class DataDevelopmentPlatformController {

  private final DataDevelopmentPlatformService service;

  public DataDevelopmentPlatformController(DataDevelopmentPlatformService service) {
    this.service = service;
  }

  @GetMapping("/snapshot")
  public Result<PlatformSnapshotView> snapshot() { return Result.success(service.snapshot()); }

  @GetMapping("/overview")
  public Result<PlatformOverview> overview() { return Result.success(service.overview()); }

  @GetMapping("/environments")
  public Result<List<Environment>> environments() { return Result.success(service.listEnvironments()); }

  @PostMapping("/environments")
  public Result<Environment> createEnvironment(
      @Valid @RequestBody SaveEnvironmentRequest request, Principal principal) {
    return Result.success(service.saveEnvironment(request, operator(principal)));
  }

  @PutMapping("/environments/{id}")
  public Result<Environment> updateEnvironment(
      @PathVariable long id, @Valid @RequestBody SaveEnvironmentRequest request,
      Principal principal) {
    return Result.success(service.saveEnvironment(new SaveEnvironmentRequest(id, request.code(),
        request.name(), request.environmentType(), request.description(), request.enabled(),
        request.variables(), request.lockVersion()), operator(principal)));
  }

  @DeleteMapping("/environments/{id}")
  public Result<Map<String, Boolean>> deleteEnvironment(@PathVariable long id, Principal principal) {
    service.deleteEnvironment(id, operator(principal));
    return Result.success(Map.of("deleted", true));
  }

  @GetMapping("/secrets")
  public Result<List<SecretMetadata>> secrets() { return Result.success(service.listSecrets()); }

  @PostMapping("/secrets")
  public Result<SecretMetadata> createSecret(
      @Valid @RequestBody SaveSecretRequest request, Principal principal) {
    return Result.success(service.saveSecret(request, operator(principal)));
  }

  @PutMapping("/secrets/{id}")
  public Result<SecretMetadata> updateSecret(
      @PathVariable long id, @Valid @RequestBody SaveSecretRequest request,
      Principal principal) {
    return Result.success(service.saveSecret(new SaveSecretRequest(id, request.environmentId(),
        request.secretKey(), request.description(), request.secretValue()), operator(principal)));
  }

  @DeleteMapping("/secrets/{id}")
  public Result<Map<String, Boolean>> deleteSecret(@PathVariable long id, Principal principal) {
    service.deleteSecret(id, operator(principal));
    return Result.success(Map.of("deleted", true));
  }

  @GetMapping("/parameter-templates")
  public Result<List<ParameterTemplate>> parameterTemplates() {
    return Result.success(service.listParameterTemplates());
  }

  @PostMapping("/parameter-templates")
  public Result<ParameterTemplate> createParameterTemplate(
      @Valid @RequestBody SaveParameterTemplateRequest request, Principal principal) {
    return Result.success(service.saveParameterTemplate(request, operator(principal)));
  }

  @PutMapping("/parameter-templates/{id}")
  public Result<ParameterTemplate> updateParameterTemplate(
      @PathVariable long id, @Valid @RequestBody SaveParameterTemplateRequest request,
      Principal principal) {
    return Result.success(service.saveParameterTemplate(new SaveParameterTemplateRequest(id,
        request.code(), request.name(), request.description(), request.enabled(),
        request.parameters(), request.lockVersion()), operator(principal)));
  }

  @DeleteMapping("/parameter-templates/{id}")
  public Result<Map<String, Boolean>> deleteParameterTemplate(
      @PathVariable long id, Principal principal) {
    service.deleteParameterTemplate(id, operator(principal));
    return Result.success(Map.of("deleted", true));
  }

  @GetMapping("/engines")
  public Result<List<EngineEndpoint>> engines() { return Result.success(service.listEngines()); }

  @PostMapping("/engines")
  public Result<EngineEndpoint> createEngine(
      @Valid @RequestBody SaveEngineEndpointRequest request, Principal principal) {
    return Result.success(service.saveEngine(request, operator(principal)));
  }

  @PutMapping("/engines/{id}")
  public Result<EngineEndpoint> updateEngine(
      @PathVariable long id, @Valid @RequestBody SaveEngineEndpointRequest request,
      Principal principal) {
    return Result.success(service.saveEngine(new SaveEngineEndpointRequest(id,
        request.taskType(), request.code(), request.name(), request.probeType(),
        request.endpoint(), request.enabled(), request.config(), request.lockVersion()),
        operator(principal)));
  }

  @PostMapping("/engines/{id}/check")
  public Result<EngineEndpoint> checkEngine(@PathVariable long id, Principal principal) {
    return Result.success(service.checkEngine(id, operator(principal)));
  }

  @PostMapping("/engines/check-all")
  public Result<List<EngineEndpoint>> checkAllEngines(Principal principal) {
    return Result.success(service.checkAllEngines(operator(principal)));
  }

  @DeleteMapping("/engines/{id}")
  public Result<Map<String, Boolean>> deleteEngine(@PathVariable long id, Principal principal) {
    service.deleteEngine(id, operator(principal));
    return Result.success(Map.of("deleted", true));
  }

  @GetMapping("/audit")
  public Result<List<AuditEntry>> audit(@RequestParam(defaultValue = "100") int limit) {
    return Result.success(service.listAudit(limit));
  }

  private static String operator(Principal principal) {
    return principal == null || principal.getName() == null || principal.getName().isBlank()
        ? "system" : principal.getName();
  }
}

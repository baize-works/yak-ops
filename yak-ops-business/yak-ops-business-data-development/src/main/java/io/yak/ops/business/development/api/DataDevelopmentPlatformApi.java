package io.yak.ops.business.development.api;

import com.fasterxml.jackson.databind.JsonNode;
import io.yak.ops.business.development.domain.DataDevelopmentPlatformModel.AuditEntry;
import io.yak.ops.business.development.domain.DataDevelopmentPlatformModel.EngineEndpoint;
import io.yak.ops.business.development.domain.DataDevelopmentPlatformModel.Environment;
import io.yak.ops.business.development.domain.DataDevelopmentPlatformModel.ParameterTemplate;
import io.yak.ops.business.development.domain.DataDevelopmentPlatformModel.PlatformOverview;
import io.yak.ops.business.development.domain.DataDevelopmentPlatformModel.SecretMetadata;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import java.util.List;

/** REST contracts for data-development platform capabilities. */
public final class DataDevelopmentPlatformApi {

  private DataDevelopmentPlatformApi() {
  }

  public record SaveEnvironmentRequest(
      Long id,
      @NotBlank String code,
      @NotBlank String name,
      @NotBlank String environmentType,
      String description,
      boolean enabled,
      @NotNull JsonNode variables,
      @PositiveOrZero Integer lockVersion) {
  }

  public record SaveSecretRequest(
      Long id,
      @PositiveOrZero Long environmentId,
      @NotBlank String secretKey,
      String description,
      String secretValue) {
  }

  public record SaveParameterTemplateRequest(
      Long id,
      @NotBlank String code,
      @NotBlank String name,
      String description,
      boolean enabled,
      @NotNull JsonNode parameters,
      @PositiveOrZero Integer lockVersion) {
  }

  public record SaveEngineEndpointRequest(
      Long id,
      @NotBlank String taskType,
      @NotBlank String code,
      @NotBlank String name,
      @NotBlank String probeType,
      String endpoint,
      boolean enabled,
      @NotNull JsonNode config,
      @PositiveOrZero Integer lockVersion) {
  }

  public record PlatformSnapshotView(
      PlatformOverview overview,
      List<Environment> environments,
      List<SecretMetadata> secrets,
      List<ParameterTemplate> parameterTemplates,
      List<EngineEndpoint> engines,
      List<AuditEntry> recentAudit,
      boolean secretEncryptionConfigured) {
  }
}

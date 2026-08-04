package io.yak.ops.business.development.domain;

import com.fasterxml.jackson.databind.JsonNode;
import java.time.LocalDateTime;

/** Platform-level environment, secret, template, engine and audit records. */
public final class DataDevelopmentPlatformModel {

  private DataDevelopmentPlatformModel() {
  }

  public enum EnvironmentType {
    DEVELOPMENT,
    TESTING,
    STAGING,
    PRODUCTION
  }

  public enum ProbeType {
    LOCAL_PLUGIN,
    HTTP,
    TCP
  }

  public enum HealthStatus {
    UNKNOWN,
    HEALTHY,
    DEGRADED,
    UNHEALTHY,
    DISABLED
  }

  public record Environment(
      Long id,
      String code,
      String name,
      EnvironmentType environmentType,
      String description,
      boolean enabled,
      JsonNode variables,
      int lockVersion,
      String createdBy,
      String updatedBy,
      LocalDateTime createdAt,
      LocalDateTime updatedAt) {
  }

  public record SecretMetadata(
      Long id,
      Long environmentId,
      String secretKey,
      String description,
      String maskedValue,
      String updatedBy,
      LocalDateTime updatedAt) {
  }

  public record ParameterTemplate(
      Long id,
      String code,
      String name,
      String description,
      boolean enabled,
      JsonNode parameters,
      int lockVersion,
      String createdBy,
      String updatedBy,
      LocalDateTime createdAt,
      LocalDateTime updatedAt) {
  }

  public record EngineEndpoint(
      Long id,
      String taskType,
      String code,
      String name,
      ProbeType probeType,
      String endpoint,
      boolean enabled,
      JsonNode config,
      HealthStatus healthStatus,
      String healthMessage,
      LocalDateTime lastCheckedAt,
      int lockVersion,
      String createdBy,
      String updatedBy,
      LocalDateTime createdAt,
      LocalDateTime updatedAt) {
  }

  public record AuditEntry(
      Long id,
      String action,
      String resourceType,
      String resourceId,
      JsonNode summary,
      String operator,
      LocalDateTime occurredAt) {
  }

  public record PlatformOverview(
      long projectCount,
      long taskCount,
      long executionCount24h,
      long failedExecutionCount24h,
      long environmentCount,
      long secretCount,
      long templateCount,
      long healthyEngineCount,
      long unhealthyEngineCount,
      double successRate24h) {
  }
}

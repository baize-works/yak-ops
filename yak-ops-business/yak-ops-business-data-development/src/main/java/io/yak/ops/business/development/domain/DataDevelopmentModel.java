package io.yak.ops.business.development.domain;

import com.fasterxml.jackson.databind.JsonNode;
import java.time.LocalDateTime;

/** Compact domain records for the data-development control plane. */
public final class DataDevelopmentModel {

  private DataDevelopmentModel() {
  }

  public enum ResourceKind {
    FOLDER,
    TASK,
    ASSET
  }

  public enum TaskStatus {
    DRAFT,
    PUBLISHED,
    ARCHIVED
  }

  public enum ExecutionSourceType {
    DRAFT_REVISION,
    PUBLISHED_VERSION,
    EPHEMERAL_SNAPSHOT
  }

  public enum ExecutionStatus {
    CREATED,
    QUEUED,
    RUNNING,
    SUCCEEDED,
    FAILED,
    CANCELED,
    TIMED_OUT,
    LOST;

    public boolean terminal() {
      return this == SUCCEEDED
          || this == FAILED
          || this == CANCELED
          || this == TIMED_OUT
          || this == LOST;
    }
  }

  public record Project(
      Long id,
      String code,
      String name,
      String description,
      String createdBy,
      LocalDateTime createdAt,
      LocalDateTime updatedAt) {
  }

  public record Resource(
      Long id,
      Long projectId,
      Long parentId,
      ResourceKind resourceKind,
      String name,
      String description,
      int sortOrder,
      String ownerId,
      String createdBy,
      String updatedBy,
      boolean deleted,
      int lockVersion,
      LocalDateTime createdAt,
      LocalDateTime updatedAt) {
  }

  public record Task(
      Long id,
      Long projectId,
      String taskType,
      String pluginVersion,
      int schemaVersion,
      TaskStatus status,
      long draftRevision,
      Long publishedVersionId,
      String engineType,
      LocalDateTime createdAt,
      LocalDateTime updatedAt) {
  }

  public record Draft(
      Long taskId,
      long revision,
      String pluginVersion,
      int schemaVersion,
      JsonNode definition,
      String contentDigest,
      String updatedBy,
      LocalDateTime updatedAt) {
  }

  public record Version(
      Long id,
      Long taskId,
      int versionNumber,
      String taskType,
      String pluginVersion,
      int schemaVersion,
      JsonNode definitionSnapshot,
      JsonNode compiledSpec,
      JsonNode inputSchema,
      JsonNode outputSchema,
      String contentDigest,
      String publishComment,
      String publishedBy,
      LocalDateTime publishedAt) {
  }

  public record Execution(
      Long id,
      Long taskId,
      ExecutionSourceType sourceType,
      Long draftRevision,
      Long taskVersionId,
      String taskType,
      String pluginVersion,
      JsonNode definitionSnapshot,
      JsonNode compiledSpecSnapshot,
      JsonNode runtimeSnapshot,
      JsonNode inputSnapshot,
      ExecutionStatus status,
      int currentAttemptNo,
      String idempotencyKey,
      String createdBy,
      LocalDateTime createdAt,
      LocalDateTime startedAt,
      LocalDateTime finishedAt,
      String errorCode,
      String errorMessage) {
  }
}

package io.yak.ops.business.workflow.model;

import io.yak.ops.business.workflow.model.WorkflowEnums.AttemptState;
import io.yak.ops.business.workflow.model.WorkflowEnums.DefinitionState;
import io.yak.ops.business.workflow.model.WorkflowEnums.FailureStrategy;
import io.yak.ops.business.workflow.model.WorkflowEnums.MisfirePolicy;
import io.yak.ops.business.workflow.model.WorkflowEnums.ScheduleConcurrencyPolicy;
import io.yak.ops.business.workflow.model.WorkflowEnums.TaskState;
import io.yak.ops.business.workflow.model.WorkflowEnums.TriggerType;
import io.yak.ops.business.workflow.model.WorkflowEnums.WorkflowState;
import java.time.Instant;
import java.util.Map;

/** Immutable records returned by the workflow repository and REST layer. */
public final class WorkflowRecords {

  private WorkflowRecords() {
  }

  public record Definition(
      long id,
      String code,
      String name,
      String description,
      DefinitionState state,
      Integer currentVersion,
      FailureStrategy failureStrategy,
      int maxParallelism,
      WorkflowDag draft,
      String createdBy,
      Instant createdAt,
      Instant updatedAt) {
  }

  public record Version(
      long id,
      long workflowId,
      int version,
      WorkflowDag dag,
      String contentHash,
      String publishedBy,
      Instant publishedAt) {
  }

  public record Instance(
      long id,
      long workflowId,
      int workflowVersion,
      TriggerType triggerType,
      WorkflowState state,
      Map<String, Object> globalParameters,
      FailureStrategy failureStrategy,
      int maxParallelism,
      boolean stopRequested,
      Instant startTime,
      Instant endTime,
      String createdBy,
      Instant createdAt) {
  }

  public record TaskInstance(
      long id,
      long workflowInstanceId,
      String nodeKey,
      String nodeName,
      String taskType,
      TaskState state,
      Map<String, Object> configuration,
      int maxRetryTimes,
      int retryCount,
      int retryIntervalSeconds,
      int timeoutSeconds,
      boolean idempotent,
      boolean retryOnRestart,
      Instant nextRetryTime,
      Instant startTime,
      Instant endTime,
      Map<String, Object> resultData,
      String errorMessage) {
  }

  public record Attempt(
      long id,
      long taskInstanceId,
      int attemptNo,
      AttemptState state,
      String executorType,
      String externalId,
      Instant startTime,
      Instant endTime,
      String errorMessage) {
  }

  public record Schedule(
      long id,
      long workflowId,
      String cronExpression,
      String timezone,
      boolean enabled,
      MisfirePolicy misfirePolicy,
      ScheduleConcurrencyPolicy concurrencyPolicy,
      Instant updatedAt) {
  }
}

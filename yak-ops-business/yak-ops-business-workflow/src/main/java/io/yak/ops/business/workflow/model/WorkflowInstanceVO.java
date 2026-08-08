package io.yak.ops.business.workflow.model;

import java.time.Instant;
import java.util.List;
import java.util.Map;

public record WorkflowInstanceVO(
    String id,
    String definitionId,
    String sourceExecutionId,
    String name,
    String status,
    Instant startedAt,
    Instant runStartedAt,
    Instant endedAt,
    long workflowTimeoutSeconds,
    Map<String, Object> input,
    int nodeCount,
    int edgeCount,
    List<NodeInstanceVO> nodes) {

  public record NodeInstanceVO(
      String id,
      String name,
      String type,
      String status,
      String errorMessage,
      String failureReason,
      boolean continuedAfterFailure,
      int attemptCount,
      String currentAttemptId,
      Integer currentAttemptNumber,
      int retryMaxAttempts,
      long retryDelaySeconds,
      long dispatchTimeoutSeconds,
      long executionTimeoutSeconds,
      Map<String, String> inputMapping,
      Map<String, Object> input,
      Map<String, Map<String, Object>> predecessorOutputs,
      Map<String, Object> output,
      List<AttemptVO> attempts) {}

  public record AttemptVO(
      String id,
      int attemptNumber,
      String status,
      String failureReason,
      String errorMessage,
      Instant availableAt,
      Instant startedAt,
      Instant pausedAt,
      long pausedMillis,
      Instant endedAt) {}
}

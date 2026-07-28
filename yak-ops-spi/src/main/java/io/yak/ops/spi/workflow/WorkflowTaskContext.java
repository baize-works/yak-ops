package io.yak.ops.spi.workflow;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;

/** Immutable runtime data passed to a workflow task plugin. */
public record WorkflowTaskContext(
    long workflowInstanceId,
    long taskInstanceId,
    long attemptId,
    int attemptNo,
    String nodeKey,
    String taskType,
    Map<String, Object> configuration,
    Map<String, Object> globalParameters,
    WorkflowCancellationToken cancellationToken,
    WorkflowTaskLogger logger) {

  public WorkflowTaskContext {
    Objects.requireNonNull(nodeKey, "nodeKey");
    Objects.requireNonNull(taskType, "taskType");
    configuration = immutableCopy(configuration);
    globalParameters = immutableCopy(globalParameters);
    Objects.requireNonNull(cancellationToken, "cancellationToken");
    Objects.requireNonNull(logger, "logger");
  }

  private static Map<String, Object> immutableCopy(Map<String, Object> source) {
    if (source == null || source.isEmpty()) {
      return Map.of();
    }
    return Collections.unmodifiableMap(new LinkedHashMap<>(source));
  }
}

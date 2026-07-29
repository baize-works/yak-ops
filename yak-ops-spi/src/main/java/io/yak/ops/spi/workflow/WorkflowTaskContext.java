package io.yak.ops.spi.workflow;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;

/** Immutable runtime data passed to a workflow task plugin. */
public final class WorkflowTaskContext {

  private final long workflowInstanceId;
  private final long taskInstanceId;
  private final long attemptId;
  private final int attemptNo;
  private final String nodeKey;
  private final String taskType;
  private final Map<String, Object> configuration;
  private final Map<String, Object> globalParameters;
  private final Map<String, Object> parameters;
  private final WorkflowCancellationToken cancellationToken;
  private final WorkflowTaskLogger logger;

  public WorkflowTaskContext(
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
    this.workflowInstanceId = workflowInstanceId;
    this.taskInstanceId = taskInstanceId;
    this.attemptId = attemptId;
    this.attemptNo = attemptNo;
    this.nodeKey = Objects.requireNonNull(nodeKey, "nodeKey");
    this.taskType = Objects.requireNonNull(taskType, "taskType");
    this.configuration = immutableCopy(configuration);
    this.globalParameters = immutableCopy(globalParameters);
    this.parameters = buildParameters();
    this.cancellationToken = Objects.requireNonNull(cancellationToken, "cancellationToken");
    this.logger = Objects.requireNonNull(logger, "logger");
  }

  public long workflowInstanceId() {
    return workflowInstanceId;
  }

  public long getWorkflowInstanceId() {
    return workflowInstanceId;
  }

  public long taskInstanceId() {
    return taskInstanceId;
  }

  public long getTaskInstanceId() {
    return taskInstanceId;
  }

  public long attemptId() {
    return attemptId;
  }

  public long getAttemptId() {
    return attemptId;
  }

  public int attemptNo() {
    return attemptNo;
  }

  public int getAttemptNo() {
    return attemptNo;
  }

  public String nodeKey() {
    return nodeKey;
  }

  public String getNodeKey() {
    return nodeKey;
  }

  public String taskType() {
    return taskType;
  }

  public String getTaskType() {
    return taskType;
  }

  public Map<String, Object> configuration() {
    return configuration;
  }

  public Map<String, Object> getConfiguration() {
    return configuration;
  }

  public Map<String, Object> globalParameters() {
    return globalParameters;
  }

  public Map<String, Object> getGlobalParameters() {
    return globalParameters;
  }

  /**
   * Returns the unified parameter namespace used by task plugins.
   *
   * <p>Global parameters remain available at the top level for backward compatibility. They are
   * also exposed under {@code global.*}. Runtime identifiers are exposed under {@code system.*}.
   */
  public Map<String, Object> parameters() {
    return parameters;
  }

  public Map<String, Object> getParameters() {
    return parameters;
  }

  public WorkflowCancellationToken cancellationToken() {
    return cancellationToken;
  }

  public WorkflowCancellationToken getCancellationToken() {
    return cancellationToken;
  }

  public WorkflowTaskLogger logger() {
    return logger;
  }

  public WorkflowTaskLogger getLogger() {
    return logger;
  }

  private Map<String, Object> buildParameters() {
    Map<String, Object> values = new LinkedHashMap<>(globalParameters);
    values.put("global", globalParameters);

    Map<String, Object> system = new LinkedHashMap<>();
    system.put("workflowInstanceId", workflowInstanceId);
    system.put("taskInstanceId", taskInstanceId);
    system.put("attemptId", attemptId);
    system.put("attemptNo", attemptNo);
    system.put("nodeKey", nodeKey);
    system.put("taskType", taskType);
    values.put("system", Collections.unmodifiableMap(system));
    return Collections.unmodifiableMap(values);
  }

  private static Map<String, Object> immutableCopy(Map<String, Object> source) {
    if (source == null || source.isEmpty()) {
      return Map.of();
    }
    return Collections.unmodifiableMap(new LinkedHashMap<>(source));
  }
}

package io.yak.ops.plugin.task.api;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;

/** Immutable runtime data passed to a task executor. */
public final class TaskExecutionContext {

  private final long executionId;
  private final long taskId;
  private final long attemptId;
  private final int attemptNo;
  private final String taskKey;
  private final String taskType;
  private final Map<String, Object> configuration;
  private final Map<String, Object> globalParameters;
  private final Map<String, Object> parameters;
  private final TaskCancellationToken cancellationToken;
  private final TaskLogger logger;

  public TaskExecutionContext(
      long executionId,
      long taskId,
      long attemptId,
      int attemptNo,
      String taskKey,
      String taskType,
      Map<String, Object> configuration,
      Map<String, Object> globalParameters,
      TaskCancellationToken cancellationToken,
      TaskLogger logger) {
    this.executionId = executionId;
    this.taskId = taskId;
    this.attemptId = attemptId;
    this.attemptNo = attemptNo;
    this.taskKey = Objects.requireNonNull(taskKey, "taskKey");
    this.taskType = Objects.requireNonNull(taskType, "taskType");
    this.configuration = immutableCopy(configuration);
    this.globalParameters = immutableCopy(globalParameters);
    this.parameters = buildParameters();
    this.cancellationToken = Objects.requireNonNull(cancellationToken, "cancellationToken");
    this.logger = Objects.requireNonNull(logger, "logger");
  }

  public long executionId() {
    return executionId;
  }

  public long taskId() {
    return taskId;
  }

  public long attemptId() {
    return attemptId;
  }

  public int attemptNo() {
    return attemptNo;
  }

  public String taskKey() {
    return taskKey;
  }

  public String taskType() {
    return taskType;
  }

  public Map<String, Object> configuration() {
    return configuration;
  }

  public Map<String, Object> globalParameters() {
    return globalParameters;
  }

  public Map<String, Object> parameters() {
    return parameters;
  }

  public TaskCancellationToken cancellationToken() {
    return cancellationToken;
  }

  public TaskLogger logger() {
    return logger;
  }

  private Map<String, Object> buildParameters() {
    Map<String, Object> values = new LinkedHashMap<>(globalParameters);
    values.put("global", globalParameters);

    Map<String, Object> system = new LinkedHashMap<>();
    system.put("executionId", executionId);
    system.put("taskId", taskId);
    system.put("attemptId", attemptId);
    system.put("attemptNo", attemptNo);
    system.put("taskKey", taskKey);
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

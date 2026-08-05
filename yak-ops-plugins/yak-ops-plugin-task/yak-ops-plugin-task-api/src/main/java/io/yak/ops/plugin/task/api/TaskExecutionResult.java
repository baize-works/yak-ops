package io.yak.ops.plugin.task.api;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;

/** Immutable result returned by one physical task attempt. */
public final class TaskExecutionResult {

  private final boolean success;
  private final String externalId;
  private final Map<String, Object> outputs;
  private final String message;

  public TaskExecutionResult(
      boolean success,
      String externalId,
      Map<String, Object> outputs,
      String message) {
    this.success = success;
    this.externalId = externalId;
    this.outputs = outputs == null || outputs.isEmpty()
        ? Map.of()
        : Collections.unmodifiableMap(new LinkedHashMap<>(outputs));
    this.message = message;
  }

  public boolean success() {
    return success;
  }

  public boolean isSuccess() {
    return success;
  }

  public String externalId() {
    return externalId;
  }

  public String getExternalId() {
    return externalId;
  }

  public Map<String, Object> outputs() {
    return outputs;
  }

  public Map<String, Object> getOutputs() {
    return outputs;
  }

  public String message() {
    return message;
  }

  public String getMessage() {
    return message;
  }

  public static TaskExecutionResult succeeded() {
    return new TaskExecutionResult(true, null, Map.of(), null);
  }

  public static TaskExecutionResult succeeded(
      String externalId,
      Map<String, Object> outputs,
      String message) {
    return new TaskExecutionResult(true, externalId, outputs, message);
  }

  public static TaskExecutionResult failure(String message) {
    return new TaskExecutionResult(false, null, Map.of(), message);
  }
}

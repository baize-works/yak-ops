package io.yak.ops.spi.workflow;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;

/** Result returned by one physical task attempt. */
public final class WorkflowTaskResult {

  private final boolean success;
  private final String externalId;
  private final Map<String, Object> outputs;
  private final String message;

  public WorkflowTaskResult(
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

  public static WorkflowTaskResult succeeded() {
    return new WorkflowTaskResult(true, null, Map.of(), null);
  }

  public static WorkflowTaskResult succeeded(
      String externalId,
      Map<String, Object> outputs,
      String message) {
    return new WorkflowTaskResult(true, externalId, outputs, message);
  }

  public static WorkflowTaskResult failure(String message) {
    return new WorkflowTaskResult(false, null, Map.of(), message);
  }
}

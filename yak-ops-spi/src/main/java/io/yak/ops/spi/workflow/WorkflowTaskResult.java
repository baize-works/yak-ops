package io.yak.ops.spi.workflow;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;

/** Result returned by one physical task attempt. */
public record WorkflowTaskResult(
    boolean success,
    String externalId,
    Map<String, Object> outputs,
    String message) {

  public WorkflowTaskResult {
    outputs = outputs == null || outputs.isEmpty()
        ? Map.of()
        : Collections.unmodifiableMap(new LinkedHashMap<>(outputs));
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

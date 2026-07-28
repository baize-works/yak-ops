package io.yak.ops.core.workflow;

import io.yak.ops.spi.workflow.WorkflowTaskExecutor;
import java.util.Collection;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

/** Immutable task executor registry used by the workflow compiler and runtime. */
public final class WorkflowTaskExecutorRegistry {

  private final Map<String, WorkflowTaskExecutor> executors;

  public WorkflowTaskExecutorRegistry(Collection<WorkflowTaskExecutor> taskExecutors) {
    Map<String, WorkflowTaskExecutor> registered = new LinkedHashMap<>();
    if (taskExecutors != null) {
      for (WorkflowTaskExecutor executor : taskExecutors) {
        Objects.requireNonNull(executor, "taskExecutor");
        String type = normalize(executor.type());
        WorkflowTaskExecutor previous = registered.putIfAbsent(type, executor);
        if (previous != null) {
          throw new IllegalStateException("Duplicate workflow task executor type: " + type);
        }
      }
    }
    this.executors = Collections.unmodifiableMap(registered);
  }

  public WorkflowTaskExecutor require(String taskType) {
    String type = normalize(taskType);
    WorkflowTaskExecutor executor = executors.get(type);
    if (executor == null) {
      throw new IllegalArgumentException(
          "No workflow task executor registered for type: " + type);
    }
    return executor;
  }

  public boolean contains(String taskType) {
    return executors.containsKey(normalize(taskType));
  }

  public Set<String> types() {
    return executors.keySet();
  }

  private static String normalize(String taskType) {
    if (taskType == null || taskType.isBlank()) {
      throw new IllegalArgumentException("Workflow task type must not be blank");
    }
    return taskType.trim().toUpperCase(Locale.ROOT);
  }
}

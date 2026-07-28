package io.yak.ops.spi.workflow;

import java.util.Map;

/** Stable extension contract implemented by workflow task plugins. */
public interface WorkflowTaskExecutor {

  /** Stable uppercase task type, for example {@code SHELL}, {@code HTTP} or {@code SEATUNNEL_JOB}. */
  String type();

  /** Validates task configuration when a workflow version is published. */
  default void validate(Map<String, Object> configuration) {
  }

  /** Executes one physical attempt. Implementations should honor the cancellation token. */
  WorkflowTaskResult execute(WorkflowTaskContext context) throws Exception;

  /** Best-effort external cancellation hook. */
  default void cancel(WorkflowTaskContext context) throws Exception {
  }
}

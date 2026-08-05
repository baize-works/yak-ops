package io.yak.ops.plugin.task.api;

import java.util.Map;

/** Stable execution contract implemented by a task plugin. */
public interface TaskExecutor {

  String type();

  default void validate(Map<String, Object> configuration) {
  }

  TaskExecutionResult execute(TaskExecutionContext context) throws Exception;

  default void cancel(TaskExecutionContext context) throws Exception {
  }
}

package io.yak.ops.spi.workflow;

import java.util.Map;

/**
 * Factory boundary for one workflow task plugin.
 *
 * <p>The factory owns plugin identity, static validation and creation of an attempt-scoped executor.
 */
public interface WorkflowTaskPluginFactory {

  WorkflowTaskPluginDescriptor descriptor();

  default String type() {
    return descriptor().getType();
  }

  /** Validates configuration while compiling or publishing a workflow definition. */
  default void validate(Map<String, Object> configuration) {
    create().validate(configuration);
  }

  /** Creates a new executor for one physical task attempt. */
  WorkflowTaskExecutor create();
}

package io.yak.ops.spi.workflow;

import java.util.LinkedHashMap;
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

  /** Validates configuration while compiling or saving a workflow definition. */
  default void validate(Map<String, Object> configuration) {
    create().validate(configuration);
  }

  /**
   * Converts the JSON task parameters into the canonical plugin representation.
   *
   * <p>Concrete plugins may bind the map to a typed parameter object before returning a normalized
   * map. The default implementation keeps legacy plugins source-compatible.
   */
  default Map<String, Object> normalize(Map<String, Object> configuration) {
    validate(configuration);
    return configuration == null
        ? new LinkedHashMap<>()
        : new LinkedHashMap<>(configuration);
  }

  /** Creates a new executor for one physical task attempt. */
  WorkflowTaskExecutor create();
}

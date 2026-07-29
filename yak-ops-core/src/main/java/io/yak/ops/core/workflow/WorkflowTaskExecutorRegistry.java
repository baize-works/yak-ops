package io.yak.ops.core.workflow;

import io.yak.ops.spi.workflow.WorkflowTaskExecutor;
import io.yak.ops.spi.workflow.WorkflowTaskPluginDescriptor;
import io.yak.ops.spi.workflow.WorkflowTaskPluginFactory;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.ServiceLoader;
import java.util.Set;

/** Immutable task-plugin registry used by the workflow compiler and runtime. */
public final class WorkflowTaskExecutorRegistry {

  private final Map<String, WorkflowTaskPluginFactory> factories;

  public WorkflowTaskExecutorRegistry(Collection<WorkflowTaskExecutor> builtInExecutors) {
    Map<String, WorkflowTaskPluginFactory> registered = new LinkedHashMap<>();
    registerLegacyExecutors(registered, builtInExecutors);

    ClassLoader contextClassLoader = Thread.currentThread().getContextClassLoader();
    ClassLoader pluginClassLoader = contextClassLoader == null
        ? WorkflowTaskPluginFactory.class.getClassLoader()
        : contextClassLoader;

    ServiceLoader.load(WorkflowTaskPluginFactory.class, pluginClassLoader)
        .forEach(factory -> registerFactory(registered, factory));

    // Keep compatibility with task plugins published before the factory contract was introduced.
    ServiceLoader.load(WorkflowTaskExecutor.class, pluginClassLoader)
        .forEach(executor -> registerLegacyExecutor(registered, executor));

    this.factories = Collections.unmodifiableMap(registered);
  }

  /** Creates one executor instance for a physical task attempt. */
  public WorkflowTaskExecutor require(String taskType) {
    String type = normalize(taskType);
    WorkflowTaskExecutor executor = requireFactory(type).create();
    if (executor == null) {
      throw new IllegalStateException("Workflow task plugin returned a null executor: " + type);
    }
    String executorType = normalize(executor.type());
    if (!type.equals(executorType)) {
      throw new IllegalStateException(
          "Workflow task plugin type mismatch: factory=" + type + ", executor=" + executorType);
    }
    return executor;
  }

  public WorkflowTaskPluginFactory requireFactory(String taskType) {
    String type = normalize(taskType);
    WorkflowTaskPluginFactory factory = factories.get(type);
    if (factory == null) {
      throw new IllegalArgumentException(
          "No workflow task plugin registered for type: " + type);
    }
    return factory;
  }

  public void validate(String taskType, Map<String, Object> configuration) {
    normalizeConfiguration(taskType, configuration);
  }

  /** Binds and normalizes one plugin's JSON task parameters. */
  public Map<String, Object> normalizeConfiguration(
      String taskType,
      Map<String, Object> configuration) {
    return requireFactory(taskType).normalize(configuration);
  }

  public WorkflowTaskPluginDescriptor descriptor(String taskType) {
    return requireFactory(taskType).descriptor();
  }

  public List<WorkflowTaskPluginDescriptor> descriptors() {
    List<WorkflowTaskPluginDescriptor> result = new ArrayList<>(factories.size());
    factories.values().forEach(factory -> result.add(factory.descriptor()));
    return Collections.unmodifiableList(result);
  }

  public boolean contains(String taskType) {
    return factories.containsKey(normalize(taskType));
  }

  public Set<String> types() {
    return factories.keySet();
  }

  private static void registerLegacyExecutors(
      Map<String, WorkflowTaskPluginFactory> registered,
      Collection<WorkflowTaskExecutor> executors) {
    if (executors == null) {
      return;
    }
    for (WorkflowTaskExecutor executor : executors) {
      registerLegacyExecutor(registered, executor);
    }
  }

  private static void registerLegacyExecutor(
      Map<String, WorkflowTaskPluginFactory> registered,
      WorkflowTaskExecutor executor) {
    Objects.requireNonNull(executor, "taskExecutor");
    String type = normalize(executor.type());
    registerFactory(registered, new LegacyWorkflowTaskPluginFactory(type, executor));
  }

  private static void registerFactory(
      Map<String, WorkflowTaskPluginFactory> registered,
      WorkflowTaskPluginFactory factory) {
    Objects.requireNonNull(factory, "taskPluginFactory");
    Objects.requireNonNull(factory.descriptor(), "taskPluginDescriptor");
    String type = normalize(factory.type());
    WorkflowTaskPluginFactory previous = registered.putIfAbsent(type, factory);
    if (previous != null) {
      throw new IllegalStateException("Duplicate workflow task plugin type: " + type);
    }
  }

  private static String normalize(String taskType) {
    if (taskType == null || taskType.isBlank()) {
      throw new IllegalArgumentException("Workflow task type must not be blank");
    }
    return taskType.trim().toUpperCase(Locale.ROOT);
  }

  private static final class LegacyWorkflowTaskPluginFactory
      implements WorkflowTaskPluginFactory {

    private final WorkflowTaskPluginDescriptor descriptor;
    private final WorkflowTaskExecutor executor;

    private LegacyWorkflowTaskPluginFactory(String type, WorkflowTaskExecutor executor) {
      this.descriptor = new WorkflowTaskPluginDescriptor(
          type,
          type,
          "Legacy or built-in workflow task executor",
          "LEGACY",
          "1.0.0",
          false,
          true,
          Map.of());
      this.executor = executor;
    }

    @Override
    public WorkflowTaskPluginDescriptor descriptor() {
      return descriptor;
    }

    @Override
    public void validate(Map<String, Object> configuration) {
      executor.validate(configuration);
    }

    @Override
    public WorkflowTaskExecutor create() {
      return executor;
    }
  }
}

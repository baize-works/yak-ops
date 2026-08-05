package io.yak.ops.plugin.task.api;

import io.yak.ops.plugin.task.api.TaskPluginFactory.CompiledDefinition;
import io.yak.ops.plugin.task.api.TaskPluginFactory.Descriptor;
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

/** ServiceLoader-backed catalog for task authoring and execution plugins. */
public final class TaskPluginCatalog {

  private final Map<String, TaskPluginFactory> factories;

  public TaskPluginCatalog() {
    this(resolveClassLoader());
  }

  public TaskPluginCatalog(ClassLoader classLoader) {
    this(load(classLoader));
  }

  TaskPluginCatalog(Collection<TaskPluginFactory> taskFactories) {
    Map<String, TaskPluginFactory> registered = new LinkedHashMap<>();
    if (taskFactories != null) {
      taskFactories.forEach(factory -> register(registered, factory));
    }
    this.factories = Collections.unmodifiableMap(registered);
  }

  public TaskPluginFactory require(String taskType) {
    String normalized = normalize(taskType);
    TaskPluginFactory factory = factories.get(normalized);
    if (factory == null) {
      throw new IllegalArgumentException("No task plugin registered for type: " + normalized);
    }
    return factory;
  }

  public Descriptor descriptor(String taskType) {
    return require(taskType).descriptor();
  }

  public List<Descriptor> descriptors() {
    List<Descriptor> result = new ArrayList<>(factories.size());
    factories.values().forEach(factory -> result.add(factory.descriptor()));
    return Collections.unmodifiableList(result);
  }

  public Map<String, Object> defaultDefinition(String taskType) {
    return require(taskType).defaultDefinition();
  }

  public Map<String, Object> normalizeDefinition(
      String taskType,
      Map<String, Object> definition) {
    return require(taskType).normalizeDefinition(definition);
  }

  public void validateDefinition(String taskType, Map<String, Object> definition) {
    require(taskType).validateDefinition(definition);
  }

  public CompiledDefinition compile(String taskType, Map<String, Object> definition) {
    return require(taskType).compile(definition);
  }

  public TaskExecutor createExecutor(String taskType) {
    return require(taskType).createExecutor();
  }

  public boolean contains(String taskType) {
    return factories.containsKey(normalize(taskType));
  }

  public Set<String> types() {
    return factories.keySet();
  }

  private static void register(
      Map<String, TaskPluginFactory> registered,
      TaskPluginFactory factory) {
    Objects.requireNonNull(factory, "taskPluginFactory");
    Descriptor descriptor = Objects.requireNonNull(
        factory.descriptor(),
        "taskPluginDescriptor");
    String taskType = normalize(descriptor.taskType());
    if (registered.putIfAbsent(taskType, factory) != null) {
      throw new IllegalStateException("Duplicate task plugin type: " + taskType);
    }
  }

  private static ClassLoader resolveClassLoader() {
    ClassLoader current = Thread.currentThread().getContextClassLoader();
    return current == null ? TaskPluginCatalog.class.getClassLoader() : current;
  }

  private static List<TaskPluginFactory> load(ClassLoader classLoader) {
    List<TaskPluginFactory> values = new ArrayList<>();
    ServiceLoader.load(TaskPluginFactory.class, classLoader).forEach(values::add);
    return values;
  }

  private static String normalize(String taskType) {
    if (taskType == null || taskType.isBlank()) {
      throw new IllegalArgumentException("Task type must not be blank");
    }
    String normalized = taskType.trim().toUpperCase(Locale.ROOT);
    return TaskPluginType.SQL.equals(normalized) ? TaskPluginType.MYSQL : normalized;
  }
}

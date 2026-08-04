package io.yak.ops.plugin.task.api;

import io.yak.ops.plugin.task.api.TaskPluginFactory.Capabilities;
import io.yak.ops.plugin.task.api.TaskPluginFactory.CompiledDefinition;
import io.yak.ops.plugin.task.api.TaskPluginFactory.Descriptor;
import io.yak.ops.plugin.task.api.TaskPluginFactory.ResultKind;
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

/** Runtime catalog for generic task plugins. */
public final class TaskPluginCatalog {

  private final Map<String, TaskPluginFactory> factories;

  public TaskPluginCatalog() {
    this(resolveClassLoader());
  }

  public TaskPluginCatalog(ClassLoader classLoader) {
    this(load(TaskPluginFactory.class, classLoader), load(WorkflowTaskPluginFactory.class, classLoader));
  }

  TaskPluginCatalog(
      Collection<TaskPluginFactory> taskFactories,
      Collection<WorkflowTaskPluginFactory> workflowFactories) {
    Map<String, TaskPluginFactory> registered = new LinkedHashMap<>();
    if (taskFactories != null) taskFactories.forEach(factory -> register(registered, factory));
    if (workflowFactories != null) {
      workflowFactories.forEach(factory -> registered.putIfAbsent(
          normalize(factory.type()), new WorkflowTaskPluginAdapter(factory)));
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

  public Descriptor descriptor(String taskType) { return require(taskType).descriptor(); }
  public List<Descriptor> descriptors() {
    List<Descriptor> result = new ArrayList<>(factories.size());
    factories.values().forEach(factory -> result.add(factory.descriptor()));
    return Collections.unmodifiableList(result);
  }
  public Map<String, Object> defaultDefinition(String taskType) { return require(taskType).defaultDefinition(); }
  public Map<String, Object> normalizeDefinition(String taskType, Map<String, Object> definition) {
    return require(taskType).normalizeDefinition(definition);
  }
  public void validateDefinition(String taskType, Map<String, Object> definition) {
    require(taskType).validateDefinition(definition);
  }
  public CompiledDefinition compile(String taskType, Map<String, Object> definition) {
    return require(taskType).compile(definition);
  }
  public boolean contains(String taskType) { return factories.containsKey(normalize(taskType)); }
  public Set<String> types() { return factories.keySet(); }

  private static void register(Map<String, TaskPluginFactory> registered, TaskPluginFactory factory) {
    Objects.requireNonNull(factory, "taskPluginFactory");
    Descriptor descriptor = Objects.requireNonNull(factory.descriptor(), "taskPluginDescriptor");
    String taskType = normalize(descriptor.taskType());
    if (registered.putIfAbsent(taskType, factory) != null) {
      throw new IllegalStateException("Duplicate task plugin type: " + taskType);
    }
  }

  private static ClassLoader resolveClassLoader() {
    ClassLoader current = Thread.currentThread().getContextClassLoader();
    return current == null ? TaskPluginCatalog.class.getClassLoader() : current;
  }

  private static <T> List<T> load(Class<T> type, ClassLoader classLoader) {
    List<T> values = new ArrayList<>();
    ServiceLoader.load(type, classLoader).forEach(values::add);
    return values;
  }

  private static String normalize(String taskType) {
    if (taskType == null || taskType.isBlank()) throw new IllegalArgumentException("Task type must not be blank");
    return taskType.trim().toUpperCase(Locale.ROOT);
  }

  private static final class WorkflowTaskPluginAdapter implements TaskPluginFactory {
    private final WorkflowTaskPluginFactory delegate;
    private final Descriptor descriptor;

    private WorkflowTaskPluginAdapter(WorkflowTaskPluginFactory delegate) {
      this.delegate = Objects.requireNonNull(delegate, "workflowTaskPluginFactory");
      WorkflowTaskPluginDescriptor source = delegate.descriptor();
      this.descriptor = new Descriptor(
          source.getType(), source.getName(), source.getDescription(), source.getCategory(),
          source.getVersion(), 1,
          Capabilities.runnable(source.isCancellable(), source.isOutputCapable()),
          resultKind(source.getType()), source.getConfigurationSchema(), Map.of(), Map.of(), Map.of());
    }

    @Override public Descriptor descriptor() { return descriptor; }

    @Override
    public Map<String, Object> defaultDefinition() {
      Map<String, Object> defaults = defaultsFromSchema(descriptor.authoringSchema());
      Map<String, Object> definition = new LinkedHashMap<>();
      definition.put("schemaVersion", descriptor.schemaVersion());
      definition.put("taskType", descriptor.taskType());
      definition.put("pluginVersion", descriptor.pluginVersion());
      definition.put("content", Map.of("kind", "form", "value", defaults));
      definition.put("config", defaults);
      definition.put("runtime", Map.of("common", Map.of(), "specific", Map.of()));
      definition.put("inputs", Map.of());
      definition.put("outputs", Map.of());
      return definition;
    }

    @Override
    public Map<String, Object> normalizeDefinition(Map<String, Object> definition) {
      Map<String, Object> envelope = TaskPluginFactory.super.normalizeDefinition(definition);
      envelope.put("config", delegate.normalize(extractPluginConfiguration(envelope)));
      return envelope;
    }

    @Override
    public void validateDefinition(Map<String, Object> definition) {
      delegate.validate(extractPluginConfiguration(TaskPluginFactory.super.normalizeDefinition(definition)));
    }

    @Override
    public CompiledDefinition compile(Map<String, Object> definition) {
      Map<String, Object> normalized = normalizeDefinition(definition);
      return new CompiledDefinition(normalized, Map.of(
          "taskType", descriptor.taskType(),
          "pluginVersion", descriptor.pluginVersion(),
          "configuration", normalized.get("config")), Map.of(), Map.of());
    }

    private Map<String, Object> extractPluginConfiguration(Map<String, Object> definition) {
      Map<String, Object> configuration = new LinkedHashMap<>();
      mergeMap(configuration, definition.get("config"));
      Object content = definition.get("content");
      if (content instanceof Map<?, ?> contentMap) {
        mergeMap(configuration, contentMap.get("value"));
        if ("SHELL".equals(descriptor.taskType())
            && "text".equals(contentMap.get("kind"))
            && contentMap.get("value") instanceof String text
            && !text.isBlank()) {
          configuration.put("command", text);
        }
      }
      if (definition.get("runtime") instanceof Map<?, ?> runtime) {
        mergeMap(configuration, runtime.get("specific"));
      }
      return configuration;
    }

    private static void mergeMap(Map<String, Object> target, Object source) {
      if (!(source instanceof Map<?, ?> map)) return;
      map.forEach((key, value) -> { if (key != null) target.put(String.valueOf(key), value); });
    }

    private static Map<String, Object> defaultsFromSchema(Map<String, Object> schema) {
      if (!(schema.get("fields") instanceof Map<?, ?> fields)) return Map.of();
      Map<String, Object> defaults = new LinkedHashMap<>();
      fields.forEach((key, value) -> {
        if (key != null && value instanceof Map<?, ?> field && field.containsKey("defaultValue")) {
          defaults.put(String.valueOf(key), field.get("defaultValue"));
        }
      });
      return defaults;
    }

    private static ResultKind resultKind(String taskType) {
      return switch (normalize(taskType)) {
        case "HTTP" -> ResultKind.JSON;
        case "SHELL", "PYTHON" -> ResultKind.TERMINAL;
        case "SQL", "FLINK_SQL" -> ResultKind.TABLE;
        case "NOTEBOOK" -> ResultKind.NOTEBOOK;
        case "DATA_INTEGRATION" -> ResultKind.PIPELINE;
        default -> ResultKind.TEXT;
      };
    }
  }
}

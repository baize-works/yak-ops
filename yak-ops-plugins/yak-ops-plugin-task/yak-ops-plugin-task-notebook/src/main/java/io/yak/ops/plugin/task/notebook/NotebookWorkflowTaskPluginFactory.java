package io.yak.ops.plugin.task.notebook;

import io.yak.ops.plugin.task.api.TaskConfiguration;
import io.yak.ops.plugin.task.api.TaskParameterResolver;
import io.yak.ops.plugin.task.api.TaskPluginType;
import io.yak.ops.spi.workflow.WorkflowTaskContext;
import io.yak.ops.spi.workflow.WorkflowTaskExecutor;
import io.yak.ops.spi.workflow.WorkflowTaskPluginDescriptor;
import io.yak.ops.spi.workflow.WorkflowTaskPluginFactory;
import io.yak.ops.spi.workflow.WorkflowTaskResult;
import java.io.BufferedReader;
import java.io.File;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;

/** Runtime factory for local notebook tasks. */
public final class NotebookWorkflowTaskPluginFactory implements WorkflowTaskPluginFactory {

  private static final WorkflowTaskPluginDescriptor DESCRIPTOR =
      new WorkflowTaskPluginDescriptor(
          TaskPluginType.NOTEBOOK,
          "Notebook",
          "顺序执行 Python、Shell 和 Markdown Cell，并返回每个 Cell 的状态与输出。",
          "DATA_ANALYSIS",
          "1.0.0",
          true,
          true,
          NotebookTaskSupport.configurationSchema());

  @Override
  public WorkflowTaskPluginDescriptor descriptor() {
    return DESCRIPTOR;
  }

  @Override
  public void validate(Map<String, Object> configuration) {
    NotebookTaskSupport.normalize(configuration);
  }

  @Override
  public Map<String, Object> normalize(Map<String, Object> configuration) {
    return NotebookTaskSupport.normalize(configuration);
  }

  @Override
  public WorkflowTaskExecutor create() {
    return new NotebookWorkflowTaskExecutor();
  }
}

final class NotebookTaskSupport {

  private NotebookTaskSupport() {
  }

  static Map<String, Object> normalize(Map<String, Object> configuration) {
    Map<String, Object> result = new LinkedHashMap<>();
    result.put("cells", cells(configuration == null ? null : configuration.get("cells")));
    result.put(
        "pythonExecutable",
        TaskConfiguration.string(configuration, "pythonExecutable", "python3"));
    result.put(
        "workingDirectory",
        TaskConfiguration.string(configuration, "workingDirectory", ""));
    result.put(
        "environment",
        TaskConfiguration.string(configuration, "environment", ""));
    result.put(
        "continueOnError",
        bool(configuration == null ? null : configuration.get("continueOnError"), false));
    result.put(
        "cellTimeoutSeconds",
        TaskConfiguration.positiveInteger(configuration, "cellTimeoutSeconds", 300));
    result.put(
        "maxOutputLines",
        TaskConfiguration.positiveInteger(configuration, "maxOutputLines", 5000));
    return result;
  }

  static Map<String, Object> runtimeSchema() {
    return Map.of(
        "fields",
        List.of(
            field("pythonExecutable", "string", false, "Python 可执行文件", "python3"),
            field("workingDirectory", "string", false, "工作目录", ""),
            field("environment", "textarea", false, "环境变量，每行 KEY=VALUE", ""),
            field("continueOnError", "boolean", false, "Cell 失败后继续执行", false),
            field("cellTimeoutSeconds", "integer", false, "单 Cell 超时秒数", 300),
            field("maxOutputLines", "integer", false, "单 Cell 最大输出行数", 5000)));
  }

  static Map<String, Object> configurationSchema() {
    Map<String, Object> fields = new LinkedHashMap<>();
    fields.put("cells", field("cells", "notebook-cells", true, "Notebook Cell 列表", null));
    for (Object item : (List<?>) runtimeSchema().get("fields")) {
      Map<?, ?> field = (Map<?, ?>) item;
      fields.put(String.valueOf(field.get("key")), field);
    }
    return Map.of("fields", fields);
  }

  static Map<String, String> environment(String source) {
    Map<String, String> result = new LinkedHashMap<>();
    if (source == null || source.isBlank()) {
      return result;
    }
    for (String line : source.split("\\R")) {
      String value = line.trim();
      if (value.isEmpty() || value.startsWith("#")) {
        continue;
      }
      int separator = value.indexOf('=');
      if (separator <= 0) {
        throw new IllegalArgumentException("Notebook 环境变量必须为 KEY=VALUE：" + value);
      }
      result.put(value.substring(0, separator).trim(), value.substring(separator + 1));
    }
    return result;
  }

  @SuppressWarnings("unchecked")
  static List<Map<String, Object>> cells(Object source) {
    if (!(source instanceof List<?> list) || list.isEmpty()) {
      throw new IllegalArgumentException("Notebook 至少需要一个 Cell");
    }
    List<Map<String, Object>> result = new ArrayList<>();
    int index = 0;
    for (Object item : list) {
      if (!(item instanceof Map<?, ?> map)) {
        throw new IllegalArgumentException("Notebook Cell 必须为对象");
      }
      String id = value(map.get("id"), "cell-" + (++index));
      String language = value(map.get("language"), "python").toLowerCase(Locale.ROOT);
      if (!List.of("python", "shell", "markdown").contains(language)) {
        throw new IllegalArgumentException("Notebook 暂不支持 Cell 语言：" + language);
      }
      Map<String, Object> cell = new LinkedHashMap<>();
      cell.put("id", id);
      cell.put("language", language);
      cell.put("source", value(map.get("source"), ""));
      result.add(Collections.unmodifiableMap(cell));
    }
    return List.copyOf(result);
  }

  private static String value(Object source, String fallback) {
    return source == null ? fallback : String.valueOf(source);
  }

  private static boolean bool(Object value, boolean fallback) {
    return value == null ? fallback : Boolean.parseBoolean(String.valueOf(value));
  }

  private static Map<String, Object> field(
      String key,
      String type,
      boolean required,
      String description,
      Object defaultValue) {
    Map<String, Object> field = new LinkedHashMap<>();
    field.put("key", key);
    field.put("type", type);
    field.put("required", required);
    field.put("description", description);
    if (defaultValue != null) {
      field.put("defaultValue", defaultValue);
    }
    return field;
  }
}

final class NotebookWorkflowTaskExecutor implements WorkflowTaskExecutor {

  private final Map<Long, Process> running = new ConcurrentHashMap<>();

  @Override
  public String type() {
    return TaskPluginType.NOTEBOOK;
  }

  @Override
  public void validate(Map<String, Object> configuration) {
    NotebookTaskSupport.normalize(configuration);
  }

  @Override
  public WorkflowTaskResult execute(WorkflowTaskContext context) throws Exception {
    Map<String, Object> configuration = NotebookTaskSupport.normalize(
        TaskParameterResolver.resolveConfiguration(
            context.configuration(),
            context.parameters()));
    @SuppressWarnings("unchecked")
    List<Map<String, Object>> cells =
        (List<Map<String, Object>>) configuration.get("cells");
    List<Map<String, Object>> results = new ArrayList<>();
    boolean failed = false;

    for (int index = 0; index < cells.size(); index++) {
      context.cancellationToken().throwIfCancellationRequested();
      Map<String, Object> cell = cells.get(index);
      String id = String.valueOf(cell.get("id"));
      String language = String.valueOf(cell.get("language"));
      String source = String.valueOf(cell.get("source"));
      context.logger().log("Running notebook cell " + id + " (" + language + ")");
      Map<String, Object> result = executeCell(
          context,
          configuration,
          index,
          id,
          language,
          source);
      results.add(result);
      if ("FAILED".equals(result.get("status"))) {
        failed = true;
        if (!Boolean.TRUE.equals(configuration.get("continueOnError"))) {
          break;
        }
      }
    }

    Map<String, Object> outputs = Map.of("cells", results);
    if (failed) {
      return new WorkflowTaskResult(
          false,
          null,
          outputs,
          "Notebook 存在执行失败的 Cell");
    }
    return WorkflowTaskResult.succeeded(
        null,
        outputs,
        "Notebook 执行完成");
  }

  @Override
  public void cancel(WorkflowTaskContext context) {
    Process process = running.get(context.attemptId());
    if (process != null) {
      terminate(process);
    }
  }

  private Map<String, Object> executeCell(
      WorkflowTaskContext context,
      Map<String, Object> configuration,
      int index,
      String id,
      String language,
      String source) throws Exception {
    long started = System.nanoTime();
    if ("markdown".equals(language)) {
      return cellResult(
          id,
          "Markdown " + (index + 1),
          "SUCCESS",
          elapsed(started),
          source);
    }

    Path file = null;
    List<String> command;
    if ("python".equals(language)) {
      file = Files.createTempFile("yak-notebook-", ".py");
      Files.writeString(file, source, StandardCharsets.UTF_8);
      command = List.of(
          String.valueOf(configuration.get("pythonExecutable")),
          file.toString());
    } else {
      boolean windows = System.getProperty("os.name", "")
          .toLowerCase(Locale.ROOT)
          .contains("win");
      command = windows
          ? List.of("cmd.exe", "/c", source)
          : List.of("/bin/sh", "-c", source);
    }

    ProcessBuilder builder = new ProcessBuilder(command).redirectErrorStream(true);
    configureWorkingDirectory(builder, String.valueOf(configuration.get("workingDirectory")));
    builder.environment().putAll(
        NotebookTaskSupport.environment(String.valueOf(configuration.get("environment"))));
    List<String> output = Collections.synchronizedList(new ArrayList<>());
    boolean[] truncated = {false};
    Process process = builder.start();
    running.put(context.attemptId(), process);
    Thread reader = readOutput(
        process,
        output,
        ((Number) configuration.get("maxOutputLines")).intValue(),
        truncated,
        context,
        id);

    try {
      int timeout = ((Number) configuration.get("cellTimeoutSeconds")).intValue();
      long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(timeout);
      while (process.isAlive()) {
        context.cancellationToken().throwIfCancellationRequested();
        if (System.nanoTime() >= deadline) {
          terminate(process);
          return cellResult(
              id,
              label(language, index),
              "FAILED",
              elapsed(started),
              "Cell 执行超时（" + timeout + " 秒）");
        }
        Thread.sleep(100L);
      }
      reader.join(2000L);
      int exitCode = process.exitValue();
      String text = String.join(System.lineSeparator(), output);
      if (truncated[0]) {
        text += System.lineSeparator() + "... 输出已截断";
      }
      return cellResult(
          id,
          label(language, index),
          exitCode == 0 ? "SUCCESS" : "FAILED",
          elapsed(started),
          text);
    } finally {
      running.remove(context.attemptId());
      if (file != null) {
        Files.deleteIfExists(file);
      }
      if (process.isAlive()) {
        terminate(process);
      }
    }
  }

  private static Thread readOutput(
      Process process,
      List<String> output,
      int maxLines,
      boolean[] truncated,
      WorkflowTaskContext context,
      String cellId) {
    return Thread.ofVirtual()
        .name("yak-notebook-cell-" + cellId)
        .start(() -> {
          try (BufferedReader reader = new BufferedReader(
              new InputStreamReader(process.getInputStream(), StandardCharsets.UTF_8))) {
            String line;
            while ((line = reader.readLine()) != null) {
              if (output.size() < maxLines) {
                output.add(line);
              } else {
                truncated[0] = true;
              }
              context.logger().log("[" + cellId + "] " + line);
            }
          } catch (Exception exception) {
            context.logger().log("读取 Notebook Cell 输出失败：" + exception.getMessage());
          }
        });
  }

  private static Map<String, Object> cellResult(
      String id,
      String label,
      String status,
      long durationMs,
      String output) {
    Map<String, Object> result = new LinkedHashMap<>();
    result.put("id", id);
    result.put("label", label);
    result.put("status", status);
    result.put("durationMs", durationMs);
    result.put("output", output);
    return result;
  }

  private static String label(String language, int index) {
    return Character.toUpperCase(language.charAt(0))
        + language.substring(1)
        + " " + (index + 1);
  }

  private static long elapsed(long started) {
    return Duration.ofNanos(System.nanoTime() - started).toMillis();
  }

  private static void configureWorkingDirectory(
      ProcessBuilder builder,
      String workingDirectory) {
    if (workingDirectory == null || workingDirectory.isBlank()) {
      return;
    }
    File directory = new File(workingDirectory);
    if (!directory.isDirectory()) {
      throw new IllegalArgumentException("Notebook 工作目录不存在或不是目录：" + workingDirectory);
    }
    builder.directory(directory);
  }

  private static void terminate(Process process) {
    process.toHandle().descendants().forEach(ProcessHandle::destroy);
    process.destroy();
    try {
      if (!process.waitFor(2, TimeUnit.SECONDS)) {
        process.toHandle().descendants().forEach(ProcessHandle::destroyForcibly);
        process.destroyForcibly();
      }
    } catch (InterruptedException interrupted) {
      Thread.currentThread().interrupt();
      process.destroyForcibly();
    }
  }
}

package io.yak.ops.plugin.task.python;

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
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/** Runtime factory for local Python tasks. */
public final class PythonWorkflowTaskPluginFactory implements WorkflowTaskPluginFactory {

  private static final WorkflowTaskPluginDescriptor DESCRIPTOR =
      new WorkflowTaskPluginDescriptor(
          TaskPluginType.PYTHON,
          "Python",
          "在受控本地进程中执行 Python 脚本，并返回标准输出和错误输出。",
          "DATA_DEVELOPMENT",
          "1.0.0",
          true,
          true,
          PythonTaskSupport.configurationSchema());

  @Override
  public WorkflowTaskPluginDescriptor descriptor() {
    return DESCRIPTOR;
  }

  @Override
  public void validate(Map<String, Object> configuration) {
    PythonTaskSupport.normalize(configuration);
  }

  @Override
  public Map<String, Object> normalize(Map<String, Object> configuration) {
    return PythonTaskSupport.normalize(configuration);
  }

  @Override
  public WorkflowTaskExecutor create() {
    return new PythonWorkflowTaskExecutor();
  }
}

final class PythonTaskSupport {

  private PythonTaskSupport() {
  }

  static Map<String, Object> normalize(Map<String, Object> configuration) {
    Map<String, Object> result = new LinkedHashMap<>();
    result.put("script", TaskConfiguration.requiredString(configuration, "script"));
    result.put(
        "pythonExecutable",
        TaskConfiguration.string(configuration, "pythonExecutable", "python3"));
    result.put(
        "arguments",
        TaskConfiguration.string(configuration, "arguments", ""));
    result.put(
        "workingDirectory",
        TaskConfiguration.string(configuration, "workingDirectory", ""));
    result.put(
        "environment",
        TaskConfiguration.string(configuration, "environment", ""));
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
            field("arguments", "string", false, "命令行参数", ""),
            field("workingDirectory", "string", false, "工作目录", ""),
            field("environment", "textarea", false, "环境变量，每行 KEY=VALUE", ""),
            field("maxOutputLines", "integer", false, "最大保存输出行数", 5000)));
  }

  static Map<String, Object> configurationSchema() {
    Map<String, Object> fields = new LinkedHashMap<>();
    fields.put("script", field("script", "string", true, "Python 脚本", null));
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
        throw new IllegalArgumentException("Python 环境变量必须为 KEY=VALUE：" + value);
      }
      result.put(value.substring(0, separator).trim(), value.substring(separator + 1));
    }
    return result;
  }

  static List<String> arguments(String source) {
    if (source == null || source.isBlank()) {
      return List.of();
    }
    List<String> result = new ArrayList<>();
    StringBuilder current = new StringBuilder();
    char quote = 0;
    boolean escaping = false;
    for (int index = 0; index < source.length(); index++) {
      char value = source.charAt(index);
      if (escaping) {
        current.append(value);
        escaping = false;
      } else if (value == '\\') {
        escaping = true;
      } else if (quote != 0) {
        if (value == quote) {
          quote = 0;
        } else {
          current.append(value);
        }
      } else if (value == '\'' || value == '"') {
        quote = value;
      } else if (Character.isWhitespace(value)) {
        if (!current.isEmpty()) {
          result.add(current.toString());
          current.setLength(0);
        }
      } else {
        current.append(value);
      }
    }
    if (escaping) {
      current.append('\\');
    }
    if (quote != 0) {
      throw new IllegalArgumentException("Python 运行参数引号未闭合");
    }
    if (!current.isEmpty()) {
      result.add(current.toString());
    }
    return result;
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

final class PythonWorkflowTaskExecutor implements WorkflowTaskExecutor {

  private final Map<Long, Process> running = new ConcurrentHashMap<>();

  @Override
  public String type() {
    return TaskPluginType.PYTHON;
  }

  @Override
  public void validate(Map<String, Object> configuration) {
    PythonTaskSupport.normalize(configuration);
  }

  @Override
  public WorkflowTaskResult execute(WorkflowTaskContext context) throws Exception {
    Map<String, Object> configuration = PythonTaskSupport.normalize(
        TaskParameterResolver.resolveConfiguration(
            context.configuration(),
            context.parameters()));
    Path scriptFile = Files.createTempFile("yak-ops-python-", ".py");
    Files.writeString(
        scriptFile,
        String.valueOf(configuration.get("script")),
        StandardCharsets.UTF_8);

    List<String> command = new ArrayList<>();
    command.add(String.valueOf(configuration.get("pythonExecutable")));
    command.add(scriptFile.toString());
    command.addAll(PythonTaskSupport.arguments(String.valueOf(configuration.get("arguments"))));

    ProcessBuilder builder = new ProcessBuilder(command);
    configureWorkingDirectory(builder, String.valueOf(configuration.get("workingDirectory")));
    builder.environment().putAll(
        PythonTaskSupport.environment(String.valueOf(configuration.get("environment"))));

    int maxOutputLines = ((Number) configuration.get("maxOutputLines")).intValue();
    List<String> stdout = Collections.synchronizedList(new ArrayList<>());
    List<String> stderr = Collections.synchronizedList(new ArrayList<>());
    boolean[] truncated = {false};
    context.logger().log("Starting Python: " + String.join(" ", command));
    Process process = builder.start();
    running.put(context.attemptId(), process);
    Thread stdoutReader = reader(
        process.getInputStream(),
        stdout,
        maxOutputLines,
        truncated,
        context,
        false);
    Thread stderrReader = reader(
        process.getErrorStream(),
        stderr,
        maxOutputLines,
        truncated,
        context,
        true);

    try {
      while (process.isAlive()) {
        context.cancellationToken().throwIfCancellationRequested();
        Thread.sleep(100L);
      }
      stdoutReader.join(2000L);
      stderrReader.join(2000L);
      int exitCode = process.exitValue();
      Map<String, Object> outputs = new LinkedHashMap<>();
      outputs.put("exitCode", exitCode);
      outputs.put("stdout", List.copyOf(stdout));
      outputs.put("stderr", List.copyOf(stderr));
      outputs.put("truncated", truncated[0]);
      context.logger().log("Python exited with code " + exitCode);
      if (exitCode == 0) {
        return WorkflowTaskResult.succeeded(
            Long.toString(process.pid()),
            outputs,
            "Python 执行完成");
      }
      return new WorkflowTaskResult(
          false,
          Long.toString(process.pid()),
          outputs,
          "Python 进程退出码为 " + exitCode);
    } finally {
      running.remove(context.attemptId());
      Files.deleteIfExists(scriptFile);
      if (process.isAlive()) {
        terminate(process);
      }
    }
  }

  @Override
  public void cancel(WorkflowTaskContext context) {
    Process process = running.get(context.attemptId());
    if (process != null) {
      terminate(process);
    }
  }

  private static Thread reader(
      java.io.InputStream input,
      List<String> target,
      int maxLines,
      boolean[] truncated,
      WorkflowTaskContext context,
      boolean error) {
    return Thread.ofVirtual()
        .name("yak-python-output-" + context.attemptId())
        .start(() -> {
          try (BufferedReader reader = new BufferedReader(
              new InputStreamReader(input, StandardCharsets.UTF_8))) {
            String line;
            while ((line = reader.readLine()) != null) {
              if (target.size() < maxLines) {
                target.add(line);
              } else {
                truncated[0] = true;
              }
              context.logger().log((error ? "[stderr] " : "") + line);
            }
          } catch (Exception exception) {
            context.logger().log("读取 Python 输出失败：" + exception.getMessage());
          }
        });
  }

  private static void configureWorkingDirectory(
      ProcessBuilder builder,
      String workingDirectory) {
    if (workingDirectory == null || workingDirectory.isBlank()) {
      return;
    }
    File directory = new File(workingDirectory);
    if (!directory.isDirectory()) {
      throw new IllegalArgumentException("Python 工作目录不存在或不是目录：" + workingDirectory);
    }
    builder.directory(directory);
  }

  private static void terminate(Process process) {
    process.toHandle().descendants().forEach(ProcessHandle::destroy);
    process.destroy();
    try {
      if (!process.waitFor(2, java.util.concurrent.TimeUnit.SECONDS)) {
        process.toHandle().descendants().forEach(ProcessHandle::destroyForcibly);
        process.destroyForcibly();
      }
    } catch (InterruptedException interrupted) {
      Thread.currentThread().interrupt();
      process.destroyForcibly();
    }
  }
}

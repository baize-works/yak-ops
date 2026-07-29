package io.yak.ops.plugin.task.shell;

import io.yak.ops.plugin.task.api.TaskConfiguration;
import io.yak.ops.plugin.task.api.TaskParameterResolver;
import io.yak.ops.plugin.task.api.TaskPluginType;
import io.yak.ops.spi.workflow.WorkflowTaskContext;
import io.yak.ops.spi.workflow.WorkflowTaskExecutor;
import io.yak.ops.spi.workflow.WorkflowTaskResult;
import java.io.BufferedReader;
import java.io.File;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;

/** 在 Yak Ops 所在主机执行管理员配置的本地 Shell 任务。 */
public final class ShellWorkflowTaskExecutor implements WorkflowTaskExecutor {

  private final Map<Long, Process> runningProcesses = new ConcurrentHashMap<>();

  @Override
  public String type() {
    return TaskPluginType.SHELL;
  }

  @Override
  public void validate(Map<String, Object> configuration) {
    String command = TaskConfiguration.string(configuration, "command", null);
    List<String> args = TaskConfiguration.stringList(configuration, "args");
    if (!TaskConfiguration.hasText(command) && args.isEmpty()) {
      throw new IllegalArgumentException("SHELL 任务必须配置 command 或非空 args");
    }
    if (!args.isEmpty() && args.stream().anyMatch(value -> !TaskConfiguration.hasText(value))) {
      throw new IllegalArgumentException("SHELL 任务 args 不能包含空参数");
    }
    TaskConfiguration.stringMap(configuration, "environment");
  }

  @Override
  public WorkflowTaskResult execute(WorkflowTaskContext context) throws Exception {
    Map<String, Object> configuration = TaskParameterResolver.resolveConfiguration(
        context.configuration(),
        context.parameters());
    validate(configuration);

    List<String> command = resolveCommand(configuration);
    ProcessBuilder builder = new ProcessBuilder(command).redirectErrorStream(true);
    configureWorkDirectory(builder, configuration);
    builder.environment().putAll(TaskConfiguration.stringMap(configuration, "environment"));

    context.logger().log("Starting command: " + String.join(" ", command));
    Process process = builder.start();
    runningProcesses.put(context.attemptId(), process);
    Thread outputReader = Thread.ofVirtual()
        .name("yak-task-shell-log-" + context.attemptId())
        .start(() -> readOutput(process, context));

    try {
      while (!process.waitFor(200, TimeUnit.MILLISECONDS)) {
        if (context.cancellationToken().isCancellationRequested()) {
          terminate(process);
          context.cancellationToken().throwIfCancellationRequested();
        }
      }
      outputReader.join(2_000L);

      int exitCode = process.exitValue();
      context.logger().log("Command exited with code " + exitCode);
      if (exitCode != 0) {
        return WorkflowTaskResult.failure("Shell 命令退出码为 " + exitCode);
      }
      return WorkflowTaskResult.succeeded(
          Long.toString(process.pid()),
          Map.of("processId", process.pid(), "exitCode", exitCode),
          "Shell 命令执行完成");
    } catch (InterruptedException interrupted) {
      Thread.currentThread().interrupt();
      terminate(process);
      throw interrupted;
    } finally {
      runningProcesses.remove(context.attemptId());
    }
  }

  @Override
  public void cancel(WorkflowTaskContext context) {
    Process process = runningProcesses.get(context.attemptId());
    if (process != null) {
      terminate(process);
    }
  }

  private static List<String> resolveCommand(Map<String, Object> configuration) {
    List<String> args = TaskConfiguration.stringList(configuration, "args");
    if (!args.isEmpty()) {
      return new ArrayList<>(args);
    }

    String command = TaskConfiguration.requiredString(configuration, "command");
    boolean windows = System.getProperty("os.name", "")
        .toLowerCase(Locale.ROOT)
        .contains("win");
    return windows
        ? List.of("cmd.exe", "/c", command)
        : List.of("/bin/sh", "-c", command);
  }

  private static void configureWorkDirectory(
      ProcessBuilder builder,
      Map<String, Object> configuration) {
    String workDirectory = TaskConfiguration.string(configuration, "workDirectory", null);
    if (!TaskConfiguration.hasText(workDirectory)) {
      return;
    }

    File directory = new File(workDirectory);
    if (!directory.isDirectory()) {
      throw new IllegalArgumentException("Shell 工作目录不存在或不是目录：" + workDirectory);
    }
    builder.directory(directory);
  }

  private static void readOutput(Process process, WorkflowTaskContext context) {
    try (BufferedReader reader = new BufferedReader(
        new InputStreamReader(process.getInputStream(), StandardCharsets.UTF_8))) {
      String line;
      while ((line = reader.readLine()) != null) {
        context.logger().log(line);
      }
    } catch (Exception error) {
      context.logger().log("读取 Shell 输出失败：" + error.getMessage());
    }
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
      process.toHandle().descendants().forEach(ProcessHandle::destroyForcibly);
      process.destroyForcibly();
    }
  }
}

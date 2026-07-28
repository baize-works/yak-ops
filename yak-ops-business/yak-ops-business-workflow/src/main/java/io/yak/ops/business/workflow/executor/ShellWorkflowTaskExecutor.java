package io.yak.ops.business.workflow.executor;

import io.yak.ops.business.workflow.config.ConditionalOnWorkflowEnabled;
import io.yak.ops.spi.workflow.WorkflowTaskContext;
import io.yak.ops.spi.workflow.WorkflowTaskExecutor;
import io.yak.ops.spi.workflow.WorkflowTaskResult;
import java.io.BufferedReader;
import java.io.File;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;
import org.springframework.stereotype.Component;

/** Executes an administrator-provided local shell command in the Yak Ops process host. */
@ConditionalOnWorkflowEnabled
@Component
public final class ShellWorkflowTaskExecutor implements WorkflowTaskExecutor {

  private final Map<Long, Process> runningProcesses = new ConcurrentHashMap<>();

  @Override
  public String type() {
    return "SHELL";
  }

  @Override
  public void validate(Map<String, Object> configuration) {
    Object command = configuration == null ? null : configuration.get("command");
    Object args = configuration == null ? null : configuration.get("args");
    if ((command == null || String.valueOf(command).isBlank()) && !(args instanceof List<?> list && !list.isEmpty())) {
      throw new IllegalArgumentException("SHELL task requires a non-blank command or args list");
    }
  }

  @Override
  public WorkflowTaskResult execute(WorkflowTaskContext context) throws Exception {
    List<String> command = resolveCommand(context.configuration());
    ProcessBuilder builder = new ProcessBuilder(command).redirectErrorStream(true);
    Object workDirectory = context.configuration().get("workDirectory");
    if (workDirectory != null && !String.valueOf(workDirectory).isBlank()) {
      builder.directory(new File(String.valueOf(workDirectory)));
    }
    Object environment = context.configuration().get("environment");
    if (environment instanceof Map<?, ?> values) {
      values.forEach((key, value) -> builder.environment().put(String.valueOf(key), String.valueOf(value)));
    }

    context.logger().log("Starting command: " + String.join(" ", command));
    Process process = builder.start();
    runningProcesses.put(context.attemptId(), process);
    Thread outputReader = Thread.ofVirtual().name("yak-workflow-shell-log-" + context.attemptId()).start(() -> {
      try (BufferedReader reader = new BufferedReader(
          new InputStreamReader(process.getInputStream(), StandardCharsets.UTF_8))) {
        String line;
        while ((line = reader.readLine()) != null) {
          context.logger().log(line);
        }
      } catch (Exception error) {
        context.logger().log("Failed to read process output: " + error.getMessage());
      }
    });

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
        return WorkflowTaskResult.failure("Shell command exited with code " + exitCode);
      }
      return WorkflowTaskResult.succeeded(
          Long.toString(process.pid()),
          Map.of("exitCode", exitCode),
          "Shell command completed");
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
    Object args = configuration.get("args");
    if (args instanceof List<?> values && !values.isEmpty()) {
      List<String> command = new ArrayList<>(values.size());
      values.forEach(value -> command.add(String.valueOf(value)));
      return command;
    }
    String command = String.valueOf(configuration.get("command"));
    boolean windows = System.getProperty("os.name", "").toLowerCase().contains("win");
    return windows ? List.of("cmd.exe", "/c", command) : List.of("/bin/sh", "-c", command);
  }

  private static void terminate(Process process) {
    process.destroy();
    try {
      if (!process.waitFor(2, TimeUnit.SECONDS)) {
        process.destroyForcibly();
      }
    } catch (InterruptedException interrupted) {
      Thread.currentThread().interrupt();
      process.destroyForcibly();
    }
  }
}

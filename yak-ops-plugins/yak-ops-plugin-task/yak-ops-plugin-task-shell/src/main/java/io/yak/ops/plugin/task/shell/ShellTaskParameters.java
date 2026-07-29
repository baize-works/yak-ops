package io.yak.ops.plugin.task.shell;

import io.yak.ops.plugin.task.api.AbstractTaskParameters;
import io.yak.ops.plugin.task.api.TaskConfiguration;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Typed parameters persisted for a Shell workflow task. */
public final class ShellTaskParameters extends AbstractTaskParameters {

  private final String command;
  private final List<String> args;
  private final String workDirectory;
  private final Map<String, String> environment;

  private ShellTaskParameters(Map<String, Object> configuration) {
    super(configuration);
    this.command = TaskConfiguration.string(configuration, "command", "");
    this.args = List.copyOf(TaskConfiguration.stringList(configuration, "args"));
    this.workDirectory = TaskConfiguration.string(configuration, "workDirectory", "");
    this.environment = new LinkedHashMap<>(
        TaskConfiguration.stringMap(configuration, "environment"));
  }

  public static ShellTaskParameters from(Map<String, Object> configuration) {
    return new ShellTaskParameters(configuration);
  }

  @Override
  public void validate() {
    validateCommonParameters();
    if (!TaskConfiguration.hasText(command) && args.isEmpty()) {
      throw new IllegalArgumentException("SHELL 任务必须配置 command 或非空 args");
    }
    if (args.stream().anyMatch(value -> !TaskConfiguration.hasText(value))) {
      throw new IllegalArgumentException("SHELL 任务 args 不能包含空参数");
    }
  }

  @Override
  public Map<String, Object> toConfiguration() {
    Map<String, Object> configuration = newConfiguration();
    configuration.put("command", command);
    configuration.put("args", new ArrayList<>(args));
    configuration.put("workDirectory", workDirectory);
    configuration.put("environment", new LinkedHashMap<>(environment));
    return configuration;
  }

  public String getCommand() {
    return command;
  }

  public List<String> getArgs() {
    return args;
  }

  public String getWorkDirectory() {
    return workDirectory;
  }

  public Map<String, String> getEnvironment() {
    return Map.copyOf(environment);
  }
}

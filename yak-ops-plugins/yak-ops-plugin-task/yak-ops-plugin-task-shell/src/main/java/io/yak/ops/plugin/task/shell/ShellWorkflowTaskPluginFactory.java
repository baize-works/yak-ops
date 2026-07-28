package io.yak.ops.plugin.task.shell;

import io.yak.ops.plugin.task.api.TaskPluginType;
import io.yak.ops.spi.workflow.WorkflowTaskExecutor;
import io.yak.ops.spi.workflow.WorkflowTaskPluginDescriptor;
import io.yak.ops.spi.workflow.WorkflowTaskPluginFactory;
import java.util.LinkedHashMap;
import java.util.Map;

/** Factory and discoverable metadata for the Shell workflow task plugin. */
public final class ShellWorkflowTaskPluginFactory implements WorkflowTaskPluginFactory {

  private static final WorkflowTaskPluginDescriptor DESCRIPTOR =
      new WorkflowTaskPluginDescriptor(
          TaskPluginType.SHELL,
          "Shell 命令",
          "在 Yak Ops 运行主机执行受信任的 Shell 命令，并实时采集进程日志。",
          "SYSTEM",
          "1.0.0",
          true,
          true,
          configurationSchema());

  @Override
  public WorkflowTaskPluginDescriptor descriptor() {
    return DESCRIPTOR;
  }

  @Override
  public WorkflowTaskExecutor create() {
    return new ShellWorkflowTaskExecutor();
  }

  private static Map<String, Object> configurationSchema() {
    Map<String, Object> fields = new LinkedHashMap<>();
    fields.put("command", field("string", false, "Shell 命令，支持 ${parameter} 参数。", ""));
    fields.put("args", field("string-list", false, "完整进程参数数组，配置后优先于 command。", java.util.List.of()));
    fields.put("workDirectory", field("string", false, "进程工作目录。", ""));
    fields.put("environment", field("map", false, "进程环境变量。", Map.of()));
    return Map.of("fields", fields);
  }

  private static Map<String, Object> field(
      String type,
      boolean required,
      String description,
      Object defaultValue) {
    Map<String, Object> field = new LinkedHashMap<>();
    field.put("type", type);
    field.put("required", required);
    field.put("description", description);
    field.put("defaultValue", defaultValue);
    return field;
  }
}

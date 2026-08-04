package io.yak.ops.plugin.task.api;

/** 内置任务插件类型。 */
public final class TaskPluginType {

  public static final String HTTP = "HTTP";
  public static final String SHELL = "SHELL";
  public static final String SQL = "SQL";
  public static final String FLINK_SQL = "FLINK_SQL";
  public static final String PYTHON = "PYTHON";
  public static final String NOTEBOOK = "NOTEBOOK";

  private TaskPluginType() {
  }
}

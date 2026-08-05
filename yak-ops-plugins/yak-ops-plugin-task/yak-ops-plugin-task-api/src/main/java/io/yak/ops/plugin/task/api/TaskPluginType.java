package io.yak.ops.plugin.task.api;

/** Phase-one built-in task plugin types. */
public final class TaskPluginType {

  public static final String MYSQL = "MYSQL";
  public static final String HTTP = "HTTP";

  /** Legacy task type kept as a lookup alias for data created before the MySQL plugin split. */
  @Deprecated
  public static final String SQL = "SQL";

  private TaskPluginType() {
  }
}

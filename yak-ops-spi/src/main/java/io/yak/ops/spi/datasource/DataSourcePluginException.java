package io.yak.ops.spi.datasource;

/** 数据源插件参数、连接或元数据访问异常。 */
public class DataSourcePluginException extends RuntimeException {

  private static final long serialVersionUID = 1L;

  private final Operation operation;

  public DataSourcePluginException(Operation operation, String message) {
    super(message);
    this.operation = operation;
  }

  public DataSourcePluginException(Operation operation, String message, Throwable cause) {
    super(message, cause);
    this.operation = operation;
  }

  public Operation getOperation() {
    return operation;
  }

  /** 插件失败发生的阶段。 */
  public enum Operation {
    PARAMETER,
    CONNECTIVITY,
    CATALOG
  }
}

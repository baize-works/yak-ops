package io.yak.ops.spi.storage;

/** 存储插件统一异常。 */
public class StoragePluginException extends RuntimeException {

  private static final long serialVersionUID = 1L;

  public StoragePluginException(String message) {
    super(message);
  }

  public StoragePluginException(String message, Throwable cause) {
    super(message, cause);
  }
}

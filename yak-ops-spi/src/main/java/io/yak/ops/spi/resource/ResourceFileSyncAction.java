package io.yak.ops.spi.resource;

/** 资源文件同步事件类型。 */
public enum ResourceFileSyncAction {
  CREATED,
  UPDATED,
  MOVED,
  DELETED
}

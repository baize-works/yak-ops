package io.yak.ops.spi.resource;

import io.yak.ops.common.enums.resource.ResourceNodeType;
import io.yak.ops.common.enums.resource.ResourceStorageType;
import lombok.Builder;
import lombok.Value;

/** 资源文件同步上下文，后续 Git/DataOps 插件可直接消费。 */
@Value
@Builder
public class ResourceFileSyncContext {

  Long resourceId;
  ResourceFileSyncAction action;
  ResourceNodeType nodeType;
  ResourceStorageType storageType;
  String oldFullPath;
  String fullPath;
  String storagePath;
  Integer version;
}

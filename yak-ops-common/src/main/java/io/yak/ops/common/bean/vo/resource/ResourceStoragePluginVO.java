package io.yak.ops.common.bean.vo.resource;

import io.yak.ops.common.enums.resource.ResourceStorageType;
import lombok.Builder;
import lombok.Data;

/** 已安装资源存储插件信息。 */
@Data
@Builder
public class ResourceStoragePluginVO {

  private ResourceStorageType type;
  private String name;
  private boolean active;
}

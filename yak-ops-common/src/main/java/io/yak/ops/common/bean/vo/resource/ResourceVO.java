package io.yak.ops.common.bean.vo.resource;

import io.yak.ops.common.enums.resource.ResourceNodeType;
import io.yak.ops.common.enums.resource.ResourceStorageType;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import lombok.Builder;
import lombok.Data;

/** 资源目录或文件视图。 */
@Data
@Builder
public class ResourceVO {

  private Long id;
  private Long parentId;
  private String name;
  private String fullPath;
  private ResourceNodeType nodeType;
  private ResourceStorageType storageType;
  private String contentType;
  private String suffix;
  private Long fileSize;
  private String checksum;
  private String description;
  private Integer version;
  private String gitSyncStatus;
  private LocalDateTime createTime;
  private LocalDateTime updateTime;

  @Builder.Default
  private List<ResourceVO> children = new ArrayList<>();
}

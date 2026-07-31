package io.yak.ops.common.bean.po.resource;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import io.yak.ops.common.enums.resource.ResourceNodeType;
import io.yak.ops.common.enums.resource.ResourceStorageType;
import java.time.LocalDateTime;
import lombok.Data;

/** 资源目录与文件持久化对象。 */
@Data
@TableName("yak_ops_resource")
public class ResourcePO {

  @TableId(type = IdType.ASSIGN_ID)
  private Long id;
  private Long parentId;
  private String name;
  private String fullPath;
  private ResourceNodeType nodeType;
  private ResourceStorageType storageType;
  private String storagePath;
  private String contentType;
  private String suffix;
  private Long fileSize;
  private String checksum;
  private String description;
  private Integer version;
  private String gitSyncStatus;
  private LocalDateTime createTime;
  private LocalDateTime updateTime;
}

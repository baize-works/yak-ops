package io.yak.ops.common.bean.dto.resource;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

/** 创建资源目录请求。 */
@Data
public class ResourceCreateDirectoryDTO {

  /** 父目录 ID，根目录使用 0。 */
  private Long parentId = 0L;

  @NotBlank(message = "目录名称不能为空")
  @Size(max = 255, message = "目录名称不能超过 255 个字符")
  private String name;

  @Size(max = 512, message = "目录描述不能超过 512 个字符")
  private String description;
}

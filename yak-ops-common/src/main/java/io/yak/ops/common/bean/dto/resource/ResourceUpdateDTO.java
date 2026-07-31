package io.yak.ops.common.bean.dto.resource;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

/** 更新资源名称与描述请求。 */
@Data
public class ResourceUpdateDTO {

  @NotBlank(message = "资源名称不能为空")
  @Size(max = 255, message = "资源名称不能超过 255 个字符")
  private String name;

  @Size(max = 512, message = "资源描述不能超过 512 个字符")
  private String description;
}

package io.yak.ops.common.bean.dto.resource;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

/** 移动资源请求。 */
@Data
public class ResourceMoveDTO {

  @NotNull(message = "目标目录 ID 不能为空")
  private Long targetParentId;
}

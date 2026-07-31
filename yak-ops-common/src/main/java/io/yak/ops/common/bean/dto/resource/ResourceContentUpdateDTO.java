package io.yak.ops.common.bean.dto.resource;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

/** 更新资源文本内容请求。 */
@Data
public class ResourceContentUpdateDTO {

  @NotNull(message = "文件内容不能为空")
  private String content;
}
